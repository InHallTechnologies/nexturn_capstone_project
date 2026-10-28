from datetime import timedelta

import redis
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager

from app.database import Base, engine
from flask_cors import CORS
import os
import redis
bcrypt = Bcrypt()
jwt = JWTManager()

 

jwt_redis_blocklist = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    db=0,
    decode_responses=True
)


@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jwt_redis_blocklist.get(jti) is not None


def create_app():
    app = Flask(__name__)
    @app.route("/", methods=["GET"])
    def home():
        return {
            "message": "Rental Property Management System API is running!",
            "status": "success"
        }, 200
    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:3000"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    app.config["JWT_SECRET_KEY"] = "I am JrNTR Fan"
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config["JWT_COOKIE_SECURE"] = False
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
    app.config["JWT_REFRESH_COOKIE_PATH"] = "/auth/refresh"
    app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token_cookie"
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False

    bcrypt.init_app(app)
    jwt.init_app(app)
    from app.database import Base, engine
    from app.models.user import User
    from app.models.property import Property
    from app.models.propertyImage import PropertyImage
    from app.models.favorite import Favorite
    from app.models.inquiry import Inquiry
    from app.routes.amenities import amenities_bp
    from app.models.review import Review
    from app.models.enquiry import Enquiry
    from app.models.enquiry_message import EnquiryMessage

    Base.metadata.create_all(bind=engine)
    
    from app.routes.auth import auth_bp
    from app.routes.property import properties_bp
    from app.routes.propertyImage import propertyimages_bp
    from app.routes.favorites import favorites_bp
    from app.routes.inquiry import inquiries_bp
    from app.routes.admin import admin_bp
    from app.routes.amenities import amenities_bp
    from app.routes.reviews import reviews_bp
    from app.routes.enquiry import enquiry_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(properties_bp)
    app.register_blueprint(propertyimages_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(inquiries_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(amenities_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(enquiry_bp)
    
    return app