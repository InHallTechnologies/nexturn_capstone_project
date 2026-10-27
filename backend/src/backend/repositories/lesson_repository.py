from uuid import uuid4

from ..extensions import db

lessons_collection = db.lessons


def create_lesson(lesson_data):
    lesson_data["id"] = str(uuid4())
    result = lessons_collection.insert_one(lesson_data)
    return result.inserted_id


def get_lesson_by_id(lesson_id):
    return lessons_collection.find_one({"id": lesson_id})


def get_lessons_by_module(module_id):
    return list(
        lessons_collection.find({"module_id": module_id}, {"_id": 0}).sort("order", 1)
    )
