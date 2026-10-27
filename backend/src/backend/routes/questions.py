from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pymongo.errors import DuplicateKeyError

from ..extensions import db
from ..repositories.question_repository import create_question
from ..utils.authorization import approved_instructor_required

questions_bp = Blueprint("questions", __name__, url_prefix="/quizzes")


@questions_bp.post("/<quiz_id>/questions")
@jwt_required()
@approved_instructor_required()
def add_question(quiz_id):
    instructor_id = get_jwt_identity()

    quiz = db.quizzes.find_one({"id": quiz_id, "instructor_id": instructor_id})

    if not quiz:
        return jsonify({"error": "Quiz not found or you do not own this quiz."}), 404

    if quiz.get("status") != "draft":
        return jsonify({"error": "Questions can only be added to draft quizzes."}), 400

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required."}), 400

    question_text = data.get("question")
    question_type = data.get("type")
    options = data.get("options")
    correct_answers = data.get("correct_answers")
    order = data.get("order")

    if not isinstance(question_text, str) or not question_text.strip():
        return jsonify({"error": "Question text is required."}), 400

    if question_type not in ["mcq", "multi_select", "true_false"]:
        return jsonify({"error": "type must be mcq, multi_select, or true_false."}), 400

    if not isinstance(order, int) or isinstance(order, bool) or order <= 0:
        return jsonify({"error": "order must be a positive integer."}), 400

    if not isinstance(options, list) or not options:
        return jsonify({"error": "Options must be a non-empty list."}), 400

    if not all(isinstance(option, str) and option.strip() for option in options):
        return jsonify({"error": "Every option must be a non-empty string."}), 400

    if len(set(options)) != len(options):
        return jsonify({"error": "Options must not contain duplicates."}), 400

    if question_type == "true_false":
        if set(options) != {"True", "False"} or len(options) != 2:
            return (
                jsonify(
                    {
                        "error": "true_false questions must have exactly True and False options."
                    }
                ),
                400,
            )

    if question_type in ["mcq", "multi_select"] and len(options) < 2:
        return jsonify({"error": "At least two options are required."}), 400

    if not isinstance(correct_answers, list) or not correct_answers:
        return jsonify({"error": "correct_answers must be a non-empty list."}), 400

    if not all(answer in options for answer in correct_answers):
        return jsonify({"error": "Every correct answer must match an option."}), 400

    if len(set(correct_answers)) != len(correct_answers):
        return jsonify({"error": "Correct answers must not contain duplicates."}), 400

    if question_type == "mcq" and len(correct_answers) != 1:
        return (
            jsonify({"error": "MCQ questions must have exactly one correct answer."}),
            400,
        )

    if question_type == "true_false" and len(correct_answers) != 1:
        return (
            jsonify(
                {"error": "True/False questions must have exactly one correct answer."}
            ),
            400,
        )

    if question_type == "multi_select" and len(correct_answers) < 2:
        return (
            jsonify(
                {
                    "error": "Multi-select questions must have at least two correct answers."
                }
            ),
            400,
        )

    existing_question = db.questions.find_one({"quiz_id": quiz_id, "order": order})

    if existing_question:
        return (
            jsonify(
                {"error": "A question with this order already exists in the quiz."}
            ),
            409,
        )

    now = datetime.now(timezone.utc)

    question_data = {
        "quiz_id": quiz_id,
        "question": question_text.strip(),
        "type": question_type,
        "options": [option.strip() for option in options],
        "correct_answers": correct_answers,
        "order": order,
        "created_at": now,
        "updated_at": now,
    }

    try:
        create_question(question_data)
    except DuplicateKeyError:
        return (
            jsonify(
                {"error": "A question with this order already exists in the quiz."}
            ),
            409,
        )

    return (
        jsonify(
            {
                "message": "Question created successfully.",
                "question": {
                    "id": question_data["id"],
                    "quiz_id": quiz_id,
                    "question": question_data["question"],
                    "type": question_type,
                    "options": question_data["options"],
                    "order": order,
                },
            }
        ),
        201,
    )


@questions_bp.get("/<quiz_id>/questions")
@jwt_required()
@approved_instructor_required()
def list_quiz_questions(quiz_id):
    instructor_id = get_jwt_identity()

    quiz = db.quizzes.find_one({"id": quiz_id, "instructor_id": instructor_id})

    if not quiz:
        return jsonify({"error": "Quiz not found or you do not own this quiz."}), 404

    questions = list(
        db.questions.find(
            {"quiz_id": quiz_id},
            {
                "_id": 0,
                "id": 1,
                "quiz_id": 1,
                "question": 1,
                "type": 1,
                "options": 1,
                "order": 1,
            },
        ).sort("order", 1)
    )

    return (
        jsonify(
            {
                "quiz_id": quiz_id,
                "total_questions": len(questions),
                "questions": questions,
            }
        ),
        200,
    )


@questions_bp.patch("/<quiz_id>/questions/<question_id>")
@jwt_required()
@approved_instructor_required()
def update_question(quiz_id, question_id):
    instructor_id = get_jwt_identity()

    quiz = db.quizzes.find_one({"id": quiz_id, "instructor_id": instructor_id})

    if not quiz:
        return jsonify({"error": "Quiz not found or you do not own this quiz."}), 404

    if quiz.get("status") != "draft":
        return jsonify({"error": "Only draft quizzes can be edited."}), 400

    question = db.questions.find_one({"id": question_id, "quiz_id": quiz_id})

    if not question:
        return jsonify({"error": "Question not found."}), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({"error": "A non-empty JSON object is required."}), 400

    allowed_fields = {"question", "type", "options", "correct_answers", "order"}

    if not set(data).issubset(allowed_fields):
        return jsonify({"error": "One or more fields are not allowed."}), 400

    updated = {
        "question": data.get("question", question["question"]),
        "type": data.get("type", question["type"]),
        "options": data.get("options", question["options"]),
        "correct_answers": data.get("correct_answers", question["correct_answers"]),
        "order": data.get("order", question["order"]),
    }

    text = updated["question"]
    q_type = updated["type"]
    options = updated["options"]
    answers = updated["correct_answers"]
    order = updated["order"]

    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Question text is required."}), 400

    if q_type not in ["mcq", "multi_select", "true_false"]:
        return jsonify({"error": "Invalid question type."}), 400

    if not isinstance(order, int) or isinstance(order, bool) or order <= 0:
        return jsonify({"error": "order must be a positive integer."}), 400

    if not isinstance(options, list) or not all(
        isinstance(option, str) and option.strip() for option in options
    ):
        return jsonify({"error": "Options must be a list of non-empty strings."}), 400

    options = [option.strip() for option in options]

    if len(options) < 2 or len(set(options)) != len(options):
        return jsonify({"error": "Provide at least two unique options."}), 400

    if q_type == "true_false" and set(options) != {"True", "False"}:
        return (
            jsonify(
                {
                    "error": "True/False questions require exactly True and False options."
                }
            ),
            400,
        )

    if not isinstance(answers, list) or not answers:
        return jsonify({"error": "correct_answers must be a non-empty list."}), 400

    if len(set(answers)) != len(answers) or not all(
        isinstance(answer, str) and answer in options for answer in answers
    ):
        return (
            jsonify({"error": "Correct answers must be unique values from options."}),
            400,
        )

    if q_type in ["mcq", "true_false"] and len(answers) != 1:
        return (
            jsonify(
                {"error": "This question type requires exactly one correct answer."}
            ),
            400,
        )

    if q_type == "multi_select" and len(answers) < 2:
        return (
            jsonify({"error": "Multi-select requires at least two correct answers."}),
            400,
        )

    duplicate_order = db.questions.find_one(
        {"quiz_id": quiz_id, "order": order, "id": {"$ne": question_id}}
    )

    if duplicate_order:
        return jsonify({"error": "Another question already uses this order."}), 409

    from datetime import datetime, timezone

    db.questions.update_one(
        {"id": question_id, "quiz_id": quiz_id},
        {
            "$set": {
                "question": text.strip(),
                "type": q_type,
                "options": options,
                "correct_answers": answers,
                "order": order,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return (
        jsonify(
            {
                "message": "Question updated successfully.",
                "question": {
                    "id": question_id,
                    "quiz_id": quiz_id,
                    "question": text.strip(),
                    "type": q_type,
                    "options": options,
                    "order": order,
                },
            }
        ),
        200,
    )
