from datetime import datetime, timezone
from uuid import uuid4

from ..extensions import db


def create_bookmark(student_id, course_id, module_id, lesson_id):
    now = datetime.now(timezone.utc)

    bookmark = {
        "id": str(uuid4()),
        "student_id": student_id,
        "course_id": course_id,
        "module_id": module_id,
        "lesson_id": lesson_id,
        "created_at": now,
    }

    db.bookmarks.insert_one(bookmark)

    # Remove MongoDB's automatically generated ObjectId.
    bookmark.pop("_id", None)

    return bookmark


def get_bookmark(student_id, lesson_id):
    return db.bookmarks.find_one(
        {
            "student_id": student_id,
            "lesson_id": lesson_id,
        },
        {
            "_id": 0,
        },
    )


def get_student_bookmarks(student_id, course_id=None):
    query = {
        "student_id": student_id,
    }

    if course_id:
        query["course_id"] = course_id

    return list(
        db.bookmarks.find(
            query,
            {
                "_id": 0,
            },
        ).sort("created_at", -1)
    )


def delete_bookmark(student_id, lesson_id):
    result = db.bookmarks.delete_one(
        {
            "student_id": student_id,
            "lesson_id": lesson_id,
        }
    )

    return result.deleted_count > 0
