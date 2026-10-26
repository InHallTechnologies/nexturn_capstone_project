"""Canonical order workflow: atomic transitions, embedded assignment/history, OTP."""
import hashlib
import hmac
import json
import secrets
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from bson import ObjectId
from flask import Blueprint, abort, current_app, g, request
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from auth import require
from catalog import bill, cart_doc
from common import body, integer, listing, now, oid, ok, text
from db import get_db, locked_agent

bp = Blueprint('orders', __name__)
STEPS = ['Placed', 'Accepted', 'Preparing', 'Ready', 'Picked Up', 'Delivered']
TRANSITIONS = {
    'Accepted': (['Placed'], ['kitchen', 'admin']),
    'Rejected': (['Placed'], ['kitchen', 'admin']),
    'Preparing': (['Accepted'], ['kitchen', 'admin']),
    'Ready': (['Preparing'], ['kitchen', 'admin']),
    'Cancelled': (['Placed', 'Accepted'], ['customer', 'admin']),
    'Picked Up': (['Ready'], ['delivery']),
    'Delivered': (['Picked Up'], ['delivery']),
}


def event(status, note=''):
    return {'status': status, 'at': now(), 'actor_id': g.user['_id'], 'role': g.user['role'], 'note': note}


def otp_for(order):
    message = f"{order['_id']}:{order['otp_nonce']}"
    hashed = hmac.new(current_app.config['JWT_SECRET'].encode(), message.encode(), hashlib.sha256).digest()
    return str(int.from_bytes(hashed[:8], 'big') % 1000000).zfill(6)


def order_view(order):
    result = {k: v for k, v in order.items() if k not in ('otp_nonce', 'otp_attempts', 'signature', 'key')}
    if g.user['role'] == 'customer' and order['customer_id'] == g.user['_id'] and order['status'] in ('Ready', 'Picked Up'):
        result['delivery_otp'] = otp_for(order)
    result['rating'] = get_db().ratings.find_one({'order_id': order['_id']}, {'item_ids': 0})
    return result


def owned_order(order_id):
    order = get_db().orders.find_one({'_id': oid(order_id)})
    if not order:
        abort(404, 'Order not found.')
    if g.user['role'] == 'customer' and order['customer_id'] != g.user['_id']:
        abort(404, 'Order not found.')
    if g.user['role'] == 'delivery' and order.get('agent_id') != g.user['_id']:
        abort(404, 'Order not found.')
    return order


@bp.post('/orders')
@require('customer')
def place_order():
    data = body()
    key = request.headers.get('Idempotency-Key', '')
    if not 16 <= len(key) <= 100:
        abort(400, 'An Idempotency-Key header of 16–100 characters is required.')
    address_id = oid(data.get('address_id'))
    version = integer(data.get('cart_version'), 'cart version')
    note = data.get('note', '')
    if not isinstance(note, str) or len(note) > 300:
        abort(400, 'Order note must be at most 300 characters.')
    signature = hashlib.sha256(json.dumps([str(address_id), version, note]).encode()).hexdigest()
    db = get_db()
    existing = db.orders.find_one({'customer_id': g.user['_id'], 'key': key})
    if existing:
        if existing['signature'] != signature:
            abort(409, 'This checkout key was already used with different details.')
        db.carts.update_one({'_id': g.user['_id'], 'version': existing['cart_version']}, {'$set': {'items': []}, '$inc': {'version': 1}})
        return ok(order_view(existing))
    saved = cart_doc()
    if saved['version'] != version:
        concurrent = db.orders.find_one({'customer_id': g.user['_id'], 'key': key, 'signature': signature})
        if concurrent:
            return ok(order_view(concurrent))
        abort(409, 'Cart changed. Refresh and review the total before checkout.')
    if not saved['items']:
        abort(400, 'Your cart is empty.')
    address = db.addresses.find_one({'_id': address_id, 'user_id': g.user['_id']})
    if not address:
        abort(404, 'Delivery address not found.')
    order = {**bill(saved['items']), 'customer_id': g.user['_id'], 'customer_name': g.user['name'],
        'address': {k: address[k] for k in ('label', 'line', 'phone')}, 'note': note,
        'status': 'Placed', 'created_at': now(), 'updated_at': now(), 'history': [event('Placed')],
        'key': key, 'signature': signature, 'cart_version': version, 'active_delivery': False,
        'otp_nonce': secrets.token_hex(16), 'otp_attempts': 0}
    try:
        order['_id'] = db.orders.insert_one(order).inserted_id
    except DuplicateKeyError:
        existing = db.orders.find_one({'customer_id': g.user['_id'], 'key': key})
        if existing and existing['signature'] == signature:
            return ok(order_view(existing))
        abort(409, 'This cart has already been checked out. Refresh your orders.')
    # A crash here is recoverable: replaying the same key clears only this cart version.
    db.carts.update_one({'_id': g.user['_id'], 'version': version}, {'$set': {'items': []}, '$inc': {'version': 1}})
    return ok(order_view(order), 201)


@bp.get('/orders')
@require()
def orders():
    query = {}
    role = g.user['role']
    if role == 'customer':
        query['customer_id'] = g.user['_id']
    elif role == 'delivery':
        query['agent_id'] = g.user['_id']
    if request.args.get('scope') == 'active':
        query['status'] = {'$in': STEPS[:-1]}
    elif request.args.get('scope') == 'history':
        query['status'] = {'$in': ['Delivered', 'Cancelled', 'Rejected']}
    if request.args.get('status'):
        if request.args['status'] not in STEPS + ['Cancelled', 'Rejected']:
            abort(400, 'Invalid order status filter.')
        query['status'] = request.args['status']
    if request.args.get('q'):
        value = request.args['q'][:100]
        query['$or'] = [{'customer_name': {'$regex': re.escape(value), '$options': 'i'}}]
        if ObjectId.is_valid(value):
            query['$or'].append({'_id': ObjectId(value)})
    if request.args.get('date'):
        try:
            start = datetime.strptime(request.args['date'], '%Y-%m-%d').replace(tzinfo=ZoneInfo('Asia/Kolkata'))
        except ValueError:
            abort(400, 'Invalid order date.')
        query['created_at'] = {'$gte': start, '$lt': start + timedelta(days=1)}
    sort = [('created_at', 1)] if request.args.get('sort') == 'oldest' else [('created_at', -1)]
    return listing(get_db().orders, query, order_view, sort)


@bp.get('/orders/<order_id>')
@require()
def order_detail(order_id):
    return ok(order_view(owned_order(order_id)))


@bp.post('/orders/<order_id>/transition')
@require()
def transition(order_id):
    order = owned_order(order_id)
    data = body()
    target = data.get('status')
    if not isinstance(target, str) or target not in TRANSITIONS:
        abort(400, 'Unknown target status.')
    sources, roles = TRANSITIONS[target]
    if g.user['role'] not in roles:
        abort(403, 'Your role cannot perform this transition.')
    if order['status'] == target:
        return ok(order_view(order))
    if order['status'] not in sources:
        abort(409, f"Cannot move an order from {order['status']} to {target}.")
    query = {'_id': order['_id'], 'status': order['status']}
    fields = {'status': target, 'updated_at': now(), target.lower().replace(' ', '_') + '_at': now()}
    if target in ('Picked Up', 'Delivered'):
        query.update({'agent_id': g.user['_id'], 'assignment.accepted_at': {'$exists': True}, 'active_delivery': True})
        if not order.get('assignment', {}).get('accepted_at'):
            abort(409, 'Accept your assignment before pickup.')
    if target == 'Delivered':
        if order['otp_attempts'] >= 5:
            abort(429, 'OTP attempts exhausted. Ask the kitchen to issue a new code.')
        supplied = data.get('otp', '')
        if not isinstance(supplied, str) or not hmac.compare_digest(supplied, otp_for(order)):
            get_db().orders.update_one({**query, 'otp_nonce': order['otp_nonce'], 'otp_attempts': {'$lt': 5}}, {'$inc': {'otp_attempts': 1}})
            abort(400, 'Incorrect delivery code.')
        query.update({'otp_attempts': {'$lt': 5}, 'otp_nonce': order['otp_nonce']})
        fields.update({'active_delivery': False, 'assignment.delivered_at': now()})
    if target == 'Picked Up':
        fields['assignment.picked_up_at'] = now()
    note = data.get('reason', '')
    if not isinstance(note, str) or len(note) > 300:
        abort(400, 'Reason must be at most 300 characters.')
    updated = get_db().orders.find_one_and_update(query, {'$set': fields, '$push': {'history': event(target, note)}}, return_document=ReturnDocument.AFTER)
    if not updated:
        abort(409, 'Order changed. Refresh before trying again.')
    return ok(order_view(updated))


@bp.get('/agents/available')
@require('kitchen', 'admin')
def available_agents():
    busy = get_db().orders.distinct('agent_id', {'active_delivery': True})
    return ok(list(get_db().users.find({'role': 'delivery', 'active': True, '_id': {'$nin': busy}}, {'name': 1})))


@bp.post('/orders/<order_id>/assign')
@require('kitchen', 'admin')
def assign(order_id):
    order = owned_order(order_id)
    agent_id = oid(body().get('agent_id'))
    if order['status'] != 'Ready':
        abort(409, 'Only ready orders can be assigned.')
    if order.get('agent_id'):
        if order['agent_id'] == agent_id:
            return ok(order_view(order))
        abort(409, 'This order is already assigned.')
    with locked_agent(agent_id) as agent:
        updated = get_db().orders.find_one_and_update({'_id': order['_id'], 'status': 'Ready', 'agent_id': {'$exists': False}},
            {'$set': {'agent_id': agent_id, 'agent_name': agent['name'], 'active_delivery': True, 'updated_at': now(),
                      'assignment': {'assigned_at': now()}}, '$push': {'history': event('Ready', f"Assigned to {agent['name']}")}},
            return_document=ReturnDocument.AFTER)
    if not updated:
        abort(409, 'Order is already assigned or has changed.')
    return ok(order_view(updated))


@bp.post('/orders/<order_id>/accept-assignment')
@require('delivery')
def accept_assignment(order_id):
    order = owned_order(order_id)
    if order.get('assignment', {}).get('accepted_at'):
        return ok(order_view(order))
    updated = get_db().orders.find_one_and_update({'_id': order['_id'], 'agent_id': g.user['_id'], 'status': 'Ready', 'active_delivery': True, 'assignment.accepted_at': {'$exists': False}},
        {'$set': {'assignment.accepted_at': now(), 'updated_at': now()}, '$push': {'history': event('Ready', 'Assignment accepted')}}, return_document=ReturnDocument.AFTER)
    if not updated:
        abort(409, 'This assignment is no longer available.')
    return ok(order_view(updated))


@bp.post('/orders/<order_id>/otp-reset')
@require('kitchen', 'admin')
def reset_otp(order_id):
    order = owned_order(order_id)
    if order['status'] not in ('Ready', 'Picked Up'):
        abort(409, 'A code can only be reissued for an active delivery.')
    updated = get_db().orders.find_one_and_update({'_id': order['_id'], 'status': order['status'], 'otp_nonce': order['otp_nonce']},
        {'$set': {'otp_nonce': secrets.token_hex(16), 'otp_attempts': 0, 'updated_at': now()}, '$push': {'history': event(order['status'], 'Delivery code reissued')}}, return_document=ReturnDocument.AFTER)
    if not updated:
        abort(409, 'Order changed. Try again.')
    return ok(order_view(updated))


@bp.post('/orders/<order_id>/reorder')
@require('customer')
def reorder(order_id):
    order = owned_order(order_id)
    version = integer(body().get('cart_version'), 'cart version')
    items = [{'item_id': item['item_id'], 'quantity': item['quantity']} for item in order['items']]
    totals = bill(items)
    saved = get_db().carts.find_one_and_update({'_id': g.user['_id'], 'version': version},
        {'$set': {'items': items}, '$inc': {'version': 1}}, upsert=version == 0, return_document=ReturnDocument.AFTER)
    if not saved:
        abort(409, 'Cart changed. Refresh before reordering.')
    return ok({**totals, 'version': saved['version']})


@bp.post('/orders/<order_id>/rating')
@require('customer')
def rate(order_id):
    order = owned_order(order_id)
    if order['status'] != 'Delivered':
        abort(409, 'Only delivered orders can be reviewed.')
    data = body()
    score = integer(data.get('score'), 'score', 1, 5)
    review = text(data, 'review', 1, 1000)
    existing = get_db().ratings.find_one({'order_id': order['_id']})
    if existing:
        if existing['score'] == score and existing['review'] == review:
            return ok(existing)
        abort(409, 'You have already reviewed this order.')
    rating = {'order_id': order['_id'], 'customer_id': g.user['_id'], 'customer_name': g.user['name'],
        'item_ids': [item['item_id'] for item in order['items']], 'score': score, 'review': review, 'created_at': now()}
    rating['_id'] = get_db().ratings.insert_one(rating).inserted_id
    return ok(rating, 201)
