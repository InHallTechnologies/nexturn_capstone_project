from ..extensions import db


def create_indexes():

    # USERS

    db.users.create_index("id", unique=True)

    db.users.create_index("email", unique=True)

    # COURSES

    db.courses.create_index("id", unique=True)

    db.courses.create_index("instructor_id")

    db.courses.create_index("status")

    # MODULES

    db.modules.create_index("id", unique=True)

    db.modules.create_index("course_id")

    db.modules.create_index([("course_id", 1), ("order", 1)])

    # LESSONS

    db.lessons.create_index("id", unique=True)

    db.lessons.create_index("module_id")

    db.lessons.create_index([("module_id", 1), ("order", 1)])

    # QUIZZES

    db.quizzes.create_index("id", unique=True)

    db.quizzes.create_index("course_id")

    db.quizzes.create_index("lesson_id")

    # QUESTIONS

    db.questions.create_index("id", unique=True)

    db.questions.create_index("quiz_id")

    db.questions.create_index([("quiz_id", 1), ("order", 1)])

    # ENROLLMENTS

    db.enrollments.create_index("id", unique=True)

    db.enrollments.create_index("student_id")

    db.enrollments.create_index("course_id")

    db.enrollments.create_index([("student_id", 1), ("course_id", 1)], unique=True)

    # ATTEMPTS

    db.attempts.create_index("id", unique=True)

    db.attempts.create_index("student_id")

    db.attempts.create_index("quiz_id")

    db.attempts.create_index([("student_id", 1), ("quiz_id", 1)])

    # PROGRESS

    db.progress.create_index("id", unique=True)

    db.progress.create_index("student_id")

    db.progress.create_index("course_id")

    db.progress.create_index("lesson_id")

    db.progress.create_index(
        [("student_id", 1), ("course_id", 1), ("lesson_id", 1)], unique=True
    )

    # CERTIFICATES

    db.certificates.create_index("id", unique=True)

    db.certificates.create_index("certificate_id", unique=True)

    db.certificates.create_index("student_id")

    db.certificates.create_index("course_id")

    db.certificates.create_index([("student_id", 1), ("course_id", 1)], unique=True)

    print("All indexes are ready.")
