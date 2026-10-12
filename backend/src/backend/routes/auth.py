from flask import Blueprint, request
from backend.database import users_collection
from backend.utils.jwt_handler import tokenizing
from backend.utils.password import hash_password,verify_password
from backend.models.user import create_user_document
from backend.schemas.user import validate_register,validate_login
from backend.utils.middleware import token_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/api/auth/register")
def handle_register():
    body=request.json
    result=validate_register(body)
    
    if not isinstance(result, dict):
        return result
    
    if users_collection.find_one({"email": result["email"]}):
        return {"error": "A user with this email already exists"}, 400
    
    hashed_password=hash_password(result["password"])
    
    user_data=create_user_document(result["name"],result["email"],hashed_password,result["role"])
    
    users_collection.insert_one(user_data)
    
    return {
        "message": f"user -- {result['name']} registered successfully"
            }, 201

@auth_bp.post("/api/auth/login")
def handle_login():
    body=request.json
    result=validate_login(body)
    if not isinstance(result, dict):
        return result
    
    user=users_collection.find_one({"email":result["email"]})
    
    if not user or not verify_password(user["password"],result["password"]):
        return {"error": "Invalid email or password"}, 401
    
    token=tokenizing(user["email"])
    
    return {
        "message": f"Welcome back, {user['name']}!",
        "token":token
    
    }, 200
    
@auth_bp.get("/api/auth/me")
@token_required
def get_current_user(current_user_email):
    user = users_collection.find_one({"email": current_user_email})

    if not user:
        return {"error": "User not found"}, 404

    return {
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }, 200

