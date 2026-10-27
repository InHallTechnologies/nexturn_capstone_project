from datetime import datetime, timezone

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from pymongo.errors import DuplicateKeyError

from ..extensions import db
from ..repositories.enrollment_repository import (
    create_enrollment,
    get_enrollment,
)

enrollments_bp = Blueprint("enrollments", __name__, url_prefix="/enrollments")


@enrollments_bp.post("/<course_id>")
@jwt_required()
def enroll_in_course(course_id):
    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({"error": "Only students can enroll in courses."}), 403

    student_id = get_jwt_identity()

    course = db.courses.find_one({"id": course_id, "status": "published"})

    if not course:
        return jsonify({"error": "Published course not found."}), 404

    existing_enrollment = get_enrollment(student_id, course_id)

    if existing_enrollment:
        if existing_enrollment.get("status") == "active":
            return jsonify({"error": "You are already enrolled in this course."}), 409

        if existing_enrollment.get("status") == "completed":
            return jsonify({"error": "You have already completed this course."}), 409

        if existing_enrollment.get("status") == "cancelled":
            return (
                jsonify(
                    {
                        "error": "Your previous enrollment was cancelled. Re-enrollment is not supported yet."
                    }
                ),
                409,
            )

    now = datetime.now(timezone.utc)

    enrollment_data = {
        "student_id": student_id,
        "course_id": course_id,
        "status": "active",
        "enrolled_at": now,
        "completed_at": None,
        "created_at": now,
        "updated_at": now,
    }

    try:
        create_enrollment(enrollment_data)
    except DuplicateKeyError:
        return (
            jsonify({"error": "An enrollment record already exists for this course."}),
            409,
        )

    return (
        jsonify(
            {
                "message": "Successfully enrolled in course.",
                "enrollment": {
                    "id": enrollment_data["id"],
                    "student_id": student_id,
                    "course_id": course_id,
                    "status": "active",
                    "enrolled_at": now.isoformat(),
                },
            }
        ),
        201,
    )


@enrollments_bp.get("")
@jwt_required()
def list_my_enrollments():
    claims = get_jwt()

    if claims.get("role") != "student":
        return jsonify({"error": "Only students can view their enrollments."}), 403

    student_id = get_jwt_identity()

    enrollments = list(
        db.enrollments.find({"student_id": student_id}, {"_id": 0}).sort(
            "enrolled_at", -1
        )
    )

    for enrollment in enrollments:
        for field in (
            "enrolled_at",
            "completed_at",
            "created_at",
            "updated_at",
        ):
            value = enrollment.get(field)
            if value is not None:
                enrollment[field] = value.isoformat()

    return jsonify({"enrollments": enrollments}), 200
