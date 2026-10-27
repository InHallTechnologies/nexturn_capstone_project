from datetime import datetime, timezone

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from pymongo.errors import DuplicateKeyError

from ..extensions import db
from ..repositories.progress_repository import (
    create_progress,
    get_lesson_progress,
)
from ..repositories.certificate_repository import create_certificate

progress_bp = Blueprint("progress", __name__, url_prefix="/progress")


def check_course_completion(student_id, course_id):
    """
    Check whether the student has completed every lesson in a course.

    If all lessons are completed, update the enrollment status and
    create a certificate if one does not already exist.

    Returns:
        bool: True if all course lessons are completed, otherwise False.
    """

    # Get all modules belonging to this course.
    modules = list(
        db.modules.find(
            {"course_id": course_id},
            {"_id": 0, "id": 1},
        )
    )

    module_ids = [module["id"] for module in modules]

    if not module_ids:
        return False

    # Get all lessons belonging to the course's modules.
    lessons = list(
        db.lessons.find(
            {"module_id": {"$in": module_ids}},
            {"_id": 0, "id": 1},
        )
    )

    lesson_ids = list({lesson["id"] for lesson in lessons})

    # Do not issue a certificate for a course without lessons.
    if not lesson_ids:
        return False

    total_lessons = len(lesson_ids)

    # Find completed lessons belonging to this course.
    completed_progress = db.progress.find(
        {
            "student_id": student_id,
            "course_id": course_id,
            "lesson_id": {"$in": lesson_ids},
            "status": "completed",
        },
        {"_id": 0, "lesson_id": 1},
    )

    completed_lesson_ids = {item["lesson_id"] for item in completed_progress}

    completed_lessons = len(completed_lesson_ids)

    # The student must complete every lesson.
    if completed_lessons < total_lessons:
        return False

    completion_time = datetime.now(timezone.utc)

    # Mark the enrollment as completed if it is still active.
    # Do not overwrite the completion timestamp on an existing
    # completed enrollment.
    db.enrollments.update_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": "active",
        },
        {
            "$set": {
                "status": "completed",
                "completed_at": completion_time,
                "updated_at": completion_time,
            }
        },
    )

    # Create a certificate if one does not already exist.
    # create_certificate() returns the existing certificate when
    # the student already has one for this course.
    create_certificate(student_id, course_id)

    return True


@progress_bp.put("/courses/<course_id>/modules/<module_id>/lessons/<lesson_id>")
@jwt_required()
def complete_lesson(course_id, module_id, lesson_id):
    claims = get_jwt()

    if claims.get("role") != "student":
        return (
            jsonify({"error": "Only students can update lesson progress."}),
            403,
        )

    student_id = get_jwt_identity()

    # Allow active and completed enrollments.
    # This also allows a retry to issue a missing certificate
    # for a course that has already been completed.
    enrollment = db.enrollments.find_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": {"$in": ["active", "completed"]},
        }
    )

    if not enrollment:
        return (
            jsonify({"error": "You must be enrolled in this course."}),
            403,
        )

    course = db.courses.find_one({"id": course_id, "status": "published"})

    if not course:
        return jsonify({"error": "Published course not found."}), 404

    module = db.modules.find_one({"id": module_id, "course_id": course_id})

    if not module:
        return (
            jsonify({"error": "Module not found in this course."}),
            404,
        )

    lesson = db.lessons.find_one({"id": lesson_id, "module_id": module_id})

    if not lesson:
        return (
            jsonify({"error": "Lesson not found in this module."}),
            404,
        )

    existing_progress = get_lesson_progress(
        student_id,
        course_id,
        lesson_id,
    )

    now = datetime.now(timezone.utc)

    # If this lesson is already completed, check course completion
    # again. This can recover a missing certificate.
    if existing_progress and existing_progress.get("status") == "completed":
        course_completed = check_course_completion(
            student_id,
            course_id,
        )

        return (
            jsonify(
                {
                    "message": "Lesson is already completed.",
                    "course_completed": course_completed,
                }
            ),
            200,
        )

    if existing_progress:
        # Update an existing incomplete progress record.
        db.progress.update_one(
            {"id": existing_progress["id"]},
            {
                "$set": {
                    "module_id": module_id,
                    "status": "completed",
                    "completed_at": now,
                    "updated_at": now,
                }
            },
        )

    else:
        # Create a new progress record.
        progress_data = {
            "student_id": student_id,
            "course_id": course_id,
            "module_id": module_id,
            "lesson_id": lesson_id,
            "status": "completed",
            "completed_at": now,
            "created_at": now,
            "updated_at": now,
        }

        try:
            create_progress(progress_data)

        except DuplicateKeyError:
            # Another request may have created the record.
            # Check the database before deciding how to respond.
            existing_progress = get_lesson_progress(
                student_id,
                course_id,
                lesson_id,
            )

            if not existing_progress or existing_progress.get("status") != "completed":
                return (
                    jsonify(
                        {"error": ("Lesson progress already exists. " "Please retry.")}
                    ),
                    409,
                )

    # Check whether all course lessons are completed.
    # If so, complete the enrollment and issue the certificate.
    course_completed = check_course_completion(
        student_id,
        course_id,
    )

    return (
        jsonify(
            {
                "message": "Lesson marked as completed.",
                "progress": {
                    "student_id": student_id,
                    "course_id": course_id,
                    "module_id": module_id,
                    "lesson_id": lesson_id,
                    "status": "completed",
                    "completed_at": now.isoformat(),
                },
                "course_completed": course_completed,
            }
        ),
        200,
    )


@progress_bp.delete("/courses/<course_id>/modules/<module_id>/lessons/<lesson_id>")
@jwt_required()
def uncomplete_lesson(course_id, module_id, lesson_id):
    claims = get_jwt()

    if claims.get("role") != "student":
        return (
            jsonify({"error": "Only students can update lesson progress."}),
            403,
        )

    student_id = get_jwt_identity()

    # Allow active or completed enrollments so a student can undo
    # a lesson even after completing the course.
    enrollment = db.enrollments.find_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": {"$in": ["active", "completed"]},
        }
    )

    if not enrollment:
        return (
            jsonify({"error": "You must be enrolled in this course."}),
            403,
        )

    course = db.courses.find_one({"id": course_id, "status": "published"})

    if not course:
        return jsonify({"error": "Published course not found."}), 404

    module = db.modules.find_one({"id": module_id, "course_id": course_id})

    if not module:
        return (
            jsonify({"error": "Module not found in this course."}),
            404,
        )

    lesson = db.lessons.find_one({"id": lesson_id, "module_id": module_id})

    if not lesson:
        return (
            jsonify({"error": "Lesson not found in this module."}),
            404,
        )

    now = datetime.now(timezone.utc)

    existing_progress = get_lesson_progress(
        student_id,
        course_id,
        lesson_id,
    )

    if not existing_progress or existing_progress.get("status") != "completed":
        return (
            jsonify(
                {
                    "message": "Lesson is already marked as incomplete.",
                    "course_completed": enrollment.get("status") == "completed",
                }
            ),
            200,
        )

    # Mark the lesson as incomplete but retain its progress record.
    db.progress.update_one(
        {
            "id": existing_progress["id"],
            "student_id": student_id,
            "course_id": course_id,
        },
        {
            "$set": {
                "status": "incomplete",
                "updated_at": now,
            },
            "$unset": {
                "completed_at": "",
            },
        },
    )

    # If a lesson is undone, the course is no longer completed.
    if enrollment.get("status") == "completed":
        db.enrollments.update_one(
            {
                "student_id": student_id,
                "course_id": course_id,
                "status": "completed",
            },
            {
                "$set": {
                    "status": "active",
                    "updated_at": now,
                },
                "$unset": {
                    "completed_at": "",
                },
            },
        )

    return (
        jsonify(
            {
                "message": "Lesson marked as incomplete.",
                "progress": {
                    "student_id": student_id,
                    "course_id": course_id,
                    "module_id": module_id,
                    "lesson_id": lesson_id,
                    "status": "incomplete",
                },
                "course_completed": False,
            }
        ),
        200,
    )


@progress_bp.get("/courses/<course_id>")
@jwt_required()
def get_my_course_progress(course_id):
    claims = get_jwt()

    if claims.get("role") != "student":
        return (
            jsonify({"error": "Only students can view lesson progress."}),
            403,
        )

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
            jsonify({"error": "You must be enrolled in this course."}),
            403,
        )

    course = db.courses.find_one({"id": course_id, "status": "published"})

    if not course:
        return jsonify({"error": "Published course not found."}), 404

    modules = list(
        db.modules.find(
            {"course_id": course_id},
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "order": 1,
            },
        ).sort("order", 1)
    )

    module_ids = [module["id"] for module in modules]

    lessons = list(
        db.lessons.find(
            {"module_id": {"$in": module_ids}},
            {
                "_id": 0,
                "id": 1,
                "module_id": 1,
                "title": 1,
                "order": 1,
            },
        ).sort("order", 1)
    )

    completed_progress = list(
        db.progress.find(
            {
                "student_id": student_id,
                "course_id": course_id,
                "status": "completed",
            },
            {
                "_id": 0,
                "lesson_id": 1,
                "module_id": 1,
            },
        )
    )

    completed_lesson_ids = {item["lesson_id"] for item in completed_progress}

    for lesson in lessons:
        lesson["completed"] = lesson["id"] in completed_lesson_ids

    total_lessons = len(lessons)

    completed_lessons = sum(1 for lesson in lessons if lesson["completed"])

    completion_percentage = (
        round(completed_lessons / total_lessons * 100, 2) if total_lessons > 0 else 0
    )

    modules_with_lessons = []

    for module in modules:
        module_lessons = [
            lesson for lesson in lessons if lesson["module_id"] == module["id"]
        ]

        module_total = len(module_lessons)

        module_completed = sum(1 for lesson in module_lessons if lesson["completed"])

        modules_with_lessons.append(
            {
                **module,
                "lessons": module_lessons,
                "total_lessons": module_total,
                "completed_lessons": module_completed,
                "completion_percentage": (
                    round(module_completed / module_total * 100, 2)
                    if module_total > 0
                    else 0
                ),
            }
        )

    return (
        jsonify(
            {
                "course_id": course_id,
                "course_title": course["title"],
                "enrollment_status": enrollment["status"],
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "completion_percentage": completion_percentage,
                "modules": modules_with_lessons,
            }
        ),
        200,
    )
