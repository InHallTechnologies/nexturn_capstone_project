from uuid import uuid4

from ..extensions import db

attempts_collection = db.attempts


def create_attempt(attempt_data):
    attempt_data["id"] = str(uuid4())
    result = attempts_collection.insert_one(attempt_data)
    return result.inserted_id


def get_attempt_by_id(attempt_id):
    return attempts_collection.find_one({"id": attempt_id}, {"_id": 0})


def get_student_attempts(student_id, quiz_id):
    return list(
        attempts_collection.find(
            {"student_id": student_id, "quiz_id": quiz_id}, {"_id": 0}
        ).sort("started_at", -1)
    )
