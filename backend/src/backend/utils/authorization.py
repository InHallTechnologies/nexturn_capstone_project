from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity
from ..extensions import db


def roles_required(*allowed_roles):
    def decorator(view_function):
        @wraps(view_function)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in allowed_roles:
                return (
                    jsonify(
                        {"error": "You do not have permission to access this resource."}
                    ),
                    403,
                )

            return view_function(*args, **kwargs)

        return wrapper

    return decorator


def approved_instructor_required():
    def decorator(view_function):
        @wraps(view_function)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()

            user = db.users.find_one(
                {"id": user_id},
                {
                    "_id": 0,
                    "role": 1,
                    "instructor_status": 1,
                },
            )

            if not user:
                return jsonify({"error": "User account not found."}), 401

            if user.get("role") != "instructor":
                return (
                    jsonify({"error": "Only instructors can access this resource."}),
                    403,
                )

            if user.get("instructor_status") != "approved":
                return (
                    jsonify({"error": "Your instructor account is not approved."}),
                    403,
                )

            return view_function(*args, **kwargs)

        return wrapper

    return decorator
