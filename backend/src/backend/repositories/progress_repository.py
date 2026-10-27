from uuid import uuid4

from ..extensions import db

progress_collection = db.progress


def create_progress(progress_data):
    progress_data["id"] = str(uuid4())
    result = progress_collection.insert_one(progress_data)
    return result.inserted_id


def get_lesson_progress(student_id, course_id, lesson_id):
    return progress_collection.find_one(
        {"student_id": student_id, "course_id": course_id, "lesson_id": lesson_id}
    )


def get_course_progress(student_id, course_id):
    return list(
        progress_collection.find(
            {"student_id": student_id, "course_id": course_id}, {"_id": 0}
        ).sort("updated_at", -1)
    )
