from ..extensions import db

COLLECTIONS = [
    "users",
    "courses",
    "modules",
    "lessons",
    "quizzes",
    "questions",
    "enrollments",
    "attempts",
    "progress",
    "certificates",
]


def create_collections():
    existing_collections = db.list_collection_names()

    for collection_name in COLLECTIONS:
        if collection_name not in existing_collections:
            db.create_collection(collection_name)

    print("All collections are ready.")
