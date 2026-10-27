from uuid import uuid4

from ..extensions import db

modules_collection = db.modules


def create_module(module_data):
    module_data["id"] = str(uuid4())
    result = modules_collection.insert_one(module_data)
    return result.inserted_id


def get_modules_by_course(course_id):
    return list(
        modules_collection.find({"course_id": course_id}, {"_id": 0}).sort("order", 1)
    )


def get_module_by_id(module_id):
    return modules_collection.find_one({"id": module_id})
