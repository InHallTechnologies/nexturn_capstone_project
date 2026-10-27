import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..utils.authorization import approved_instructor_required

bulk_upload_bp = Blueprint("bulk_upload", __name__)


def is_nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


def is_positive_int(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def validate_payload(data):
    if not isinstance(data, dict):
        return "Request body must be a JSON object."

    modules = data.get("modules")

    if not isinstance(modules, list) or not modules:
        return "'modules' must be a non-empty array."

    module_orders = set()

    for module in modules:
        if not isinstance(module, dict):
            return "Each module must be a JSON object."

        if not is_nonempty_string(module.get("title")):
            return "Every module requires a title."

        order = module.get("order")

        if not is_positive_int(order):
            return "Every module requires a positive integer order."

        if order in module_orders:
            return "Module orders must be unique within the course."

        module_orders.add(order)

        lessons = module.get("lessons", [])
        quizzes = module.get("quizzes", [])

        if not isinstance(lessons, list) or not isinstance(quizzes, list):
            return "Module lessons and quizzes must be arrays."

        lesson_orders = set()

        for lesson in lessons:
            if not isinstance(lesson, dict):
                return "Each lesson must be a JSON object."

            if not is_nonempty_string(lesson.get("title")):
                return "Every lesson requires a title."

            if not is_nonempty_string(lesson.get("content")):
                return "Every lesson requires content."

            order = lesson.get("order")

            if not is_positive_int(order) or order in lesson_orders:
                return "Lesson orders must be positive and unique within each module."

            lesson_orders.add(order)

        quiz_orders = set()

        for quiz in quizzes:
            if not isinstance(quiz, dict):
                return "Each quiz must be a JSON object."

            if not is_nonempty_string(quiz.get("title")):
                return "Every quiz requires a title."

            if not is_positive_int(quiz.get("time_limit_minutes")):
                return "Quiz time_limit_minutes must be a positive integer."

            if not is_positive_int(quiz.get("max_attempts")):
                return "Quiz max_attempts must be a positive integer."

            if "order" in quiz:
                order = quiz["order"]

                if not is_positive_int(order) or order in quiz_orders:
                    return "Quiz orders must be positive and unique within each module."

                quiz_orders.add(order)

            questions = quiz.get("questions", [])

            if not isinstance(questions, list):
                return "Quiz questions must be an array."

            question_orders = set()

            for question in questions:
                if not isinstance(question, dict):
                    return "Each question must be a JSON object."

                if not is_nonempty_string(question.get("question_text")):
                    return "Every question requires question_text."

                question_type = question.get("question_type")

                if question_type not in ("mcq", "multi_select", "true_false"):
                    return "Question type must be mcq, multi_select, or true_false."

                options = question.get("options")
                answers = question.get("correct_answers")

                if (
                    not isinstance(options, list)
                    or len(options) < 2
                    or any(not is_nonempty_string(option) for option in options)
                    or len(options) != len(set(options))
                ):
                    return "Question options must be unique, non-empty strings."

                if (
                    not isinstance(answers, list)
                    or not answers
                    or any(not isinstance(answer, str) for answer in answers)
                    or len(answers) != len(set(answers))
                    or any(answer not in options for answer in answers)
                ):
                    return "correct_answers must contain unique values from options."

                if question_type == "mcq" and len(answers) != 1:
                    return "MCQ questions must have exactly one correct answer."

                if question_type == "true_false" and (
                    set(options) != {"True", "False"} or len(answers) != 1
                ):
                    return (
                        "True/false questions must use True and False options "
                        "and one correct answer."
                    )

                order = question.get("order")

                if not is_positive_int(order) or order in question_orders:
                    return (
                        "Question orders must be positive and unique within each quiz."
                    )

                question_orders.add(order)

                points = question.get("points", 1)

                if (
                    isinstance(points, bool)
                    or not isinstance(points, (int, float))
                    or points <= 0
                ):
                    return "Question points must be a positive number."

    return None


def read_upload_payload():
    """Read either a multipart JSON file or a raw JSON request."""

    if request.mimetype == "multipart/form-data":
        uploaded_file = request.files.get("file")

        if uploaded_file is None or not uploaded_file.filename:
            return None, (
                jsonify({"error": "Upload a JSON file using the 'file' field."}),
                400,
            )

        if not uploaded_file.filename.lower().endswith(".json"):
            return None, (
                jsonify({"error": "Only .json files are allowed."}),
                400,
            )

        try:
            data = json.loads(uploaded_file.read().decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None, (
                jsonify({"error": "The uploaded file contains invalid JSON."}),
                400,
            )

        return data, None

    if request.is_json:
        data = request.get_json(silent=True)

        if data is None:
            return None, (
                jsonify({"error": "Request body contains invalid JSON."}),
                400,
            )

        return data, None

    return None, (
        jsonify(
            {"error": ("Send raw JSON or multipart form data with a 'file' field.")}
        ),
        415,
    )


@bulk_upload_bp.post("/courses/<course_id>/bulk-upload")
@jwt_required()
@approved_instructor_required()
def bulk_upload_course_content(course_id):
    data, parsing_error = read_upload_payload()

    if parsing_error:
        return parsing_error

    validation_error = validate_payload(data)

    if validation_error:
        return jsonify({"error": validation_error}), 400

    instructor_id = get_jwt_identity()

    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    if course.get("status") not in ("draft", "published"):
        return (
            jsonify(
                {"error": "Content can only be uploaded to draft or published courses."}
            ),
            409,
        )

    now = datetime.now(timezone.utc)

    inserted = {
        "modules": [],
        "lessons": [],
        "quizzes": [],
        "questions": [],
    }

    summary = {
        "modules": 0,
        "lessons": 0,
        "quizzes": 0,
        "questions": 0,
    }

    try:
        for module_data in data["modules"]:
            module_id = str(uuid4())

            module_doc = {
                "id": module_id,
                "course_id": course_id,
                "title": module_data["title"].strip(),
                "description": module_data.get("description", ""),
                "order": module_data["order"],
                "created_at": now,
                "updated_at": now,
            }

            db.modules.insert_one(module_doc)
            inserted["modules"].append(module_id)
            summary["modules"] += 1

            created_lessons_by_order = {}

            for lesson_data in module_data.get("lessons", []):
                lesson_id = str(uuid4())

                lesson_doc = {
                    "id": lesson_id,
                    "module_id": module_id,
                    "title": lesson_data["title"].strip(),
                    "content": lesson_data["content"],
                    "order": lesson_data["order"],
                    "created_at": now,
                    "updated_at": now,
                }

                db.lessons.insert_one(lesson_doc)
                inserted["lessons"].append(lesson_id)
                created_lessons_by_order[lesson_data["order"]] = lesson_id
                summary["lessons"] += 1

            for quiz_data in module_data.get("quizzes", []):
                lesson_id = None
                lesson_order = quiz_data.get("lesson_order")

                if lesson_order is not None:
                    lesson_id = created_lessons_by_order.get(lesson_order)

                    if lesson_id is None:
                        raise ValueError(
                            f"Quiz '{quiz_data['title']}' references a "
                            "lesson_order that does not exist in its module."
                        )

                quiz_id = str(uuid4())

                quiz_doc = {
                    "id": quiz_id,
                    "course_id": course_id,
                    "lesson_id": lesson_id,
                    "instructor_id": instructor_id,
                    "title": quiz_data["title"].strip(),
                    "description": quiz_data.get("description", ""),
                    "time_limit_minutes": quiz_data["time_limit_minutes"],
                    "max_attempts": quiz_data["max_attempts"],
                    "status": "draft",
                    "created_at": now,
                    "updated_at": now,
                }

                db.quizzes.insert_one(quiz_doc)
                inserted["quizzes"].append(quiz_id)
                summary["quizzes"] += 1

                for question_data in quiz_data.get("questions", []):
                    question_id = str(uuid4())

                    question_doc = {
                        "id": question_id,
                        "quiz_id": quiz_id,
                        "question_text": question_data["question_text"].strip(),
                        "question_type": question_data["question_type"],
                        "options": question_data["options"],
                        "correct_answers": question_data["correct_answers"],
                        "order": question_data["order"],
                        "points": question_data.get("points", 1),
                        "created_at": now,
                        "updated_at": now,
                    }

                    db.questions.insert_one(question_doc)
                    inserted["questions"].append(question_id)
                    summary["questions"] += 1

        db.courses.update_one(
            {"id": course_id},
            {"$set": {"updated_at": now}},
        )

    except Exception as exc:
        # Best-effort rollback for ordinary insertion failures.
        for collection_name in ("questions", "quizzes", "lessons", "modules"):
            collection = getattr(db, collection_name)
            ids = inserted[collection_name]

            if ids:
                collection.delete_many({"id": {"$in": ids}})

        if isinstance(exc, ValueError):
            return jsonify({"error": str(exc)}), 400

        logging.exception("Bulk course content upload failed")

        return (
            jsonify(
                {
                    "error": (
                        "Bulk upload failed. Inserted content was rolled back where possible."
                    )
                }
            ),
            500,
        )

    return (
        jsonify(
            {
                "message": "Course content uploaded successfully.",
                "course_id": course_id,
                "created": summary,
                "quiz_status": "draft",
            }
        ),
        201,
    )
