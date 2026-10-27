from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..repositories.lesson_repository import create_lesson
from ..utils.authorization import approved_instructor_required

lessons_bp = Blueprint("lessons", __name__, url_prefix="/modules")


@lessons_bp.post("/<module_id>/lessons")
@jwt_required()
@approved_instructor_required()
def create_new_lesson(module_id):
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    data = request.json

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    title = data.get("title")
    content = data.get("content", "")
    video_url = data.get("video_url", "")
    lesson_order = data.get("order")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Title is required."}), 400

    if len(title.strip()) > 150:
        return jsonify({"error": "Title must not exceed 150 characters."}), 400

    if not isinstance(content, str):
        return jsonify({"error": "Content must be a string."}), 400

    if len(content) > 50000:
        return jsonify({"error": "Content must not exceed 50000 characters."}), 400

    if not isinstance(video_url, str):
        return jsonify({"error": "Video URL must be a string."}), 400

    if len(video_url) > 2048:
        return jsonify({"error": "Video URL must not exceed 2048 characters."}), 400

    if (
        isinstance(lesson_order, bool)
        or not isinstance(lesson_order, int)
        or lesson_order < 1
    ):
        return jsonify({"error": "Order must be a positive integer."}), 400

    module = db.modules.find_one({"id": module_id})

    if not module:
        return jsonify({"error": "Module not found."}), 404

    course = db.courses.find_one({"id": module["course_id"]})

    if not course:
        return jsonify({"error": "Parent course not found."}), 404

    instructor_id = get_jwt_identity()

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    existing_lesson = db.lessons.find_one(
        {"module_id": module_id, "order": lesson_order}
    )

    if existing_lesson:
        return (
            jsonify(
                {"error": "A lesson with this order already exists in the module."}
            ),
            409,
        )

    now = datetime.now(timezone.utc)

    lesson_data = {
        "module_id": module_id,
        "title": title.strip(),
        "content": content.strip(),
        "video_url": video_url.strip(),
        "order": lesson_order,
        "created_at": now,
        "updated_at": now,
    }

    create_lesson(lesson_data)

    return (
        jsonify(
            {
                "message": "Lesson created successfully.",
                "lesson": {
                    "id": lesson_data["id"],
                    "module_id": lesson_data["module_id"],
                    "title": lesson_data["title"],
                    "content": lesson_data["content"],
                    "video_url": lesson_data["video_url"],
                    "order": lesson_data["order"],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
            }
        ),
        201,
    )


@lessons_bp.get("/<module_id>/lessons")
@jwt_required()
@approved_instructor_required()
def list_module_lessons(module_id):
    instructor_id = get_jwt_identity()

    module = db.modules.find_one({"id": module_id})

    if not module:
        return jsonify({"error": "Module not found."}), 404

    course = db.courses.find_one({"id": module["course_id"]})

    if not course:
        return jsonify({"error": "Parent course not found."}), 404

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    lessons = list(
        db.lessons.find({"module_id": module_id}, {"_id": 0}).sort("order", 1)
    )

    for lesson in lessons:
        lesson["created_at"] = lesson["created_at"].isoformat()
        lesson["updated_at"] = lesson["updated_at"].isoformat()

    return jsonify({"lessons": lessons}), 200


@lessons_bp.put("/<module_id>/lessons/<lesson_id>")
@jwt_required()
@approved_instructor_required()
def update_lesson(module_id, lesson_id):
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    lesson = db.lessons.find_one(
        {
            "id": lesson_id,
            "module_id": module_id,
        }
    )

    if not lesson:
        return jsonify({"error": "Lesson not found."}), 404

    module = db.modules.find_one({"id": module_id})

    if not module:
        return jsonify({"error": "Module not found."}), 404

    course = db.courses.find_one({"id": module["course_id"]})

    if not course:
        return jsonify({"error": "Parent course not found."}), 404

    instructor_id = get_jwt_identity()

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    title = data.get("title")
    content = data.get("content", "")
    video_url = data.get("video_url", "")
    lesson_order = data.get("order")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Title is required."}), 400

    if len(title.strip()) > 150:
        return jsonify({"error": "Title must not exceed 150 characters."}), 400

    if not isinstance(content, str):
        return jsonify({"error": "Content must be a string."}), 400

    if len(content) > 50000:
        return jsonify({"error": "Content must not exceed 50000 characters."}), 400

    if not isinstance(video_url, str):
        return jsonify({"error": "Video URL must be a string."}), 400

    if len(video_url) > 2048:
        return jsonify({"error": "Video URL must not exceed 2048 characters."}), 400

    if (
        isinstance(lesson_order, bool)
        or not isinstance(lesson_order, int)
        or lesson_order < 1
    ):
        return jsonify({"error": "Order must be a positive integer."}), 400

    duplicate = db.lessons.find_one(
        {
            "module_id": module_id,
            "order": lesson_order,
            "id": {"$ne": lesson_id},
        }
    )

    if duplicate:
        return (
            jsonify(
                {"error": "A lesson with this order already exists in the module."}
            ),
            409,
        )

    now = datetime.now(timezone.utc)

    db.lessons.update_one(
        {"id": lesson_id, "module_id": module_id},
        {
            "$set": {
                "title": title.strip(),
                "content": content.strip(),
                "video_url": video_url.strip(),
                "order": lesson_order,
                "updated_at": now,
            }
        },
    )

    updated_lesson = db.lessons.find_one(
        {"id": lesson_id, "module_id": module_id},
        {"_id": 0},
    )

    updated_lesson["created_at"] = (
        updated_lesson["created_at"].isoformat()
        if isinstance(updated_lesson.get("created_at"), datetime)
        else updated_lesson.get("created_at")
    )

    updated_lesson["updated_at"] = (
        updated_lesson["updated_at"].isoformat()
        if isinstance(updated_lesson.get("updated_at"), datetime)
        else updated_lesson.get("updated_at")
    )

    return (
        jsonify(
            {
                "message": "Lesson updated successfully.",
                "lesson": updated_lesson,
            }
        ),
        200,
    )


@lessons_bp.delete("/<module_id>/lessons/<lesson_id>")
@jwt_required()
@approved_instructor_required()
def delete_lesson(module_id, lesson_id):
    lesson = db.lessons.find_one(
        {
            "id": lesson_id,
            "module_id": module_id,
        }
    )

    if not lesson:
        return jsonify({"error": "Lesson not found."}), 404

    module = db.modules.find_one({"id": module_id})

    if not module:
        return jsonify({"error": "Module not found."}), 404

    course = db.courses.find_one({"id": module["course_id"]})

    if not course:
        return jsonify({"error": "Parent course not found."}), 404

    instructor_id = get_jwt_identity()

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    db.lessons.delete_one(
        {
            "id": lesson_id,
            "module_id": module_id,
        }
    )

    return jsonify({"message": "Lesson deleted successfully."}), 200
