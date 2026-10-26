"""Public menu plus customer-owned addresses and persistent carts."""
import re
from flask import Blueprint, abort, g, request
from pymongo import ReturnDocument
from auth import require
from common import body, integer, listing, now, oid, ok, text
from db import get_db

bp = Blueprint('catalog', __name__)


@bp.get('/menu')
def menu():
    query = {'archived': {'$ne': True}}
    if request.args.get('q'):
        query['name'] = {'$regex': re.escape(request.args['q'][:100]), '$options': 'i'}
    if request.args.get('category'):
        query['category'] = request.args['category']
    if request.args.get('veg') in ('true', 'false'):
        query['veg'] = request.args['veg'] == 'true'
    price = {}
    for param, operator in [('min_price', '$gte'), ('max_price', '$lte')]:
        if request.args.get(param):
            try:
                price[operator] = integer(int(request.args[param]), param)
            except ValueError:
                abort(400, 'Invalid price filter.')
    if price:
        query['price'] = price
    sorts = {'price_asc': [('price', 1)], 'price_desc': [('price', -1)], 'name': [('name', 1)]}
    return listing(get_db().menu, query, sort=sorts.get(request.args.get('sort'), [('name', 1)]))


@bp.get('/categories')
def categories():
    return ok(sorted(get_db().menu.distinct('category', {'archived': {'$ne': True}})))


@bp.get('/menu/<item_id>/reviews')
def reviews(item_id):
    return listing(get_db().ratings, {'item_ids': oid(item_id)},
        lambda r: {k: r[k] for k in ('score', 'review', 'customer_name', 'created_at')})


def address_data(data):
    phone = text(data, 'phone', 7, 20)
    if not re.fullmatch(r'\+?[\d ()-]{7,20}', phone) or not 7 <= len(re.sub(r'\D', '', phone)) <= 15:
        abort(400, 'Enter a valid phone number.')
    return {'label': text(data, 'label', 1, 40), 'line': text(data, 'line', 8, 400), 'phone': phone}


@bp.get('/addresses')
@require('customer')
def addresses():
    return ok(list(get_db().addresses.find({'user_id': g.user['_id']}).sort('created_at', -1)))


@bp.post('/addresses')
@require('customer')
def add_address():
    if get_db().addresses.count_documents({'user_id': g.user['_id']}) >= 20:
        abort(400, 'You can save up to 20 addresses.')
    data = {**address_data(body()), 'user_id': g.user['_id'], 'created_at': now()}
    data['_id'] = get_db().addresses.insert_one(data).inserted_id
    return ok(data, 201)


@bp.put('/addresses/<address_id>')
@require('customer')
def edit_address(address_id):
    result = get_db().addresses.find_one_and_update({'_id': oid(address_id), 'user_id': g.user['_id']},
        {'$set': address_data(body())}, return_document=ReturnDocument.AFTER)
    if not result:
        abort(404, 'Address not found.')
    return ok(result)


@bp.delete('/addresses/<address_id>')
@require('customer')
def delete_address(address_id):
    if not get_db().addresses.delete_one({'_id': oid(address_id), 'user_id': g.user['_id']}).deleted_count:
        abort(404, 'Address not found.')
    return ok({'message': 'Address removed.'})


def normalize_items(items):
    if not isinstance(items, list) or len(items) > 40:
        abort(400, 'Cart must contain at most 40 distinct items.')
    result, seen = [], set()
    for row in items:
        if not isinstance(row, dict):
            abort(400, 'Invalid cart item.')
        item_id = oid(row.get('item_id'))
        if item_id in seen:
            abort(400, 'Duplicate cart item.')
        seen.add(item_id)
        result.append({'item_id': item_id, 'quantity': integer(row.get('quantity'), 'quantity', 1, 20)})
    return result


def bill(items, strict=True):
    rows = []
    for item in items:
        food = get_db().menu.find_one({'_id': item['item_id']})
        available = bool(food and food['available'])
        if strict and not available:
            abort(409, 'An item is unavailable. Update your cart before checkout.')
        rows.append({'item_id': item['item_id'], 'name': food['name'] if food else 'Removed item',
            'unit_price': food['price'] if food else 0, 'quantity': item['quantity'],
            'image': food.get('image', '') if food else '', 'veg': food.get('veg', True) if food else True,
            'available': available})
    subtotal = sum(row['unit_price'] * row['quantity'] for row in rows)
    tax = (subtotal * 5 + 50) // 100
    delivery_fee = 2900 if 0 < subtotal < 50000 else 0
    return {'items': rows, 'subtotal': subtotal, 'tax': tax, 'delivery_fee': delivery_fee, 'total': subtotal + tax + delivery_fee}


def cart_doc():
    return get_db().carts.find_one({'_id': g.user['_id']}) or {'_id': g.user['_id'], 'items': [], 'version': 0}


@bp.get('/cart')
@require('customer')
def cart():
    saved = cart_doc()
    return ok({**bill(saved['items'], False), 'version': saved['version']})


@bp.put('/cart')
@require('customer')
def update_cart():
    data = body()
    items = normalize_items(data.get('items'))
    version = integer(data.get('version'), 'cart version')
    totals = bill(items, False)
    previous = {row['item_id']: row['quantity'] for row in cart_doc()['items']}
    if any(not row['available'] and row['quantity'] > previous.get(row['item_id'], 0) for row in totals['items']):
        abort(409, 'An item is unavailable. You can remove it but cannot add more.')
    saved = get_db().carts.find_one_and_update({'_id': g.user['_id'], 'version': version},
        {'$set': {'items': items, 'updated_at': now()}, '$inc': {'version': 1}},
        upsert=version == 0, return_document=ReturnDocument.AFTER)
    if not saved:
        abort(409, 'Cart changed in another session. Refresh it and try again.')
    return ok({**totals, 'version': saved['version']})
