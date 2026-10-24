from functools import wraps
from flask import request
import jwt
from backend.utils.jwt_handler import decode_token
from backend.models.user import User
from backend.models.token_blocklist import TokenBlocklist
from backend.database import SessionLocal

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return {"error": "Token is missing! Please login first."}, 401

        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return {"error": "Token is missing! Please login first."}, 401

        try:
            payload = decode_token(token)
            current_user_email = payload.get("email")
            if not current_user_email:
                return {"error": "Invalid token payload"}, 401
        except jwt.ExpiredSignatureError:
            return {"error": "Token has expired! Please login again."}, 401
        except jwt.InvalidTokenError:
            return {"error": "Invalid token! Authentication failed."}, 401

        if payload.get("type") != "access" or not payload.get("jti"):
            return {"error": "An access token is required."}, 401

        db = SessionLocal()
        try:
            if db.query(TokenBlocklist).filter_by(jti=payload["jti"]).first():
                return {"error": "Token has been revoked."}, 401
        finally:
            db.close()

        return f(current_user_email, *args, **kwargs)

    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user_email, *args, **kwargs):
            db=SessionLocal()
            try:
                user = (db.query(User).filter_by(email=current_user_email).first())

                if not user:
                    return {"error": "User not found"}, 404

                if user.role not in allowed_roles:
                    return {"error": "Permission denied"}, 403

                return f(current_user_email, *args, **kwargs)

            finally:
                db.close()

        return decorated

    return decorator
