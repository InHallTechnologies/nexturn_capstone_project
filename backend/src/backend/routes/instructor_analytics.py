from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..utils.authorization import approved_instructor_required

instructor_analytics_bp = Blueprint(
    "instructor_analytics",
    __name__,
    url_prefix="/instructor",
)


@instructor_analytics_bp.get("/analytics")
@jwt_required()
@approved_instructor_required()
def get_instructor_analytics():
    instructor_id = get_jwt_identity()

    # Only fetch courses owned by the logged-in instructor.
    courses = list(
        db.courses.find(
            {"instructor_id": instructor_id},
            {"_id": 0, "id": 1, "title": 1, "status": 1},
        )
    )

    course_ids = [course["id"] for course in courses]

    # Initialise totals. This also handles instructors with no courses.
    total_enrollments = 0
    completed_enrollments = 0
    total_quizzes = 0
    total_attempts = 0
    submitted_attempts = 0
    all_scores = []
    course_analytics = []

    for course in courses:
        course_id = course["id"]

        # Enrollment statistics for this course.
        course_enrollments = db.enrollments.count_documents({"course_id": course_id})
        course_completed = db.enrollments.count_documents(
            {"course_id": course_id, "status": "completed"}
        )

        # Quiz statistics for this course.
        quizzes = list(
            db.quizzes.find(
                {"course_id": course_id},
                {"_id": 0, "id": 1, "title": 1, "status": 1},
            )
        )
        quiz_ids = [quiz["id"] for quiz in quizzes]

        # Attempts are restricted to quizzes belonging to this course.
        course_attempts = list(
            db.attempts.find(
                {"course_id": course_id},
                {
                    "_id": 0,
                    "status": 1,
                    "score": 1,
                    "percentage": 1,
                },
            )
        )

        course_submitted = [
            attempt
            for attempt in course_attempts
            if attempt.get("status") == "submitted"
        ]

        # Use the stored percentage when available.
        course_scores = [
            attempt["percentage"]
            for attempt in course_submitted
            if isinstance(attempt.get("percentage"), (int, float))
        ]

        average_score = (
            round(sum(course_scores) / len(course_scores), 2) if course_scores else None
        )

        total_enrollments += course_enrollments
        completed_enrollments += course_completed
        total_quizzes += len(quizzes)
        total_attempts += len(course_attempts)
        submitted_attempts += len(course_submitted)
        all_scores.extend(course_scores)

        course_analytics.append(
            {
                "course_id": course_id,
                "title": course.get("title"),
                "status": course.get("status"),
                "enrollments": {
                    "total": course_enrollments,
                    "completed": course_completed,
                },
                "quizzes": {
                    "total": len(quizzes),
                    "published": sum(
                        1 for quiz in quizzes if quiz.get("status") == "published"
                    ),
                },
                "attempts": {
                    "total": len(course_attempts),
                    "submitted": len(course_submitted),
                },
                "average_score": average_score,
            }
        )

    average_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else None

    return (
        jsonify(
            {
                "courses": {
                    "total": len(courses),
                    "published": sum(
                        1 for course in courses if course.get("status") == "published"
                    ),
                    "draft": sum(
                        1 for course in courses if course.get("status") == "draft"
                    ),
                    "pending_review": sum(
                        1
                        for course in courses
                        if course.get("status") == "pending_review"
                    ),
                    "rejected": sum(
                        1 for course in courses if course.get("status") == "rejected"
                    ),
                },
                "enrollments": {
                    "total": total_enrollments,
                    "completed": completed_enrollments,
                },
                "quizzes": {
                    "total": total_quizzes,
                },
                "attempts": {
                    "total": total_attempts,
                    "submitted": submitted_attempts,
                },
                "average_score": average_score,
                "per_course": course_analytics,
            }
        ),
        200,
    )


@instructor_analytics_bp.get("/courses/<course_id>/students")
@jwt_required()
@approved_instructor_required()
def get_course_student_performance(course_id):
    instructor_id = get_jwt_identity()

    # Verify that the logged-in instructor owns this course.
    course = db.courses.find_one(
        {
            "id": course_id,
            "instructor_id": instructor_id,
        }
    )

    if not course:
        return (
            jsonify({"error": "Course not found or you do not own this course."}),
            404,
        )

    enrollments = list(
        db.enrollments.find(
            {"course_id": course_id},
            {
                "_id": 0,
                "student_id": 1,
                "status": 1,
                "enrolled_at": 1,
                "completed_at": 1,
            },
        )
    )

    modules = list(
        db.modules.find(
            {"course_id": course_id},
            {"_id": 0, "id": 1, "title": 1, "order": 1},
        ).sort("order", 1)
    )

    module_ids = [module["id"] for module in modules]

    lessons = (
        list(
            db.lessons.find(
                {"module_id": {"$in": module_ids}},
                {
                    "_id": 0,
                    "id": 1,
                    "module_id": 1,
                    "title": 1,
                    "order": 1,
                },
            ).sort("order", 1)
        )
        if module_ids
        else []
    )

    lessons_by_module = {}
    for lesson in lessons:
        lessons_by_module.setdefault(lesson["module_id"], []).append(lesson)

    quizzes = list(
        db.quizzes.find(
            {"course_id": course_id},
            {"_id": 0, "id": 1, "title": 1},
        )
    )
    quiz_titles = {quiz["id"]: quiz.get("title", "Quiz") for quiz in quizzes}

    students = []

    for enrollment in enrollments:
        student_id = enrollment["student_id"]

        student = db.users.find_one(
            {"id": student_id, "role": "student"},
            {"_id": 0, "id": 1, "name": 1, "email": 1},
        )

        if not student:
            continue

        progress_records = list(
            db.progress.find(
                {
                    "student_id": student_id,
                    "course_id": course_id,
                },
                {
                    "_id": 0,
                    "lesson_id": 1,
                    "status": 1,
                    "completed_at": 1,
                    "updated_at": 1,
                },
            )
        )

        progress_by_lesson = {
            record["lesson_id"]: record
            for record in progress_records
            if record.get("lesson_id")
        }

        learning_track = []
        completed_lessons = 0
        current_lesson = None

        for module in modules:
            module_lessons = []

            for lesson in lessons_by_module.get(module["id"], []):
                record = progress_by_lesson.get(lesson["id"], {})
                is_completed = record.get("status") == "completed"

                if is_completed:
                    completed_lessons += 1

                lesson_status = (
                    "completed"
                    if is_completed
                    else "in_progress" if record else "not_started"
                )

                lesson_info = {
                    "id": lesson["id"],
                    "title": lesson.get("title", "Untitled lesson"),
                    "status": lesson_status,
                    "completed_at": record.get("completed_at"),
                    "updated_at": record.get("updated_at"),
                }

                # Datetimes should be JSON serialisable.
                for field in ("completed_at", "updated_at"):
                    value = lesson_info[field]
                    if hasattr(value, "isoformat"):
                        lesson_info[field] = value.isoformat()

                module_lessons.append(lesson_info)

                if current_lesson is None and not is_completed:
                    current_lesson = {
                        "module_title": module.get("title", "Module"),
                        "lesson_id": lesson["id"],
                        "lesson_title": lesson.get("title", "Untitled lesson"),
                        "status": lesson_status,
                    }

            learning_track.append(
                {
                    "module_id": module["id"],
                    "module_title": module.get("title", "Module"),
                    "lessons": module_lessons,
                }
            )

        total_lessons = len(lessons)
        completion_percentage = (
            round(completed_lessons / total_lessons * 100, 2) if total_lessons else 0
        )

        attempts = list(
            db.attempts.find(
                {
                    "student_id": student_id,
                    "course_id": course_id,
                },
                {
                    "_id": 0,
                    "id": 1,
                    "quiz_id": 1,
                    "status": 1,
                    "score": 1,
                    "total_questions": 1,
                    "percentage": 1,
                    "submitted_at": 1,
                },
            ).sort("submitted_at", -1)
        )

        for attempt in attempts:
            attempt["quiz_title"] = quiz_titles.get(attempt.get("quiz_id"), "Quiz")
            submitted_at = attempt.get("submitted_at")
            if hasattr(submitted_at, "isoformat"):
                attempt["submitted_at"] = submitted_at.isoformat()

        submitted_attempts = [
            attempt for attempt in attempts if attempt.get("status") == "submitted"
        ]

        scores = [
            attempt["percentage"]
            for attempt in submitted_attempts
            if isinstance(attempt.get("percentage"), (int, float))
        ]

        average_score = round(sum(scores) / len(scores), 2) if scores else None

        if total_lessons and completed_lessons == total_lessons:
            current_lesson = {
                "module_title": None,
                "lesson_id": None,
                "lesson_title": "Course completed",
                "status": "completed",
            }

        students.append(
            {
                "id": student["id"],
                "name": student.get("name", ""),
                "email": student.get("email", ""),
                "enrollment_status": enrollment.get("status"),
                "enrolled_at": (
                    enrollment["enrolled_at"].isoformat()
                    if hasattr(enrollment.get("enrolled_at"), "isoformat")
                    else enrollment.get("enrolled_at")
                ),
                "completed_lessons": completed_lessons,
                "total_lessons": total_lessons,
                "completion_percentage": completion_percentage,
                "current_lesson": current_lesson,
                "learning_track": learning_track,
                "quiz_attempts": attempts,
                "submitted_quizzes": len(submitted_attempts),
                "average_quiz_score": average_score,
            }
        )

    return (
        jsonify(
            {
                "course_id": course_id,
                "course_title": course.get("title", ""),
                "total_students": len(students),
                "students": students,
            }
        ),
        200,
    )
