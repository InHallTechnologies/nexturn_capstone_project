from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db

student_learning_bp = Blueprint(
    "student_learning",
    __name__,
    url_prefix="/student/courses",
)


def serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def get_accessible_course(course_id, student_id):
    course = db.courses.find_one(
        {
            "id": course_id,
            "status": "published",
        }
    )

    if not course:
        return None, (jsonify({"error": "Course not found."}), 404)

    enrollment = db.enrollments.find_one(
        {
            "course_id": course_id,
            "student_id": student_id,
            "status": {"$in": ["active", "completed"]},
        }
    )

    if not enrollment:
        return None, (
            jsonify({"error": "You are not enrolled in this course."}),
            403,
        )

    return course, None


@student_learning_bp.get("/<course_id>/modules")
@jwt_required()
def get_student_course_modules(course_id):
    student_id = get_jwt_identity()

    course, error = get_accessible_course(course_id, student_id)
    if error:
        return error

    modules = list(
        db.modules.find(
            {"course_id": course_id},
            {"_id": 0},
        ).sort("order", 1)
    )

    result = []

    for module in modules:
        lessons = list(
            db.lessons.find(
                {"module_id": module["id"]},
                {"_id": 0},
            ).sort("order", 1)
        )

        for lesson in lessons:
            for field in ("created_at", "updated_at"):
                lesson[field] = serialize_datetime(lesson.get(field))

        for field in ("created_at", "updated_at"):
            module[field] = serialize_datetime(module.get(field))

        module["lessons"] = lessons
        result.append(module)

    return (
        jsonify(
            {
                "course": {
                    "id": course["id"],
                    "title": course["title"],
                    "description": course.get("description", ""),
                    "category": course.get("category", ""),
                },
                "modules": result,
            }
        ),
        200,
    )


@student_learning_bp.put("/<course_id>/last-lesson")
@jwt_required()
def save_last_opened_lesson(course_id):
    student_id = get_jwt_identity()

    course, error = get_accessible_course(course_id, student_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    lesson_id = data.get("lesson_id")

    if not isinstance(lesson_id, str) or not lesson_id.strip():
        return jsonify({"error": "Valid lesson_id is required."}), 400

    lesson_id = lesson_id.strip()

    # Confirm the lesson belongs to a module in this course.
    lesson = db.lessons.find_one({"id": lesson_id})

    if not lesson:
        return jsonify({"error": "Lesson not found."}), 404

    module = db.modules.find_one(
        {
            "id": lesson["module_id"],
            "course_id": course_id,
        }
    )

    if not module:
        return jsonify({"error": "Lesson does not belong to this course."}), 404

    now = datetime.now(timezone.utc)

    db.enrollments.update_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": {"$in": ["active", "completed"]},
        },
        {
            "$set": {
                "last_lesson_id": lesson_id,
                "last_accessed_at": now,
                "updated_at": now,
            }
        },
    )

    return (
        jsonify(
            {
                "message": "Last opened lesson saved.",
                "last_lesson_id": lesson_id,
            }
        ),
        200,
    )


@student_learning_bp.get("/<course_id>/last-lesson")
@jwt_required()
def get_last_opened_lesson(course_id):
    student_id = get_jwt_identity()

    course, error = get_accessible_course(course_id, student_id)
    if error:
        return error

    enrollment = db.enrollments.find_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": {"$in": ["active", "completed"]},
        },
        {"_id": 0, "last_lesson_id": 1},
    )

    return (
        jsonify(
            {
                "course_id": course_id,
                "last_lesson_id": (
                    enrollment.get("last_lesson_id") if enrollment else None
                ),
            }
        ),
        200,
    )
