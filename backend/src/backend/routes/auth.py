from datetime import datetime, timezone

import jwt
from flask import Blueprint, request
from sqlalchemy.exc import IntegrityError
from backend.database import SessionLocal
from backend.utils.jwt_handler import decode_token, tokenizing
from backend.utils.password import hash_password, verify_password
from backend.models.user import User
from backend.models.token_blocklist import TokenBlocklist
from backend.schemas.user import validate_register,validate_login
from backend.utils.middleware import token_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/api/auth/register")
def handle_register():
    body=request.get_json(silent=True)
    result=validate_register(body)
    
    if isinstance(result, tuple):
        return result
    db=SessionLocal()
    
    try:
        existing_user = db.query(User).filter_by(email=result["email"]).first()

        if existing_user:
            return {"error": "A user with this email already exists"}, 409
    
        hashed_password=hash_password(result["password"])
    
        user_data = User(
            name=result["name"],
            email=result["email"],
            password=hashed_password,
            role="Staff",
        )
    
        db.add(user_data)
        db.commit()
        db.close()
    
        return {
            "message": f"user -- {result['name']} registered successfully"
                }, 201
    except Exception:
        db.rollback()
        raise
    
    finally:
        db.close()

@auth_bp.post("/api/auth/login")
def handle_login():
    body=request.get_json(silent=True)
    result=validate_login(body)
    if isinstance(result, tuple):
        return result

    db=SessionLocal()
    try:
        user=db.query(User).filter_by(email=result["email"]).first()
    
        if not user or not verify_password(user.password,result["password"]):
            return {"error": "Invalid email or password"}, 401

        token = tokenizing(user.email, user.role)
        refresh_token = tokenizing(user.email, user.role, "refresh")
    
        return {
            "message": f"Welcome back, {user.name}!",
            "token": token,
            "access_token": token,
            "refresh_token": refresh_token,
        }, 200
    finally:
        db.close()


@auth_bp.post("/api/auth/refresh")
def refresh_access_token():
    refresh_token = request.headers.get("Authorization", "")
    if refresh_token.startswith("Bearer "):
        refresh_token = refresh_token.split(" ", 1)[1].strip()
    else:
        body = request.get_json(silent=True)
        refresh_token = body.get("refresh_token") if isinstance(body, dict) else None

    if not refresh_token:
        return {"error": "Refresh token is required"}, 401

    try:
        payload = decode_token(refresh_token)
    except jwt.ExpiredSignatureError:
        return {"error": "Refresh token has expired"}, 401
    except jwt.InvalidTokenError:
        return {"error": "Invalid refresh token"}, 401

    if payload.get("type") != "refresh" or not payload.get("jti"):
        return {"error": "A refresh token is required"}, 401

    db = SessionLocal()
    try:
        if db.query(TokenBlocklist).filter_by(jti=payload["jti"]).first():
            return {"error": "Refresh token has been revoked"}, 401

        user = db.query(User).filter_by(email=payload.get("email")).first()
        if not user:
            return {"error": "User not found"}, 401

        access_token = tokenizing(user.email, user.role)
        rotated_refresh_token = tokenizing(user.email, user.role, "refresh")
        expires_at = datetime.fromtimestamp(payload["exp"], timezone.utc)
        db.add(
            TokenBlocklist(
                jti=payload["jti"],
                token_type="refresh",
                expires_at=expires_at,
            )
        )
        db.commit()
        return {
            "access_token": access_token,
            "refresh_token": rotated_refresh_token,
            "token": access_token,
        }, 200
    except IntegrityError:
        db.rollback()
        return {"error": "Refresh token has already been used"}, 401
    finally:
        db.close()


@auth_bp.post("/api/auth/logout")
def logout():
    body = request.get_json(silent=True)
    supplied_refresh = body.get("refresh_token") if isinstance(body, dict) else None
    authorization = request.headers.get("Authorization", "")
    access_token = (
        authorization.split(" ", 1)[1].strip()
        if authorization.startswith("Bearer ")
        else None
    )
    tokens = [token for token in (access_token, supplied_refresh) if token]

    if not tokens:
        return {"error": "An access or refresh token is required"}, 401

    db = SessionLocal()
    try:
        seen_jtis = set()
        for token in tokens:
            try:
                payload = decode_token(token)
            except jwt.ExpiredSignatureError:
                continue
            except jwt.InvalidTokenError:
                return {"error": "Invalid token"}, 401

            jti = payload.get("jti")
            token_type = payload.get("type")
            if not jti or token_type not in {"access", "refresh"}:
                return {"error": "Invalid token payload"}, 401

            if (
                jti not in seen_jtis
                and not db.query(TokenBlocklist).filter_by(jti=jti).first()
            ):
                expires_at = datetime.fromtimestamp(payload["exp"], timezone.utc)
                db.add(
                    TokenBlocklist(
                        jti=jti,
                        token_type=token_type,
                        expires_at=expires_at,
                    )
                )
                seen_jtis.add(jti)

        db.commit()
        return {"message": "Logged out successfully"}, 200
    except IntegrityError:
        db.rollback()
        return {"message": "Logged out successfully"}, 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        
    
@auth_bp.get("/api/auth/me")
@token_required
def get_current_user(current_user_email):
    db=SessionLocal()
    try:
        user=db.query(User).filter_by(email=current_user_email).first()

        if not user:
            return {"error": "User not found"}, 404

        return {
            "name": user.name,
            "email": user.email,
            "role": user.role
        }, 200
    
    finally:
        db.close()
