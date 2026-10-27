from uuid import uuid4

from ..extensions import db

courses_collection = db.courses


def create_course(course_data):
    course_data["id"] = str(uuid4())
    result = courses_collection.insert_one(course_data)
    return result.inserted_id


def get_course_by_id(course_id):
    return courses_collection.find_one({"id": course_id})


def get_courses_by_instructor(instructor_id):
    return list(
        courses_collection.find({"instructor_id": instructor_id}, {"_id": 0}).sort(
            "created_at", -1
        )
    )
