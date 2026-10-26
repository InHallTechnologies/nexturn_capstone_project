"""Admin management and analytics derived from live MongoDB records."""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
from flask import Blueprint, abort, g, request
from pymongo import ReturnDocument
from werkzeug.security import generate_password_hash
from auth import require
from common import body, boolean, email, integer, listing, now, oid, ok, text, user_view
from db import get_db, locked_agent

bp = Blueprint('admin', __name__)
BUSINESS_TZ = ZoneInfo('Asia/Kolkata')


def menu_data(data):
    image = text(data, 'image', 1, 1000)
    parsed = urlparse(image)
    if parsed.scheme != 'https' or not parsed.netloc:
        abort(400, 'Food image must be an HTTPS URL.')
    return {'name': text(data, 'name', 2, 100), 'category': text(data, 'category', 2, 60),
        'description': text(data, 'description', 5, 600), 'price': integer(data.get('price'), 'price in paise', 1, 1000000),
        'veg': boolean(data, 'veg'), 'available': boolean(data, 'available'), 'image': image}


@bp.post('/admin/menu')
@require('admin')
def create_menu():
    data = {**menu_data(body()), 'created_at': now(), 'archived': False}
    data['_id'] = get_db().menu.insert_one(data).inserted_id
    return ok(data, 201)


@bp.put('/admin/menu/<item_id>')
@require('admin')
def edit_menu(item_id):
    data = menu_data(body())
    result = get_db().menu.find_one_and_update({'_id': oid(item_id), 'archived': {'$ne': True}}, {'$set': {**data, 'updated_at': now()}}, return_document=ReturnDocument.AFTER)
    if not result:
        abort(404, 'Menu item not found.')
    return ok(result)


@bp.delete('/admin/menu/<item_id>')
@require('admin')
def delete_menu(item_id):
    if not get_db().menu.update_one({'_id': oid(item_id), 'archived': {'$ne': True}}, {'$set': {'archived': True, 'available': False, 'updated_at': now()}}).matched_count:
        abort(404, 'Menu item not found.')
    return ok({'message': 'Menu item archived. Historical orders are preserved.'})


@bp.get('/admin/agents')
@require('admin')
def agents():
    return listing(get_db().users, {'role': 'delivery'}, user_view)


@bp.post('/admin/agents')
@require('admin')
def add_agent():
    data = body()
    user = {'name': text(data, 'name', 2, 80), 'email': email(data), 'role': 'delivery', 'active': True,
        'password_hash': generate_password_hash(text(data, 'password', 10, 128), method='scrypt'), 'created_at': now()}
    user['_id'] = get_db().users.insert_one(user).inserted_id
    return ok(user_view(user), 201)


@bp.patch('/admin/agents/<agent_id>')
@require('admin')
def edit_agent(agent_id):
    data = body()
    active = boolean(data, 'active')
    agent_id = oid(agent_id)
    with locked_agent(agent_id, active_only=False):
        if not active and get_db().orders.find_one({'agent_id': agent_id, 'active_delivery': True}):
            abort(409, 'An agent with an active assignment cannot be deactivated.')
        user = get_db().users.find_one_and_update({'_id': agent_id, 'role': 'delivery'}, {'$set': {'active': active}}, return_document=ReturnDocument.AFTER)
        if not active:
            get_db().sessions.update_many({'user_id': agent_id}, {'$set': {'revoked': True}})
    return ok(user_view(user))

           
@bp.get('/admin/analytics')
@require('admin')
def analytics():
    try:
        days = integer(int(request.args.get('days', 14)), 'days', 1, 90)
    except ValueError:
        abort(400, 'Invalid reporting range.')
    today = now().astimezone(BUSINESS_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    start = (today - timedelta(days=days - 1)).astimezone(timezone.utc)
    db = get_db()
    date_created = {'$dateToString': {'format': '%Y-%m-%d', 'date': '$created_at', 'timezone': 'Asia/Kolkata'}}
    date_delivered = {'$dateToString': {'format': '%Y-%m-%d', 'date': '$delivered_at', 'timezone': 'Asia/Kolkata'}}
    placed = list(db.orders.aggregate([{'$match': {'created_at': {'$gte': start}}},
        {'$group': {'_id': date_created, 'orders': {'$sum': 1}}}]))
    revenue = list(db.orders.aggregate([{'$match': {'status': 'Delivered', 'delivered_at': {'$gte': start}}},
        {'$group': {'_id': date_delivered, 'revenue': {'$sum': '$total'}, 'delivered': {'$sum': 1}}}]))
    preparation = list(db.orders.aggregate([{'$match': {'ready_at': {'$gte': start}, 'preparing_at': {'$exists': True}}},
        {'$group': {'_id': None, 'average': {'$avg': {'$divide': [{'$subtract': ['$ready_at', '$preparing_at']}, 60000]}}}}]))
    performance = list(db.orders.aggregate([{'$match': {'status': 'Delivered', 'delivered_at': {'$gte': start}}},
        {'$group': {'_id': '$agent_id', 'name': {'$first': '$agent_name'}, 'deliveries': {'$sum': 1}, 'revenue': {'$sum': '$total'},
            'average_minutes': {'$avg': {'$divide': [{'$subtract': ['$delivered_at', '$picked_up_at']}, 60000]}}}},
        {'$sort': {'deliveries': -1}}]))
    statuses = list(db.orders.aggregate([{'$match': {'created_at': {'$gte': start}}}, {'$group': {'_id': '$status', 'count': {'$sum': 1}}}]))
    daily = {}
    for offset in range(days):
        day = (today - timedelta(days=days - 1 - offset)).strftime('%Y-%m-%d')
        daily[day] = {'date': day, 'orders': 0, 'revenue': 0, 'delivered': 0}
    for row in placed:
        if row['_id'] in daily:
            daily[row['_id']]['orders'] = row['orders']
    for row in revenue:
        if row['_id'] in daily:
            daily[row['_id']].update({k: row[k] for k in ('revenue', 'delivered')})
    current = daily[today.strftime('%Y-%m-%d')]
    return ok({'summary': {'orders_today': current['orders'], 'revenue_today': current['revenue'],
        'orders': sum(r['orders'] for r in daily.values()), 'revenue': sum(r['revenue'] for r in daily.values()),
        'average_preparation_minutes': round(preparation[0]['average'], 1) if preparation else 0},
        'daily': list(daily.values()), 'statuses': statuses, 'agents': performance, 'timezone': 'Asia/Kolkata'})
