from datetime import datetime, timezone
from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from common import (
    current_user,
    error,
    make_password_hash,
    password_matches,
    public_user,
    role_required,
)
from storage import collection, get, insert
auth_bp = Blueprint("auth", __name__, url_prefix="/api")
def tokens_for(user):
    claims = {"role": user["role"]}
    identity = str(user["id"])
    return {
        "access_token": create_access_token(identity=identity, additional_claims=claims),
        "refresh_token": create_refresh_token(identity=identity, additional_claims=claims),
        "user": public_user(user),
    }
@auth_bp.post("/auth/register")
def register():
    data = request.get_json() or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = data.get("role", "freelancer")
    if "@" not in email or len(password) < 8:
        return error("A valid email and a password of at least 8 characters are required", 400)
    if role not in ("freelancer", "client"):
        return error("Role must be freelancer or client", 400)
    if collection("users").find_one({"email": email}):
        return error("An account with that email already exists", 409)
    user = insert(
        "users",
        {
            "email": email,
            "password_hash": make_password_hash(password),
            "role": role,
            "business_name": str(data.get("business_name") or "My Studio").strip(),
        },
    )
    return {"user": public_user(user)}, 201
@auth_bp.post("/auth/login")
def login():
    data = request.get_json() or {}
    email = str(data.get("email", "")).strip().lower()
    user = collection("users").find_one({"email": email})

    if not user or not password_matches(str(data.get("password", "")), user["password_hash"]):
        return error("Invalid email or password", 401)
    return tokens_for(user)
@auth_bp.post("/auth/refresh")
@jwt_required(refresh=True)
def refresh():
    old_token = get_jwt()
    insert(
        "token_blocklist",
        {"jti": old_token["jti"], "created_at": datetime.now(timezone.utc)},
    )
    user = current_user()
    if not user:
        return error("Account not found", 401)
    claims = {"role": user["role"]}
    return {
        "access_token": create_access_token(
            identity=str(user["id"]), additional_claims=claims
        ),
        "refresh_token": create_refresh_token(
            identity=str(user["id"]), additional_claims=claims
        ),
    }
@auth_bp.post("/auth/logout")
@jwt_required()
def logout():
    token = get_jwt()
    if not collection("token_blocklist").find_one({"jti": token["jti"]}):
        insert("token_blocklist", {"jti": token["jti"], "created_at": datetime.now(timezone.utc)})
    data = request.get_json() or {}
    refresh_token = data.get("refresh_token")
    if refresh_token:
        try:
            decoded_refresh = decode_token(refresh_token)
            refresh_jti = decoded_refresh["jti"]
            if not collection("token_blocklist").find_one({"jti": refresh_jti}):
                insert(
                    "token_blocklist",
                    {"jti": refresh_jti, "created_at": datetime.now(timezone.utc)},
                )
        except Exception:
            return error("Invalid refresh token", 401)
    return {"message": "Logged out"}
@auth_bp.get("/auth/me")
@role_required("freelancer", "client")
def me():
    return {"user": public_user(current_user())}
