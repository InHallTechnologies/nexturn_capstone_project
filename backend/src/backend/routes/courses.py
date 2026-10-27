from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..repositories.course_repository import create_course
from ..extensions import db
from ..utils.authorization import approved_instructor_required

courses_bp = Blueprint("courses", __name__, url_prefix="/courses")


@courses_bp.post("")
@jwt_required()
@approved_instructor_required()
def create_new_course():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    data = request.json

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    title = data.get("title")
    description = data.get("description")
    category = data.get("category")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Title is required."}), 400

    if len(title.strip()) > 150:
        return jsonify({"error": "Title must not exceed 150 characters."}), 400

    if not isinstance(description, str) or not description.strip():
        return jsonify({"error": "Description is required."}), 400

    if len(description.strip()) > 5000:
        return jsonify({"error": "Description must not exceed 5000 characters."}), 400

    if not isinstance(category, str) or not category.strip():
        return jsonify({"error": "Category is required."}), 400

    if len(category.strip()) > 100:
        return jsonify({"error": "Category must not exceed 100 characters."}), 400

    now = datetime.now(timezone.utc)

    course_data = {
        "title": title.strip(),
        "description": description.strip(),
        "category": category.strip(),
        "instructor_id": get_jwt_identity(),
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    create_course(course_data)

    return (
        jsonify(
            {
                "message": "Course created successfully.",
                "course": {
                    "id": course_data["id"],
                    "title": course_data["title"],
                    "description": course_data["description"],
                    "category": course_data["category"],
                    "instructor_id": course_data["instructor_id"],
                    "status": course_data["status"],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
            }
        ),
        201,
    )


@courses_bp.patch("/<course_id>")
@jwt_required()
@approved_instructor_required()
def update_course(course_id):
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    data = request.json

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    allowed_fields = {"title", "description", "category"}

    if not data:
        return jsonify({"error": "Provide at least one field to update."}), 400

    unexpected_fields = set(data.keys()) - allowed_fields

    if unexpected_fields:
        return (
            jsonify({"error": "Only title, description, and category can be updated."}),
            400,
        )

    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    instructor_id = get_jwt_identity()

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    if course.get("status") != "draft":
        return jsonify({"error": "Only draft courses can be updated."}), 409

    updates = {}

    limits = {
        "title": 150,
        "description": 5000,
        "category": 100,
    }

    for field, value in data.items():
        if not isinstance(value, str) or not value.strip():
            return jsonify({"error": f"{field} must be a non-empty string."}), 400

        if len(value.strip()) > limits[field]:
            return (
                jsonify(
                    {"error": f"{field} must not exceed {limits[field]} characters."}
                ),
                400,
            )

        updates[field] = value.strip()

    updates["updated_at"] = datetime.now(timezone.utc)

    db.courses.update_one({"id": course_id}, {"$set": updates})

    updated_course = db.courses.find_one({"id": course_id}, {"_id": 0})

    updated_course["created_at"] = updated_course["created_at"].isoformat()
    updated_course["updated_at"] = updated_course["updated_at"].isoformat()

    return (
        jsonify({"message": "Course updated successfully.", "course": updated_course}),
        200,
    )


@courses_bp.get("/<course_id>")
@jwt_required()
@approved_instructor_required()
def get_course_details(course_id):
    instructor_id = get_jwt_identity()

    course = db.courses.find_one({"id": course_id, "instructor_id": instructor_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    course.pop("_id", None)
    course["created_at"] = course["created_at"].isoformat()
    course["updated_at"] = course["updated_at"].isoformat()

    return jsonify({"course": course}), 200


@courses_bp.post("/<course_id>/submit")
@jwt_required()
@approved_instructor_required()
def submit_course_for_review(course_id):
    instructor_id = get_jwt_identity()

    course = db.courses.find_one({"id": course_id, "instructor_id": instructor_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("status") != "draft":
        return (
            jsonify({"error": "Only draft courses can be submitted for review."}),
            409,
        )

    modules = list(db.modules.find({"course_id": course_id}, {"_id": 0, "id": 1}))

    if not modules:
        return (
            jsonify({"error": "Add at least one module before submitting the course."}),
            400,
        )

    module_ids = [module["id"] for module in modules]

    lesson_count = db.lessons.count_documents({"module_id": {"$in": module_ids}})

    if lesson_count == 0:
        return (
            jsonify({"error": "Add at least one lesson before submitting the course."}),
            400,
        )

    now = datetime.now(timezone.utc)

    db.courses.update_one(
        {"id": course_id, "instructor_id": instructor_id, "status": "draft"},
        {"$set": {"status": "pending_review", "updated_at": now}},
    )

    return (
        jsonify(
            {
                "message": "Course submitted for admin review.",
                "course": {
                    "id": course_id,
                    "status": "pending_review",
                    "updated_at": now.isoformat(),
                },
            }
        ),
        200,
    )


@courses_bp.get("")
@jwt_required()
def list_published_courses():
    courses = list(
        db.courses.find(
            {"status": "published"},
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "description": 1,
                "category": 1,
                "instructor_id": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        ).sort("created_at", -1)
    )

    for course in courses:
        for field in ("created_at", "updated_at"):
            value = course.get(field)

            if isinstance(value, datetime):
                course[field] = value.isoformat()

    return jsonify({"courses": courses}), 200


@courses_bp.get("/my")
@jwt_required()
@approved_instructor_required()
def list_my_courses():
    """Return all courses owned by the authenticated instructor."""
    instructor_id = get_jwt_identity()

    courses = list(
        db.courses.find(
            {"instructor_id": instructor_id},
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "description": 1,
                "category": 1,
                "status": 1,
                "instructor_id": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        ).sort("created_at", -1)
    )

    for course in courses:
        for field in ("created_at", "updated_at"):
            value = course.get(field)

            if isinstance(value, datetime):
                course[field] = value.isoformat()

    return jsonify({"courses": courses}), 200
