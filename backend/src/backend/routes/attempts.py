from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ..extensions import db

attempts_bp = Blueprint("attempts", __name__, url_prefix="/attempts")


def utc_now():
    return datetime.now(timezone.utc)


def as_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def student_attempt(attempt_id, student_id):
    return db.attempts.find_one({"id": attempt_id, "student_id": student_id})


def student_only():
    return get_jwt().get("role") == "student"


def grade_answer(question, answer):
    correct_answers = question.get("correct_answers", [])

    if question["type"] == "multi_select":
        return (
            isinstance(answer, list)
            and len(answer) == len(set(answer))
            and set(answer) == set(correct_answers)
        )

    return (
        isinstance(answer, str)
        and answer in question.get("options", [])
        and answer in correct_answers
    )


@attempts_bp.get("/<attempt_id>/questions")
@jwt_required()
def get_attempt_questions(attempt_id):
    if not student_only():
        return jsonify({"error": "Only students can access quiz attempts."}), 403

    student_id = get_jwt_identity()
    attempt = student_attempt(attempt_id, student_id)

    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    if attempt.get("status") != "in_progress":
        return jsonify({"error": "This attempt is no longer in progress."}), 409

    now = utc_now()
    deadline = as_utc(attempt["deadline"])

    if now >= deadline:
        db.attempts.update_one(
            {"id": attempt_id, "status": "in_progress"},
            {"$set": {"status": "expired", "submitted_at": now, "updated_at": now}},
        )
        return jsonify({"error": "The quiz deadline has passed."}), 409

    questions = list(
        db.questions.find(
            {"quiz_id": attempt["quiz_id"]},
            {"_id": 0, "id": 1, "question": 1, "type": 1, "options": 1, "order": 1},
        ).sort("order", 1)
    )

    return (
        jsonify(
            {
                "attempt_id": attempt_id,
                "deadline": deadline.isoformat(),
                "total_questions": len(questions),
                "questions": questions,
            }
        ),
        200,
    )


@attempts_bp.post("/<attempt_id>/submit")
@jwt_required()
def submit_attempt(attempt_id):
    if not student_only():
        return jsonify({"error": "Only students can submit quiz attempts."}), 403

    student_id = get_jwt_identity()
    attempt = student_attempt(attempt_id, student_id)

    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    if attempt.get("status") != "in_progress":
        return jsonify({"error": "This attempt has already ended."}), 409

    now = utc_now()
    deadline = as_utc(attempt["deadline"])

    if now >= deadline:
        db.attempts.update_one(
            {"id": attempt_id, "status": "in_progress"},
            {"$set": {"status": "expired", "submitted_at": now, "updated_at": now}},
        )
        return (
            jsonify({"error": "The quiz deadline has passed. The attempt is expired."}),
            409,
        )

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required."}), 400

    submitted_answers = data.get("answers")

    if not isinstance(submitted_answers, list):
        return jsonify({"error": "answers must be a list."}), 400

    # Expected item format: {"question_id": "...", "answer": "..."}
    # For multi_select, answer must be a list of option strings.
    answer_map = {}

    for item in submitted_answers:
        if not isinstance(item, dict):
            return jsonify({"error": "Each answer must be a JSON object."}), 400

        question_id = item.get("question_id")
        answer = item.get("answer")

        if not isinstance(question_id, str) or not question_id:
            return jsonify({"error": "Every answer needs a question_id."}), 400

        if question_id in answer_map:
            return (
                jsonify({"error": "Duplicate question answers are not allowed."}),
                400,
            )

        answer_map[question_id] = answer

    questions = list(db.questions.find({"quiz_id": attempt["quiz_id"]}))
    question_by_id = {question["id"]: question for question in questions}

    if not questions:
        return jsonify({"error": "This quiz has no questions."}), 400

    if any(question_id not in question_by_id for question_id in answer_map):
        return (
            jsonify({"error": "One or more question IDs do not belong to this quiz."}),
            400,
        )

    score = 0
    graded_answers = []

    for question in sorted(questions, key=lambda q: q.get("order", 0)):
        question_id = question["id"]
        answer = answer_map.get(question_id)
        is_correct = grade_answer(question, answer)

        if is_correct:
            score += 1

        graded_answers.append(
            {"question_id": question_id, "answer": answer, "is_correct": is_correct}
        )

    total_questions = len(questions)
    percentage = round((score / total_questions) * 100, 2)

    # Conditional update prevents a second submission from overwriting a result.
    update_result = db.attempts.update_one(
        {"id": attempt_id, "student_id": student_id, "status": "in_progress"},
        {
            "$set": {
                "status": "submitted",
                "answers": graded_answers,
                "score": score,
                "total_questions": total_questions,
                "percentage": percentage,
                "submitted_at": now,
                "updated_at": now,
            }
        },
    )

    if update_result.modified_count != 1:
        return (
            jsonify(
                {"error": "This attempt has already ended. Please retrieve its result."}
            ),
            409,
        )

    return (
        jsonify(
            {
                "message": "Quiz submitted and graded successfully.",
                "attempt_id": attempt_id,
                "status": "submitted",
                "score": score,
                "total_questions": total_questions,
                "percentage": percentage,
            }
        ),
        200,
    )


@attempts_bp.get("/<attempt_id>/result")
@jwt_required()
def get_attempt_result(attempt_id):
    if not student_only():
        return jsonify({"error": "Only students can view this result."}), 403

    student_id = get_jwt_identity()
    attempt = student_attempt(attempt_id, student_id)

    if not attempt:
        return jsonify({"error": "Attempt not found."}), 404

    if attempt.get("status") == "in_progress":
        deadline = as_utc(attempt["deadline"])

        if utc_now() >= deadline:
            now = utc_now()
            db.attempts.update_one(
                {"id": attempt_id, "status": "in_progress"},
                {"$set": {"status": "expired", "submitted_at": now, "updated_at": now}},
            )
            return (
                jsonify(
                    {
                        "attempt_id": attempt_id,
                        "status": "expired",
                        "message": "The deadline passed before submission.",
                    }
                ),
                200,
            )

        return jsonify({"error": "Submit the quiz before viewing its result."}), 409

    if attempt.get("status") == "expired":
        return (
            jsonify(
                {
                    "attempt_id": attempt_id,
                    "status": "expired",
                    "score": attempt.get("score"),
                    "total_questions": attempt.get("total_questions"),
                }
            ),
            200,
        )

    return (
        jsonify(
            {
                "attempt_id": attempt_id,
                "quiz_id": attempt["quiz_id"],
                "status": attempt["status"],
                "score": attempt.get("score"),
                "total_questions": attempt.get("total_questions"),
                "percentage": attempt.get("percentage"),
                "answers": attempt.get("answers", []),
                "started_at": as_utc(attempt["started_at"]).isoformat(),
                "deadline": as_utc(attempt["deadline"]).isoformat(),
                "submitted_at": (
                    as_utc(attempt["submitted_at"]).isoformat()
                    if attempt.get("submitted_at")
                    else None
                ),
            }
        ),
        200,
    )


@attempts_bp.get("/history")
@jwt_required()
def get_student_quiz_history():
    student_id = get_jwt_identity()

    attempts = list(
        db.attempts.find(
            {"student_id": student_id},
            {"_id": 0},
        ).sort("started_at", -1)
    )

    history = []

    for attempt in attempts:
        quiz = db.quizzes.find_one(
            {"id": attempt.get("quiz_id")},
            {"_id": 0, "title": 1, "course_id": 1},
        )

        history.append(
            {
                "attempt_id": attempt.get("id"),
                "quiz_id": attempt.get("quiz_id"),
                "quiz_title": quiz.get("title", "Quiz") if quiz else "Quiz unavailable",
                "course_id": quiz.get("course_id") if quiz else None,
                "status": attempt.get("status", "unknown"),
                "score": attempt.get("score"),
                "total_questions": attempt.get("total_questions"),
                "percentage": attempt.get("percentage"),
                "started_at": attempt.get("started_at"),
                "submitted_at": attempt.get("submitted_at"),
                "deadline": attempt.get("deadline"),
            }
        )

    return jsonify({"attempts": history}), 200
