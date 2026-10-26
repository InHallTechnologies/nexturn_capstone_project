"""Shared validation, pagination and response helpers."""
import re
from datetime import datetime, timezone
from bson import ObjectId
from flask import abort, jsonify, request


def now():
    return datetime.now(timezone.utc)


def oid(value):
    if not isinstance(value, (str, ObjectId)) or not ObjectId.is_valid(value):
        abort(400, 'Invalid record ID.')
    return ObjectId(value)


def body():
    value = request.get_json(silent=True)
    if not isinstance(value, dict):
        abort(400, 'A JSON object is required.')
    return value


def text(data, key, minimum=1, maximum=200):
    value = data.get(key)
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        abort(400, f'{key} must contain {minimum}–{maximum} characters.')
    return value.strip()


def integer(value, name, minimum=0, maximum=10000000):
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        abort(400, f'{name} must be an integer between {minimum} and {maximum}.')
    return value


def boolean(data, key):
    if not isinstance(data.get(key), bool):
        abort(400, f'{key} must be true or false.')
    return data[key]


def page():
    try:
        number = min(1000000, max(1, int(request.args.get('page', 1))))
        size = min(50, max(1, int(request.args.get('limit', 12))))
    except ValueError:
        abort(400, 'Invalid pagination.')
    return number, size


def ok(data=None, status=200):
    return jsonify(data=data, error=None), status


def listing(collection, query, transform=lambda x: x, sort=None):
    number, size = page()
    records = collection.find(query).sort(sort or [('created_at', -1)]).skip((number - 1) * size).limit(size)
    return ok({'items': [transform(row) for row in records], 'total': collection.count_documents(query), 'page': number, 'limit': size})


def user_view(user):
    return {key: user[key] for key in ('_id', 'name', 'email', 'role', 'active')}


def email(data):
    value = text(data, 'email', maximum=254).lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
        abort(400, 'Enter a valid email address.')
    return value


