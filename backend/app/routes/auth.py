from flask import Blueprint, request, jsonify
from sqlalchemy import select
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from app import bcrypt, jwt_redis_blocklist
from app.database import get_session
from app.models.user import User
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
ACCESS_EXPIRES = 15 * 60

# REGISTER
@auth_bp.route("/register/", methods=["POST"])

def handle_register():
    data = request.get_json()
    session = get_session()
    required_fields = ["username", "email", "password", "phone"]

    for field in required_fields:
        if not data.get(field):
            session.close()
            return jsonify({
                "message": f"{field} is required"
            }), 400
    role = data.get("role", "seeker")

    if role not in ["owner", "seeker"]:
        session.close()
        return jsonify({
            "message": "Role must be either owner or seeker"
        }), 400


    existing_username = session.query(User).filter_by(
        username=data["username"]
    ).first()

    if existing_username:
        session.close()
        return jsonify({
            "message": "Username already exists"
        }), 409

    
    existing_email = session.query(User).filter_by(
        email=data["email"]
    ).first()

    if existing_email:
        session.close()
        return jsonify({
            "message": "Email already registered"
        }), 409

    
    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=bcrypt.generate_password_hash(
            data["password"]
        ).decode("utf-8"),
        role=role,
        phone=data["phone"],
        verified=False
    )
    session.add(user)
    session.commit()
    session.close()
    return jsonify({
        "message": "User registered successfully",
        "role": role
    }), 201
# LOGIN
@auth_bp.route("/login", methods=["POST"])
def handle_login():
    data = request.get_json()
    email = data["email"]
    password = data["password"]
    session = get_session()
    user = session.scalar(
        select(User).where(User.email == email)
    )
    if user is None:
        session.close()
        return jsonify(message="Invalid email or password"), 401
    if not bcrypt.check_password_hash(user.password_hash, password):
        session.close()
        return jsonify(message="Invalid email or password"), 401
    access_token = create_access_token(identity=user.email)
    refresh_token = create_refresh_token(identity=user.email)

    response = jsonify({
        "message": "Login successful",
        "user": {
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    })
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    session.close()
    return response, 200

# CURRENT USER
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def handle_me():
    current_user = get_jwt_identity()

    session = get_session()

    user = session.scalar(
        select(User).where(User.email == current_user)
    )

    if user is None:
        session.close()
        return jsonify(message="User not found"), 404

    result = {
        "username": user.username,
        "email": user.email,
        "role": user.role
    }

    session.close()

    return jsonify(result), 200


# REFRESH ACCESS TOKEN
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def handle_refresh():
    current_user = get_jwt_identity()

    new_access_token = create_access_token(identity=current_user)

    response = jsonify(message="Access token refreshed")
    set_access_cookies(response, new_access_token)

    return response, 200

# LOGOUT
@auth_bp.route("/logout", methods=["DELETE"])
@jwt_required()
def handle_logout():
    jti = get_jwt()["jti"]

    jwt_redis_blocklist.set(
        jti,
        "",
        ex=ACCESS_EXPIRES
    )

    response = jsonify(message="Access token revoked")
    unset_jwt_cookies(response)

    return response, 200
