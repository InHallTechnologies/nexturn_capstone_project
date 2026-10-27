from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, jsonify, request
from pymongo.errors import DuplicateKeyError
from werkzeug.exceptions import BadRequest

from ..repositories.user_repository import (
    create_user,
    get_user_by_email,
    get_user_by_id,
)
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)
from ..utils.security import verify_password
from ..utils.security import hash_password
from ..utils.authorization import roles_required
from ..utils.authorization import approved_instructor_required

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/register")
def register():
    # 1. Validate the request content type
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    # 2. Parse JSON
    try:
        data = request.json
    except BadRequest:
        return jsonify({"error": "Invalid JSON body."}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "JSON body must be an object."}), 400

    # 3. Extract fields
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    # 4. Validate required fields
    if not all(
        isinstance(value, str) and value.strip() for value in (name, email, password)
    ):
        return jsonify({"error": "Name, email and password are required."}), 400

    name = name.strip()
    email = email.strip().lower()

    if len(name) > 100:
        return jsonify({"error": "Name must not exceed 100 characters."}), 400

    if len(email) > 254 or email.count("@") != 1:
        return jsonify({"error": "Enter a valid email address."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400

    if len(password.encode("utf-8")) > 72:
        return jsonify({"error": "Password must not exceed 72 UTF-8 bytes."}), 400

    # 5. Check whether the email already exists
    if get_user_by_email(email):
        return jsonify({"error": "An account with this email already exists."}), 409

    # 6. Prepare the user document
    now = datetime.now(timezone.utc)

    user_data = {
        "id": str(uuid4()),
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "student",
        "profile": {"bio": "", "avatar": ""},
        "instructor_status": None,
        "created_at": now,
        "updated_at": now,
    }

    # 7. Save the user
    try:
        create_user(user_data)
    except DuplicateKeyError:
        return jsonify({"error": "An account with this email already exists."}), 409

    # 8. Return safe user information
    return (
        jsonify(
            {
                "message": "User registered successfully.",
                "user": {
                    "id": user_data["id"],
                    "name": user_data["name"],
                    "email": user_data["email"],
                    "role": user_data["role"],
                    "profile": user_data["profile"],
                    "instructor_status": user_data["instructor_status"],
                    "created_at": now.isoformat(),
                },
            }
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    try:
        data = request.json
    except BadRequest:
        return jsonify({"error": "Invalid JSON body."}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "JSON body must be an object."}), 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not email.strip():
        return jsonify({"error": "Email is required."}), 400

    if not isinstance(password, str) or not password:
        return jsonify({"error": "Password is required."}), 400

    email = email.strip().lower()

    user = get_user_by_email(email)

    # Use the same response for an unknown email
    # and an incorrect password.
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password."}), 401

    access_token = create_access_token(
        identity=user["id"], additional_claims={"role": user["role"]}
    )

    refresh_token = create_refresh_token(identity=user["id"])

    return (
        jsonify(
            {
                "message": "Login successful.",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                    "profile": user["profile"],
                    "instructor_status": user["instructor_status"],
                },
            }
        ),
        200,
    )


@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    return (
        jsonify(
            {
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                    "profile": user["profile"],
                    "instructor_status": user["instructor_status"],
                }
            }
        ),
        200,
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found."}), 404

    access_token = create_access_token(
        identity=user["id"], additional_claims={"role": user["role"]}
    )

    return jsonify({"access_token": access_token}), 200


@auth_bp.get("/admin-test")
@jwt_required()
@roles_required("admin")
def admin_test():
    return jsonify({"message": "Welcome, Admin!"}), 200


@auth_bp.post("/instructor-register")
def instructor_register():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json."}), 415

    try:
        data = request.json
    except BadRequest:
        return jsonify({"error": "Invalid JSON body."}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "JSON body must be an object."}), 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all(
        isinstance(value, str) and value.strip() for value in (name, email, password)
    ):
        return jsonify({"error": "Name, email and password are required."}), 400

    name = name.strip()
    email = email.strip().lower()

    if len(name) > 100:
        return jsonify({"error": "Name must not exceed 100 characters."}), 400

    if len(email) > 254 or email.count("@") != 1:
        return jsonify({"error": "Enter a valid email address."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400

    if len(password.encode("utf-8")) > 72:
        return jsonify({"error": "Password must not exceed 72 UTF-8 bytes."}), 400

    if get_user_by_email(email):
        return jsonify({"error": "An account with this email already exists."}), 409

    now = datetime.now(timezone.utc)

    user_data = {
        "id": str(uuid4()),
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "instructor",
        "profile": {"bio": "", "avatar": ""},
        "instructor_status": "pending",
        "created_at": now,
        "updated_at": now,
    }

    try:
        create_user(user_data)
    except DuplicateKeyError:
        return jsonify({"error": "An account with this email already exists."}), 409

    return (
        jsonify(
            {
                "message": "Instructor registration submitted successfully. Awaiting admin approval.",
                "user": {
                    "id": user_data["id"],
                    "name": user_data["name"],
                    "email": user_data["email"],
                    "role": user_data["role"],
                    "profile": user_data["profile"],
                    "instructor_status": user_data["instructor_status"],
                    "created_at": now.isoformat(),
                },
            }
        ),
        201,
    )


@auth_bp.get("/instructor-test")
@jwt_required()
@approved_instructor_required()
def instructor_test():
    return jsonify({"message": "Welcome, approved instructor!"}), 200
