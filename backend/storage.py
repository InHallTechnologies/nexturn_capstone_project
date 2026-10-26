import os
import uuid
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv
from flask import request
from pymongo import ASCENDING, MongoClient
environment_file = Path("/app/project.env")
if not environment_file.is_file():
    environment_file = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(environment_file)
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_database = os.getenv("MONGO_DB", "freelance_tracker")
mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
database = mongo_client[mongo_database]
def clone(value):
    if isinstance(value, dict):
        return {key: clone(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clone(item) for item in value]
    if isinstance(value, tuple):
        return tuple(clone(item) for item in value)
    if isinstance(value, set):
        return {clone(item) for item in value}
    return value
def collection(name):
    return database[name]
def insert(name, document):
    saved = clone(document)
    saved.setdefault("id", str(uuid.uuid4()))
    collection(name).insert_one(saved)
    return saved
def identifier_values(identifier):
    values = [str(identifier)]
    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        numeric = int(identifier)
        if numeric not in values:
            values.append(numeric)
    return values
def get(name, identifier):
    return collection(name).find_one({"id": {"$in": identifier_values(identifier)}})
def update(name, identifier, changes):
    collection(name).update_one({"id": {"$in": identifier_values(identifier)}}, {"$set": changes})
    return get(name, identifier)
def remove(name, identifier):
    collection(name).delete_one({"id": {"$in": identifier_values(identifier)}})
def clean(value):
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items() if key != "_id"}
    if isinstance(value, list):
        return [clean(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value
def output(document):
    return clean(clone(document))
def page(items, sort, order, allowed_sorts=None):
    if allowed_sorts is not None and sort not in allowed_sorts:
        return None, ({"error": "Unsupported sort field"}, 400)
    if order not in ("asc", "desc"):
        return None, ({"error": "order must be asc or desc"}, 400)
    def sort_key(item):
        value = item.get(sort)
        if isinstance(value, (datetime, date)):
            return (1, value.isoformat())
        if value is None:
            return (0, "")
        if isinstance(value, (int, float)):
            return (2, float(value))
        return (1, str(value))
    items.sort(key=sort_key, reverse=order == "desc")
    try:
        current_page = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    except ValueError:
        return None, ({"error": "page and per_page must be integers"}, 400)
    start = (current_page - 1) * per_page
    selected = items[start : start + per_page]
    total = len(items)
    pages = (total + per_page - 1) // per_page
    return {
        "items": [output(item) for item in selected],
        "page": current_page,
        "per_page": per_page,
        "total": total,
        "pages": pages,
    }, None
def initialize_indexes():
    collection("users").create_index("email", unique=True)
    collection("projects").update_many(
        {"workflow_status": "completed", "status": {"$ne": "closed"}},
        {"$set": {"status": "closed"}},
    )
    code_collection = collection("project_post_codes")
    for index in code_collection.list_indexes():
        if index["name"] != "_id_" and list(index["key"].items()) == [("code_hash", 1)]:
            code_collection.drop_index(index["name"])
    code_collection.create_index("project_code", unique=True, sparse=True)
    collection("invoices").create_index("number", unique=True)
    collection("invoices").create_index([("client_id", ASCENDING)])
    collection("projects").create_index([("client_id", ASCENDING)])
    collection("time_entries").create_index([("project_id", ASCENDING)])
    collection("token_blocklist").create_index("jti", unique=True)
