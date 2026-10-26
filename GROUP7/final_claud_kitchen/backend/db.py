"""MongoDB connection and database-enforced integrity rules."""
import atexit
import secrets
from contextlib import contextmanager
from datetime import timedelta
from flask import abort
from pymongo import ReturnDocument
from common import now
from flask import current_app
from pymongo import MongoClient


def init_db(app):
    client = MongoClient(app.config['MONGODB_URI'], serverSelectionTimeoutMS=3000, connectTimeoutMS=3000, socketTimeoutMS=5000, tz_aware=True)
    app.extensions['mongo_client'] = client
    app.extensions['mongo_db'] = client[app.config['MONGODB_DB']]
    atexit.register(client.close)
    with app.app_context():
        initialize_schema()


def get_db():
    return current_app.extensions['mongo_db']


def initialize_schema():
    db = get_db()
    schemas = {
        'users': (['email', 'name', 'password_hash', 'role', 'active', 'created_at'], {
            'email': {'bsonType': 'string'}, 'name': {'bsonType': 'string'}, 'password_hash': {'bsonType': 'string'},
            'role': {'enum': ['customer', 'kitchen', 'delivery', 'admin']}, 'active': {'bsonType': 'bool'}, 'created_at': {'bsonType': 'date'}}),
        'menu': (['name', 'category', 'price', 'veg', 'available'], {
            'name': {'bsonType': 'string'}, 'category': {'bsonType': 'string'}, 'price': {'bsonType': 'int', 'minimum': 1},
            'veg': {'bsonType': 'bool'}, 'available': {'bsonType': 'bool'}}),
        'addresses': (['user_id', 'label', 'line', 'phone'], {
            'user_id': {'bsonType': 'objectId'}, 'label': {'bsonType': 'string'},
            'line': {'bsonType': 'string'}, 'phone': {'bsonType': 'string'}}),
        'carts': (['items', 'version'], {'items': {'bsonType': 'array', 'maxItems': 40, 'items': {
            'bsonType': 'object', 'required': ['item_id', 'quantity'], 'properties': {
                'item_id': {'bsonType': 'objectId'}, 'quantity': {'bsonType': 'int', 'minimum': 1, 'maximum': 20}}}},
            'version': {'bsonType': 'int', 'minimum': 0}}),
        'orders': (['customer_id', 'status', 'items', 'total', 'history', 'key', 'active_delivery', 'cart_version', 'created_at'], {
            'customer_id': {'bsonType': 'objectId'},
            'status': {'enum': ['Placed', 'Accepted', 'Preparing', 'Ready', 'Picked Up', 'Delivered', 'Cancelled', 'Rejected']},
            'items': {'bsonType': 'array', 'minItems': 1, 'maxItems': 40, 'items': {'bsonType': 'object',
                'required': ['item_id', 'name', 'unit_price', 'quantity'], 'properties': {
                    'item_id': {'bsonType': 'objectId'}, 'name': {'bsonType': 'string'},
                    'unit_price': {'bsonType': 'int', 'minimum': 1}, 'quantity': {'bsonType': 'int', 'minimum': 1, 'maximum': 20}}}},
            'total': {'bsonType': 'int', 'minimum': 1}, 'cart_version': {'bsonType': 'int', 'minimum': 0},
            'key': {'bsonType': 'string', 'minLength': 16, 'maxLength': 100}, 'created_at': {'bsonType': 'date'},
            'history': {'bsonType': 'array', 'minItems': 1, 'items': {'bsonType': 'object', 'required': ['status', 'at', 'actor_id', 'role'],
                'properties': {'status': {'bsonType': 'string'}, 'at': {'bsonType': 'date'}, 'actor_id': {'bsonType': 'objectId'}}}},
            'active_delivery': {'bsonType': 'bool'}, 'agent_id': {'bsonType': 'objectId'},
            'otp_attempts': {'bsonType': 'int', 'minimum': 0, 'maximum': 5}}),
        'ratings': (['order_id', 'customer_id', 'score', 'review'], {
            'order_id': {'bsonType': 'objectId'}, 'score': {'bsonType': 'int', 'minimum': 1, 'maximum': 5}}),
        'sessions': (['user_id', 'refresh_hash', 'revoked', 'expires_at'], {
            'user_id': {'bsonType': 'objectId'}, 'revoked': {'bsonType': 'bool'}, 'expires_at': {'bsonType': 'date'}}),
        'rate_limits': (['expires_at', 'count'], {'expires_at': {'bsonType': 'date'}}),
    }
    existing = set(db.list_collection_names())
    for name, (required, properties) in schemas.items():
        validator = {'$jsonSchema': {'bsonType': 'object', 'required': required, 'properties': properties}}
        if name not in existing:
            db.create_collection(name, validator=validator)
        else:
            db.command('collMod', name, validator=validator, validationLevel='strict')
    db.users.create_index('email', unique=True)
    db.menu.create_index('name', unique=True)
    db.menu.create_index([('available', 1), ('category', 1)])
    db.addresses.create_index('user_id')
    db.addresses.create_index([('user_id', 1), ('label', 1)], unique=True)
    db.orders.create_index([('customer_id', 1), ('key', 1)], unique=True)
    db.orders.create_index([('customer_id', 1), ('cart_version', 1)], unique=True)
    db.orders.create_index('agent_id', unique=True, partialFilterExpression={'active_delivery': True}, name='one_active_order_per_agent')
    db.orders.create_index([('status', 1), ('created_at', -1)])
    db.orders.create_index([('agent_id', 1), ('created_at', -1)])
    db.ratings.create_index('order_id', unique=True)
    db.ratings.create_index('item_ids')
    db.sessions.create_index('expires_at', expireAfterSeconds=0)
    db.rate_limits.create_index('expires_at', expireAfterSeconds=0)


@contextmanager
def locked_agent(agent_id, active_only=True):
    """Serialize assignment and deactivation; a lease recovers if a process exits."""
    lease = secrets.token_hex(16)
    query = {'_id': agent_id, 'role': 'delivery', '$or': [
        {'lock_until': {'$exists': False}}, {'lock_until': {'$lt': now()}}]}
    if active_only:
        query['active'] = True
    agent = get_db().users.find_one_and_update(query,
        {'$set': {'lock_id': lease, 'lock_until': now() + timedelta(seconds=30)}}, return_document=ReturnDocument.AFTER)
    if not agent:
        abort(409, 'Agent is inactive or being updated. Refresh and try again.')
    try:
        yield agent
    finally:
        get_db().users.update_one({'_id': agent_id, 'lock_id': lease}, {'$unset': {'lock_id': '', 'lock_until': ''}})
