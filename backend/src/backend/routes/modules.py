from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..repositories.module_repository import create_module
from ..utils.authorization import approved_instructor_required

modules_bp = Blueprint("modules", __name__, url_prefix="/courses")


@modules_bp.post("/<course_id>/modules")
@jwt_required()
@approved_instructor_required()
def create_new_module(course_id):
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    data = request.json

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    title = data.get("title")
    description = data.get("description", "")
    module_order = data.get("order")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Title is required."}), 400

    if len(title.strip()) > 150:
        return jsonify({"error": "Title must not exceed 150 characters."}), 400

    if not isinstance(description, str):
        return jsonify({"error": "Description must be a string."}), 400

    if len(description.strip()) > 2000:
        return jsonify({"error": "Description must not exceed 2000 characters."}), 400

    if (
        isinstance(module_order, bool)
        or not isinstance(module_order, int)
        or module_order < 1
    ):
        return jsonify({"error": "Order must be a positive integer."}), 400

    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    instructor_id = get_jwt_identity()

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    existing_module = db.modules.find_one(
        {"course_id": course_id, "order": module_order}
    )

    if existing_module:
        return (
            jsonify(
                {"error": "A module with this order already exists in the course."}
            ),
            409,
        )

    now = datetime.now(timezone.utc)

    module_data = {
        "course_id": course_id,
        "title": title.strip(),
        "description": description.strip(),
        "order": module_order,
        "created_at": now,
        "updated_at": now,
    }

    create_module(module_data)

    return (
        jsonify(
            {
                "message": "Module created successfully.",
                "module": {
                    "id": module_data["id"],
                    "course_id": module_data["course_id"],
                    "title": module_data["title"],
                    "description": module_data["description"],
                    "order": module_data["order"],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                },
            }
        ),
        201,
    )


@modules_bp.get("/<course_id>/modules")
@jwt_required()
@approved_instructor_required()
def list_course_modules(course_id):
    instructor_id = get_jwt_identity()

    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("instructor_id") != instructor_id:
        return jsonify({"error": "You do not own this course."}), 403

    modules = list(
        db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1)
    )

    for module in modules:
        module["created_at"] = module["created_at"].isoformat()
        module["updated_at"] = module["updated_at"].isoformat()

    return jsonify({"modules": modules}), 200
