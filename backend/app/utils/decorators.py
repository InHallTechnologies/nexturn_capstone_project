from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_session
from app.models.user import User
def role_required(*allowed_roles):
    def decorator(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user = get_jwt_identity()

            session = get_session()
            user = session.query(User).filter_by(
                email=current_user).first()
            

            if user is None:
                session.close()
                return jsonify({"message": "User not found"}), 404

            if user.role not in allowed_roles:
                session.close()
                return jsonify({
                    "message": "Access forbidden",
                    "required_roles": list(allowed_roles)
                }), 403
            
            

            session.close()
            return func(*args, **kwargs)
        return wrapper
    return decorator