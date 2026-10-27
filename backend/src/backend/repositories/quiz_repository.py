from uuid import uuid4

from ..extensions import db

quizzes_collection = db.quizzes


def create_quiz(quiz_data):
    quiz_data["id"] = str(uuid4())

    result = quizzes_collection.insert_one(quiz_data)

    return result.inserted_id


def get_quiz_by_id(quiz_id):
    return quizzes_collection.find_one({"id": quiz_id}, {"_id": 0})


def get_quizzes_by_course(course_id):
    return list(
        quizzes_collection.find({"course_id": course_id}, {"_id": 0}).sort(
            "created_at", -1
        )
    )
