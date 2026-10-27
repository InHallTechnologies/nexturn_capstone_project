from datetime import datetime, timedelta, timezone
from uuid import uuid4

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt

from ..extensions import db
from ..repositories.quiz_repository import create_quiz
from ..utils.authorization import approved_instructor_required

quizzes_bp = Blueprint("quizzes", __name__, url_prefix="/courses")


@quizzes_bp.post("/<course_id>/quizzes")
@jwt_required()
@approved_instructor_required()
def create_course_quiz(course_id):
    instructor_id = get_jwt_identity()

    course = db.courses.find_one({"id": course_id, "instructor_id": instructor_id})

    if not course:
        return (
            jsonify({"error": "Course not found or you do not own this course."}),
            404,
        )

    if course.get("status") not in ["draft", "published"]:
        return (
            jsonify(
                {"error": "Quizzes can only be created for draft or published courses."}
            ),
            400,
        )

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required."}), 400

    title = data.get("title")
    description = data.get("description", "")
    time_limit_minutes = data.get("time_limit_minutes", 10)
    max_attempts = data.get("max_attempts", 1)
    lesson_id = data.get("lesson_id")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Quiz title is required."}), 400

    if not isinstance(description, str):
        return jsonify({"error": "Description must be a string."}), 400

    if type(time_limit_minutes) is not int or time_limit_minutes <= 0:
        return jsonify({"error": "time_limit_minutes must be a positive integer."}), 400

    if type(max_attempts) is not int or max_attempts <= 0:
        return jsonify({"error": "max_attempts must be a positive integer."}), 400

    if lesson_id is not None:
        lesson = db.lessons.find_one({"id": lesson_id})

        if not lesson:
            return jsonify({"error": "Lesson not found."}), 404

        module = db.modules.find_one(
            {"id": lesson.get("module_id"), "course_id": course_id}
        )

        if not module:
            return jsonify({"error": "The lesson does not belong to this course."}), 400

    now = datetime.now(timezone.utc)

    quiz_data = {
        "course_id": course_id,
        "lesson_id": lesson_id,
        "instructor_id": instructor_id,
        "title": title.strip(),
        "description": description.strip(),
        "time_limit_minutes": time_limit_minutes,
        "max_attempts": max_attempts,
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    quiz_id = create_quiz(quiz_data)

    return (
        jsonify(
            {
                "message": "Quiz created successfully.",
                "quiz": {
                    "id": quiz_data["id"],
                    "course_id": course_id,
                    "lesson_id": lesson_id,
                    "title": quiz_data["title"],
                    "description": quiz_data["description"],
                    "time_limit_minutes": time_limit_minutes,
                    "max_attempts": max_attempts,
                    "status": "draft",
                },
            }
        ),
        201,
    )


@quizzes_bp.patch("/<quiz_id>/publish")
@jwt_required()
@approved_instructor_required()
def publish_quiz(quiz_id):
    from datetime import datetime, timezone

    instructor_id = get_jwt_identity()

    quiz = db.quizzes.find_one({"id": quiz_id, "instructor_id": instructor_id})

    if not quiz:
        return jsonify({"error": "Quiz not found or you do not own this quiz."}), 404

    course = db.courses.find_one(
        {"id": quiz["course_id"], "instructor_id": instructor_id}
    )

    if not course:
        return jsonify({"error": "Associated course not found."}), 404

    if course.get("status") != "published":
        return (
            jsonify({"error": "Publish the course before publishing its quizzes."}),
            400,
        )

    if quiz.get("status") != "draft":
        return jsonify({"error": "Only draft quizzes can be published."}), 400

    question_count = db.questions.count_documents({"quiz_id": quiz_id})

    if question_count == 0:
        return jsonify({"error": "Add at least one question before publishing."}), 400

    now = datetime.now(timezone.utc)

    db.quizzes.update_one(
        {"id": quiz_id, "status": "draft"},
        {"$set": {"status": "published", "published_at": now, "updated_at": now}},
    )

    return (
        jsonify(
            {
                "message": "Quiz published successfully.",
                "quiz": {
                    "id": quiz_id,
                    "title": quiz["title"],
                    "status": "published",
                    "total_questions": question_count,
                },
            }
        ),
        200,
    )


@quizzes_bp.get("/<course_id>/quizzes")
@jwt_required()
def list_published_quizzes(course_id):
    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({"error": "Only students can access this endpoint."}), 403

    student_id = get_jwt_identity()

    enrollment = db.enrollments.find_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": {"$in": ["active", "completed"]},
        }
    )

    if not enrollment:
        return (
            jsonify(
                {"error": "You must be enrolled in this course to view its quizzes."}
            ),
            403,
        )

    course = db.courses.find_one({"id": course_id, "status": "published"})

    if not course:
        return jsonify({"error": "Published course not found."}), 404

    quizzes = list(
        db.quizzes.find(
            {"course_id": course_id, "status": "published"},
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "description": 1,
                "time_limit_minutes": 1,
                "max_attempts": 1,
                "lesson_id": 1,
            },
        ).sort("created_at", 1)
    )

    return (
        jsonify(
            {"course_id": course_id, "total_quizzes": len(quizzes), "quizzes": quizzes}
        ),
        200,
    )


@quizzes_bp.post("/<quiz_id>/attempts")
@jwt_required()
def start_quiz_attempt(quiz_id):
    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({"error": "Only students can start quiz attempts."}), 403

    student_id = get_jwt_identity()

    quiz = db.quizzes.find_one({"id": quiz_id, "status": "published"})

    if not quiz:
        return jsonify({"error": "Published quiz not found."}), 404

    enrollment = db.enrollments.find_one(
        {
            "student_id": student_id,
            "course_id": quiz["course_id"],
            "status": {"$in": ["active", "completed"]},
        }
    )

    if not enrollment:
        return (
            jsonify({"error": "An active or completed course enrollment is required."}),
            403,
        )

    question_count = db.questions.count_documents({"quiz_id": quiz_id})

    if question_count == 0:
        return jsonify({"error": "This quiz has no questions."}), 400

    now = datetime.now(timezone.utc)

    # Resume an existing attempt rather than creating another one.
    existing_attempt = db.attempts.find_one(
        {"student_id": student_id, "quiz_id": quiz_id, "status": "in_progress"}
    )

    if existing_attempt:
        deadline = existing_attempt["deadline"]

        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now >= deadline:
            db.attempts.update_one(
                {"id": existing_attempt["id"]},
                {"$set": {"status": "expired", "submitted_at": now}},
            )
        else:
            return (
                jsonify(
                    {
                        "message": "Resuming existing attempt.",
                        "attempt": {
                            "id": existing_attempt["id"],
                            "quiz_id": quiz_id,
                            "status": "in_progress",
                            "started_at": existing_attempt["started_at"].isoformat(),
                            "deadline": deadline.isoformat(),
                        },
                    }
                ),
                200,
            )

    attempts_used = db.attempts.count_documents(
        {
            "student_id": student_id,
            "quiz_id": quiz_id,
            "status": {"$in": ["submitted", "expired"]},
        }
    )

    max_attempts = quiz.get("max_attempts", 1)

    if attempts_used >= max_attempts:
        return (
            jsonify({"error": "You have reached the maximum number of attempts."}),
            409,
        )

    deadline = now + timedelta(minutes=quiz.get("time_limit_minutes", 10))

    attempt_data = {
        "id": str(uuid4()),
        "student_id": student_id,
        "quiz_id": quiz_id,
        "course_id": quiz["course_id"],
        "status": "in_progress",
        "started_at": now,
        "deadline": deadline,
        "submitted_at": None,
        "answers": [],
        "score": None,
        "total_questions": question_count,
        "created_at": now,
        "updated_at": now,
    }

    db.attempts.insert_one(attempt_data)

    return (
        jsonify(
            {
                "message": "Quiz attempt started successfully.",
                "attempt": {
                    "id": attempt_data["id"],
                    "quiz_id": quiz_id,
                    "status": "in_progress",
                    "started_at": now.isoformat(),
                    "deadline": deadline.isoformat(),
                    "total_questions": question_count,
                },
            }
        ),
        201,
    )


@quizzes_bp.get("/<course_id>/instructor-quizzes")
@jwt_required()
@approved_instructor_required()
def list_instructor_quizzes(course_id):
    instructor_id = get_jwt_identity()

    course = db.courses.find_one(
        {
            "id": course_id,
            "instructor_id": instructor_id,
        }
    )

    if not course:
        return (
            jsonify({"error": "Course not found or you do not own this course."}),
            404,
        )

    quizzes = list(
        db.quizzes.find(
            {
                "course_id": course_id,
                "instructor_id": instructor_id,
            },
            {
                "_id": 0,
                "id": 1,
                "course_id": 1,
                "lesson_id": 1,
                "title": 1,
                "description": 1,
                "time_limit_minutes": 1,
                "max_attempts": 1,
                "status": 1,
                "created_at": 1,
            },
        ).sort("created_at", -1)
    )

    for quiz in quizzes:
        quiz["question_count"] = db.questions.count_documents({"quiz_id": quiz["id"]})

    return (
        jsonify(
            {
                "course_id": course_id,
                "total_quizzes": len(quizzes),
                "quizzes": quizzes,
            }
        ),
        200,
    )
