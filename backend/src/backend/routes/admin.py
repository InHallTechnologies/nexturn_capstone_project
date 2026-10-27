from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required, get_jwt_identity

from ..extensions import db
from ..utils.authorization import roles_required

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


# =========================================================
# INSTRUCTOR MANAGEMENT
# =========================================================


@admin_bp.get("/instructors/pending")
@jwt_required()
@roles_required("admin")
def get_pending_instructors():
    instructors = db.users.find(
        {"role": "instructor", "instructor_status": "pending"},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "email": 1,
            "profile": 1,
            "created_at": 1,
        },
    ).sort("created_at", 1)

    return jsonify({"instructors": list(instructors)}), 200


@admin_bp.patch("/instructors/<instructor_id>/approve")
@jwt_required()
@roles_required("admin")
def approve_instructor(instructor_id):
    instructor = db.users.find_one({"id": instructor_id, "role": "instructor"})

    if not instructor:
        return jsonify({"error": "Instructor not found."}), 404

    if instructor.get("instructor_status") == "approved":
        return jsonify({"message": "Instructor is already approved."}), 200

    if instructor.get("instructor_status") != "pending":
        return jsonify({"error": "Only pending instructors can be approved."}), 409

    db.users.update_one(
        {"id": instructor_id, "role": "instructor"},
        {
            "$set": {
                "instructor_status": "approved",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return jsonify({"message": "Instructor approved successfully."}), 200


@admin_bp.patch("/instructors/<instructor_id>/reject")
@jwt_required()
@roles_required("admin")
def reject_instructor(instructor_id):
    instructor = db.users.find_one({"id": instructor_id, "role": "instructor"})

    if not instructor:
        return jsonify({"error": "Instructor not found."}), 404

    if instructor.get("instructor_status") == "rejected":
        return jsonify({"message": "Instructor is already rejected."}), 200

    if instructor.get("instructor_status") != "pending":
        return jsonify({"error": "Only pending instructors can be rejected."}), 409

    db.users.update_one(
        {"id": instructor_id, "role": "instructor"},
        {
            "$set": {
                "instructor_status": "rejected",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return jsonify({"message": "Instructor rejected successfully."}), 200


# =========================================================
# COURSE MANAGEMENT
# =========================================================


@admin_bp.get("/courses/pending")
@jwt_required()
@roles_required("admin")
def get_pending_courses():
    courses = list(
        db.courses.find(
            {"status": "pending_review"},
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "description": 1,
                "category": 1,
                "instructor_id": 1,
                "status": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        ).sort("created_at", 1)
    )

    for course in courses:
        for field in ("created_at", "updated_at"):
            value = course.get(field)
            if isinstance(value, datetime):
                course[field] = value.isoformat()

    return jsonify({"courses": courses}), 200


@admin_bp.patch("/courses/<course_id>/approve")
@jwt_required()
@roles_required("admin")
def approve_course(course_id):
    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("status") != "pending_review":
        return jsonify({"error": "Only courses pending review can be approved."}), 409

    now = datetime.now(timezone.utc)

    result = db.courses.update_one(
        {"id": course_id, "status": "pending_review"},
        {
            "$set": {
                "status": "approved",
                "updated_at": now,
            },
            "$unset": {
                "rejection_reason": "",
            },
        },
    )

    if result.modified_count != 1:
        return jsonify({"error": "Course status changed. Please try again."}), 409

    return (
        jsonify(
            {
                "message": "Course approved successfully.",
                "course": {
                    "id": course_id,
                    "status": "approved",
                    "updated_at": now.isoformat(),
                },
            }
        ),
        200,
    )


@admin_bp.patch("/courses/<course_id>/reject")
@jwt_required()
@roles_required("admin")
def reject_course(course_id):
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    reason = data.get("reason")

    if not isinstance(reason, str) or not reason.strip():
        return jsonify({"error": "Rejection reason is required."}), 400

    reason = reason.strip()

    if len(reason) > 1000:
        return (
            jsonify({"error": "Rejection reason must not exceed 1000 characters."}),
            400,
        )

    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("status") != "pending_review":
        return jsonify({"error": "Only courses pending review can be rejected."}), 409

    now = datetime.now(timezone.utc)

    result = db.courses.update_one(
        {"id": course_id, "status": "pending_review"},
        {
            "$set": {
                "status": "draft",
                "rejection_reason": reason,
                "updated_at": now,
            }
        },
    )

    if result.modified_count != 1:
        return jsonify({"error": "Course status changed. Please try again."}), 409

    return (
        jsonify(
            {
                "message": "Course rejected successfully. It has been moved to draft.",
                "course": {
                    "id": course_id,
                    "status": "draft",
                    "rejection_reason": reason,
                    "updated_at": now.isoformat(),
                },
            }
        ),
        200,
    )


@admin_bp.patch("/courses/<course_id>/publish")
@jwt_required()
@roles_required("admin")
def publish_course(course_id):
    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("status") != "approved":
        return (
            jsonify({"error": "Only approved courses can be published."}),
            409,
        )

    now = datetime.now(timezone.utc)

    result = db.courses.update_one(
        {"id": course_id, "status": "approved"},
        {
            "$set": {
                "status": "published",
                "updated_at": now,
            }
        },
    )

    if result.modified_count != 1:
        return jsonify({"error": "Course status changed. Please try again."}), 409

    return (
        jsonify(
            {
                "message": "Course published successfully.",
                "course": {
                    "id": course_id,
                    "status": "published",
                    "updated_at": now.isoformat(),
                },
            }
        ),
        200,
    )


@admin_bp.patch("/courses/<course_id>/unpublish")
@jwt_required()
@roles_required("admin")
def unpublish_course(course_id):
    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    if course.get("status") != "published":
        return (
            jsonify({"error": "Only published courses can be unpublished."}),
            409,
        )

    now = datetime.now(timezone.utc)

    result = db.courses.update_one(
        {"id": course_id, "status": "published"},
        {
            "$set": {
                "status": "draft",
                "updated_at": now,
            }
        },
    )

    if result.modified_count != 1:
        return jsonify({"error": "Course status changed. Please try again."}), 409

    return (
        jsonify(
            {
                "message": "Course unpublished successfully. It has been moved to draft.",
                "course": {
                    "id": course_id,
                    "status": "draft",
                    "updated_at": now.isoformat(),
                },
            }
        ),
        200,
    )


# =========================================================
# ADMIN DASHBOARD STATISTICS
# =========================================================


@admin_bp.get("/stats")
@jwt_required()
@roles_required("admin")
def get_admin_stats():
    # User statistics
    total_users = db.users.count_documents({})
    total_students = db.users.count_documents({"role": "student"})
    total_instructors = db.users.count_documents({"role": "instructor"})
    total_admins = db.users.count_documents({"role": "admin"})

    pending_instructors = db.users.count_documents(
        {
            "role": "instructor",
            "instructor_status": "pending",
        }
    )

    approved_instructors = db.users.count_documents(
        {
            "role": "instructor",
            "instructor_status": "approved",
        }
    )

    rejected_instructors = db.users.count_documents(
        {
            "role": "instructor",
            "instructor_status": "rejected",
        }
    )

    # Course statistics
    total_courses = db.courses.count_documents({})
    published_courses = db.courses.count_documents({"status": "published"})
    draft_courses = db.courses.count_documents({"status": "draft"})
    pending_courses = db.courses.count_documents({"status": "pending_review"})
    approved_courses = db.courses.count_documents({"status": "approved"})

    # Enrollment statistics
    total_enrollments = db.enrollments.count_documents({})
    active_enrollments = db.enrollments.count_documents({"status": "active"})
    completed_enrollments = db.enrollments.count_documents({"status": "completed"})
    cancelled_enrollments = db.enrollments.count_documents({"status": "cancelled"})

    # Quiz statistics
    total_quizzes = db.quizzes.count_documents({})
    published_quizzes = db.quizzes.count_documents({"status": "published"})
    total_questions = db.questions.count_documents({})

    # Attempt statistics
    total_attempts = db.attempts.count_documents({})
    submitted_attempts = db.attempts.count_documents({"status": "submitted"})
    in_progress_attempts = db.attempts.count_documents({"status": "in_progress"})
    expired_attempts = db.attempts.count_documents({"status": "expired"})

    # Certificate statistics
    total_certificates = db.certificates.count_documents({})

    return (
        jsonify(
            {
                "users": {
                    "total": total_users,
                    "students": total_students,
                    "instructors": total_instructors,
                    "admins": total_admins,
                    "pending_instructors": pending_instructors,
                    "approved_instructors": approved_instructors,
                    "rejected_instructors": rejected_instructors,
                },
                "courses": {
                    "total": total_courses,
                    "published": published_courses,
                    "draft": draft_courses,
                    "pending_review": pending_courses,
                    "approved": approved_courses,
                },
                "enrollments": {
                    "total": total_enrollments,
                    "active": active_enrollments,
                    "completed": completed_enrollments,
                    "cancelled": cancelled_enrollments,
                },
                "quizzes": {
                    "total": total_quizzes,
                    "published": published_quizzes,
                    "questions": total_questions,
                },
                "attempts": {
                    "total": total_attempts,
                    "submitted": submitted_attempts,
                    "in_progress": in_progress_attempts,
                    "expired": expired_attempts,
                },
                "certificates": {
                    "total": total_certificates,
                },
            }
        ),
        200,
    )


# =========================================================
# USER MANAGEMENT
# =========================================================


@admin_bp.get("/users")
@jwt_required()
@roles_required("admin")
def get_all_users():
    role = request.args.get("role", "").strip().lower()

    if role and role not in {"student", "instructor", "admin"}:
        return jsonify({"error": "Invalid role."}), 400

    query = {"role": role} if role else {}

    users = list(
        db.users.find(
            query,
            {
                "_id": 0,
                "id": 1,
                "name": 1,
                "email": 1,
                "role": 1,
                "instructor_status": 1,
                "created_at": 1,
            },
        ).sort("created_at", -1)
    )

    for user in users:
        value = user.get("created_at")
        if isinstance(value, datetime):
            user["created_at"] = value.isoformat()

    return (
        jsonify(
            {
                "users": users,
                "total": len(users),
            }
        ),
        200,
    )


@admin_bp.get("/instructors")
@jwt_required()
@roles_required("admin")
def get_all_instructors():
    status = request.args.get("status", "").strip().lower()

    if status and status not in {"pending", "approved", "rejected"}:
        return jsonify({"error": "Invalid instructor status."}), 400

    query = {"role": "instructor"}

    if status:
        query["instructor_status"] = status

    instructors = list(
        db.users.find(
            query,
            {
                "_id": 0,
                "id": 1,
                "name": 1,
                "email": 1,
                "profile": 1,
                "instructor_status": 1,
                "created_at": 1,
            },
        ).sort("created_at", -1)
    )

    for instructor in instructors:
        value = instructor.get("created_at")
        if isinstance(value, datetime):
            instructor["created_at"] = value.isoformat()

    return (
        jsonify(
            {
                "instructors": instructors,
                "total": len(instructors),
            }
        ),
        200,
    )


@admin_bp.get("/courses")
@jwt_required()
@roles_required("admin")
def get_all_courses():
    status = request.args.get("status", "").strip().lower()

    allowed_statuses = {
        "draft",
        "pending_review",
        "approved",
        "published",
    }

    if status and status not in allowed_statuses:
        return jsonify({"error": "Invalid course status."}), 400

    query = {"status": status} if status else {}

    courses = list(
        db.courses.find(
            query,
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "description": 1,
                "category": 1,
                "instructor_id": 1,
                "status": 1,
                "rejection_reason": 1,
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

    return (
        jsonify(
            {
                "courses": courses,
                "total": len(courses),
            }
        ),
        200,
    )


# =========================================================
# DELETE USER
# =========================================================


@admin_bp.delete("/users/<user_id>")
@jwt_required()
@roles_required("admin")
def delete_user(user_id):
    current_admin_id = str(get_jwt_identity())

    if user_id == current_admin_id:
        return jsonify({"error": "You cannot delete your own admin account."}), 400

    user = db.users.find_one({"id": user_id})

    if not user:
        return jsonify({"error": "User not found."}), 404

    if user.get("role") == "admin":
        return (
            jsonify({"error": "Admin accounts cannot be deleted through this route."}),
            403,
        )

    if user.get("role") == "instructor":
        return jsonify({"error": "Use the instructor removal route instead."}), 400

    dependent_collections = [
        "enrollments",
        "attempts",
        "certificates",
    ]

    for collection_name in dependent_collections:
        collection = getattr(db, collection_name)

        if collection.find_one({"student_id": user_id}):
            return (
                jsonify(
                    {
                        "error": (
                            f"Cannot delete user: related records exist "
                            f"in {collection_name}."
                        )
                    }
                ),
                409,
            )

    db.users.delete_one({"id": user_id})

    return (
        jsonify(
            {
                "message": "User deleted successfully.",
                "id": user_id,
            }
        ),
        200,
    )


# =========================================================
# DELETE INSTRUCTOR
# =========================================================


@admin_bp.delete("/instructors/<instructor_id>")
@jwt_required()
@roles_required("admin")
def delete_instructor(instructor_id):
    instructor = db.users.find_one(
        {
            "id": instructor_id,
            "role": "instructor",
        }
    )

    if not instructor:
        return jsonify({"error": "Instructor not found."}), 404

    if db.courses.find_one({"instructor_id": instructor_id}):
        return (
            jsonify(
                {
                    "error": (
                        "This instructor owns courses. "
                        "Reassign or remove those courses first."
                    )
                }
            ),
            409,
        )

    db.users.delete_one(
        {
            "id": instructor_id,
            "role": "instructor",
        }
    )

    return (
        jsonify(
            {
                "message": "Instructor removed successfully.",
                "id": instructor_id,
            }
        ),
        200,
    )


# =========================================================
# DELETE COURSE
# =========================================================


@admin_bp.delete("/courses/<course_id>")
@jwt_required()
@roles_required("admin")
def delete_course(course_id):
    course = db.courses.find_one({"id": course_id})

    if not course:
        return jsonify({"error": "Course not found."}), 404

    dependency_checks = [
        ("modules", {"course_id": course_id}),
        ("quizzes", {"course_id": course_id}),
        ("enrollments", {"course_id": course_id}),
    ]

    for collection_name, query in dependency_checks:
        collection = getattr(db, collection_name)

        if collection.find_one(query):
            return (
                jsonify(
                    {
                        "error": (
                            f"Cannot delete this course because related "
                            f"records exist in {collection_name}. "
                            "Remove or reassign those records first."
                        )
                    }
                ),
                409,
            )

    db.courses.delete_one({"id": course_id})

    return (
        jsonify(
            {
                "message": "Course deleted successfully.",
                "id": course_id,
            }
        ),
        200,
    )
