from uuid import uuid4

from ..extensions import db

enrollments_collection = db.enrollments


def create_enrollment(enrollment_data):
    enrollment_data["id"] = str(uuid4())
    result = enrollments_collection.insert_one(enrollment_data)
    return result.inserted_id


def get_enrollment(student_id, course_id):
    return enrollments_collection.find_one(
        {"student_id": student_id, "course_id": course_id}
    )


def get_student_enrollments(student_id):
    return list(
        enrollments_collection.find({"student_id": student_id}, {"_id": 0}).sort(
            "enrolled_at", -1
        )
    )
