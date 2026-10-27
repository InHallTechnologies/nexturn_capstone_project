from ..extensions import db

users_collection = db.users


def create_user(user_data):
    result = users_collection.insert_one(user_data)

    return result.inserted_id


def get_user_by_id(user_id):
    return users_collection.find_one({"id": user_id})


def get_user_by_email(email):
    return users_collection.find_one({"email": email})


def update_user(user_id, update_data):
    result = users_collection.update_one({"id": user_id}, {"$set": update_data})

    return result.modified_count > 0


def delete_user(user_id):
    result = users_collection.delete_one({"id": user_id})

    return result.deleted_count > 0
