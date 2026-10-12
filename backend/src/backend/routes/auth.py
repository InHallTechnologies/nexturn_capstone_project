from flask import Blueprint, request
from backend.database1 import SessionLocal
from backend.utils.jwt_handler import tokenizing
from backend.utils.password import hash_password,verify_password
from backend.models.user import User
from backend.schemas.user import validate_register,validate_login
from backend.utils.middleware import token_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/api/auth/register")
def handle_register():
    body=request.json
    result=validate_register(body)
    
    if not isinstance(result, dict):
        return result
    db=SessionLocal()
    
    try:
        existing_user = db.query(User).filter_by(
            email=result["email"]
        ).first()

        if existing_user:
            return {"error": "A user with this email already exists"}, 409
    
        hashed_password=hash_password(result["password"])
    
        user_data = User(name=result["name"],email=result["email"],password=hashed_password,role=result["role"])
    
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
    body=request.json
    result=validate_login(body)
    if not isinstance(result, dict):
        return result
    db=SessionLocal()
    try:
        user=db.query(User).filter_by(email=result["email"]).first()
    
        if not user or not verify_password(user.password,result["password"]):
            return {"error": "Invalid email or password"}, 401
    
        token=tokenizing(user.email)
    
        return {
            "message": f"Welcome back, {user.name}!",
            "token":token
    
        }, 200
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
