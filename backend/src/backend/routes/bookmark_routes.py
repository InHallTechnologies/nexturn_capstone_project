from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from ..extensions import db
from ..repositories.bookmark_repository import (
    create_bookmark,
    delete_bookmark,
    get_bookmark,
    get_student_bookmarks,
)

bookmarks_bp = Blueprint(
    "bookmarks",
    __name__,
    url_prefix="/student/bookmarks",
)


def student_required():
    return get_jwt().get("role") == "student"


def serialize_bookmark(bookmark):
    if not bookmark:
        return None

    # Create a copy to avoid modifying the original document.
    bookmark = dict(bookmark)

    # Remove MongoDB's ObjectId.
    bookmark.pop("_id", None)

    # Convert datetime into a JSON-serializable string.
    created_at = bookmark.get("created_at")

    if isinstance(created_at, datetime):
        bookmark["created_at"] = created_at.isoformat()

    return bookmark


@bookmarks_bp.get("")
@jwt_required()
def list_bookmarks():
    if not student_required():
        return jsonify({"error": "Only students can access bookmarks."}), 403

    student_id = get_jwt_identity()
    course_id = request.args.get("course_id")

    bookmarks = get_student_bookmarks(
        student_id=student_id,
        course_id=course_id,
    )

    return (
        jsonify(
            {"bookmarks": [serialize_bookmark(bookmark) for bookmark in bookmarks]}
        ),
        200,
    )


@bookmarks_bp.post("/<lesson_id>")
@jwt_required()
def add_bookmark(lesson_id):
    if not student_required():
        return jsonify({"error": "Only students can bookmark lessons."}), 403

    student_id = get_jwt_identity()

    # Find the requested lesson.
    lesson = db.lessons.find_one(
        {
            "id": lesson_id,
        }
    )

    if not lesson:
        return jsonify({"error": "Lesson not found."}), 404

    # Find the module containing this lesson.
    module = db.modules.find_one(
        {
            "id": lesson["module_id"],
        }
    )

    if not module:
        return jsonify({"error": "Module not found."}), 404

    course_id = module["course_id"]

    # Only allow bookmarks for published courses.
    course = db.courses.find_one(
        {
            "id": course_id,
            "status": "published",
        }
    )

    if not course:
        return jsonify({"error": "Published course not found."}), 404

    # Confirm the student is enrolled in the course.
    enrollment = db.enrollments.find_one(
        {
            "student_id": student_id,
            "course_id": course_id,
            "status": {
                "$in": ["active", "completed"],
            },
        }
    )

    if not enrollment:
        return jsonify({"error": "You are not enrolled in this course."}), 403

    # Avoid creating duplicate bookmarks.
    existing = get_bookmark(
        student_id=student_id,
        lesson_id=lesson_id,
    )

    if existing:
        return (
            jsonify(
                {
                    "message": "Lesson is already bookmarked.",
                    "bookmark": serialize_bookmark(existing),
                }
            ),
            200,
        )

    bookmark = create_bookmark(
        student_id=student_id,
        course_id=course_id,
        module_id=lesson["module_id"],
        lesson_id=lesson_id,
    )

    return (
        jsonify(
            {
                "message": "Lesson bookmarked successfully.",
                "bookmark": serialize_bookmark(bookmark),
            }
        ),
        201,
    )


@bookmarks_bp.delete("/<lesson_id>")
@jwt_required()
def remove_bookmark(lesson_id):
    if not student_required():
        return jsonify({"error": "Only students can remove bookmarks."}), 403

    student_id = get_jwt_identity()

    deleted = delete_bookmark(
        student_id=student_id,
        lesson_id=lesson_id,
    )

    if not deleted:
        return jsonify({"error": "Bookmark not found."}), 404

    return jsonify({"message": "Bookmark removed successfully."}), 200
