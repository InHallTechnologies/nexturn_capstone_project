from datetime import timedelta

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import JWT_SECRET_KEY
from .extensions import db
from .routes.auth import auth_bp
from .routes.admin import admin_bp
from .routes.courses import courses_bp
from .routes.modules import modules_bp
from .routes.lessons import lessons_bp
from .routes.enrollments import enrollments_bp
from .routes.progress import progress_bp
from .routes.quizzes import quizzes_bp
from .routes.questions import questions_bp
from .routes.attempts import attempts_bp
from .routes.certificates import certificates_bp
from .routes.instructor_analytics import instructor_analytics_bp
from .routes.bulk_upload import bulk_upload_bp
from .routes.student_learning_routes import student_learning_bp
from .routes.bookmark_routes import bookmarks_bp

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

jwt = JWTManager(app)
CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    supports_credentials=False,
)

app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(modules_bp)
app.register_blueprint(lessons_bp)
app.register_blueprint(enrollments_bp)
app.register_blueprint(progress_bp)
app.register_blueprint(quizzes_bp)
app.register_blueprint(questions_bp)
app.register_blueprint(attempts_bp)
app.register_blueprint(certificates_bp)
app.register_blueprint(instructor_analytics_bp)
app.register_blueprint(bulk_upload_bp)
app.register_blueprint(student_learning_bp)
app.register_blueprint(bookmarks_bp)


@app.get("/")
def handle_home():
    return "app working"


@app.get("/health")
def handle_health():
    try:
        db.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "error", "message": "Database connection failed."}, 500


if __name__ == "__main__":
    app.run(debug=True, port=8000)
