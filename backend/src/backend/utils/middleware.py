from functools import wraps
from flask import request
import jwt
from backend.utils.jwt_handler import verifying_token
from backend.database import users_collection

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return {"error": "Token is missing! Please login first."}, 401

        try:
            current_user_email =verifying_token(token)
            if not current_user_email:
                return {"error": "Invalid token payload"}, 401
            
        except jwt.ExpiredSignatureError:
            return {"error": "Token has expired! Please login again."}, 401
        except jwt.InvalidTokenError:
            return {"error": "Invalid token! Authentication failed."}, 401

        return f(current_user_email, *args, **kwargs)

    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user_email, *args, **kwargs):
            user = users_collection.find_one(
                {"email": current_user_email}
            )

            if not user:
                return {"error": "User not found"}, 404

            if user.get("role") not in allowed_roles:
                return {"error": "Permission denied"}, 403

            return f(current_user_email, *args, **kwargs)

        return decorated
    return decorator