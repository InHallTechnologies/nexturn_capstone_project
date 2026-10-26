import os
from datetime import timedelta
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from routes.auth import auth_bp
from routes.freelancer import freelancer_bp
from routes.portal import portal_bp
from storage import collection, initialize_indexes
def create_app():
    jwt_secret_key = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY must be set in the project .env file")
    application = Flask(__name__)
    application.config.update(
        JWT_SECRET_KEY=jwt_secret_key,
        JWT_TOKEN_LOCATION=["headers"],
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=20),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=14),
    )
    CORS(
        application,
        resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")}},
    )
    jwt = JWTManager(application)
    @jwt.token_in_blocklist_loader
    def token_in_blocklist(_header, payload):
        return collection("token_blocklist").find_one({"jti": payload["jti"]}) is not None
    application.register_blueprint(auth_bp)
    application.register_blueprint(freelancer_bp)
    application.register_blueprint(portal_bp)
    @application.get("/api")
    def api_root():
        return {"service": "BillYourTime API", "status": "ok"}
    @application.errorhandler(404)
    def not_found(_error):
        return {"error": "Route not found"}, 404
    @application.errorhandler(405)
    def method_not_allowed(_error):
        return {"error": "Method not allowed"}, 405
    @application.errorhandler(500)
    def internal_error(_error):
        return {"error": "The server could not complete that request. Please try again."}, 500
    @application.errorhandler(400)
    def bad_request(_error):
        return {"error": "Invalid request"}, 400
    initialize_indexes()
    return application
app = create_app()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)