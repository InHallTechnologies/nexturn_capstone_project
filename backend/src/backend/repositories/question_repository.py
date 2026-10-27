from uuid import uuid4

from ..extensions import db

questions_collection = db.questions


def create_question(question_data):
    question_data["id"] = str(uuid4())

    result = questions_collection.insert_one(question_data)

    return result.inserted_id


def get_question_by_id(question_id):
    return questions_collection.find_one({"id": question_id}, {"_id": 0})


def get_questions_by_quiz(quiz_id):
    return list(
        questions_collection.find({"quiz_id": quiz_id}, {"_id": 0}).sort("order", 1)
    )
