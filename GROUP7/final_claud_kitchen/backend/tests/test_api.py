"""Integration tests against an isolated real MongoDB database, including races."""
import os
import secrets
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import jwt
import pytest
from bson import ObjectId
from pymongo.errors import OperationFailure

from app import create_app
from common import now
from db import get_db
from seed import seed


@pytest.fixture(scope='module')
def app():
    name = 'cloud_kitchen_test_' + uuid.uuid4().hex
    application = create_app({'TESTING': True, 'JWT_SECRET': secrets.token_hex(32),
        'MONGODB_URI': os.getenv('TEST_MONGODB_URI', 'mongodb://127.0.0.1:27017/'), 'MONGODB_DB': name})
    yield application
    application.extensions['mongo_client'].drop_database(name)
    application.extensions['mongo_client'].close()


@pytest.fixture()
def env(app):
    with app.app_context():
        db = get_db()
        for name in db.list_collection_names():
            db[name].delete_many({})
        seed()
        tokens, clients = {}, {}
        for role in ('customer', 'kitchen', 'delivery', 'admin'):
            client = app.test_client()
            response = client.post('/api/auth/login', json={'email': f'{role}@cloudkitchen.local', 'password': 'KitchenDemo123!'})
            assert response.status_code == 200, response.json
            tokens[role] = response.json['data']['access_token']
            clients[role] = client
        yield db, clients, tokens


def call(env, role, method, path, data=None, expected=200, headers=None):
    _, clients, tokens = env
    response = getattr(clients[role], method)('/api' + path, json=data,
        headers={'Authorization': 'Bearer ' + tokens[role], **(headers or {})})
    assert response.status_code == expected, (response.status_code, response.json)
    return response.json['data']


def checkout(env):
    db, _, _ = env
    food = db.menu.find_one({'available': True})
    cart = call(env, 'customer', 'get', '/cart')
    cart = call(env, 'customer', 'put', '/cart', {'version': cart['version'], 'items': [{'item_id': str(food['_id']), 'quantity': 2}]})
    address = db.addresses.find_one({})
    data = {'address_id': str(address['_id']), 'cart_version': cart['version']}
    key = uuid.uuid4().hex
    order = call(env, 'customer', 'post', '/orders', data, 201, {'Idempotency-Key': key})
    return order, data, key


def ready(env, order):
    for status in ('Accepted', 'Preparing', 'Ready'):
        call(env, 'kitchen', 'post', f"/orders/{order['_id']}/transition", {'status': status})


def delivered(env):
    db, _, _ = env
    order, _, _ = checkout(env)
    ready(env, order)
    agent = db.users.find_one({'role': 'delivery'})
    call(env, 'kitchen', 'post', f"/orders/{order['_id']}/assign", {'agent_id': str(agent['_id'])})
    call(env, 'delivery', 'post', f"/orders/{order['_id']}/accept-assignment", {})
    call(env, 'delivery', 'post', f"/orders/{order['_id']}/transition", {'status': 'Picked Up'})
    detail = call(env, 'customer', 'get', f"/orders/{order['_id']}")
    return call(env, 'delivery', 'post', f"/orders/{order['_id']}/transition", {'status': 'Delivered', 'otp': detail['delivery_otp']})


def test_registration_validation_role_and_duplicate(env):
    db, clients, _ = env
    bad = clients['customer'].post('/api/auth/register', json={'name': 'X', 'email': 'bad', 'password': 'short'})
    assert bad.status_code == 400
    data = {'name': 'New Customer', 'email': 'new@example.test', 'password': 'SecurePassword123!', 'role': 'admin'}
    response = clients['customer'].post('/api/auth/register', json=data)
    assert response.status_code == 201
    assert response.json['data']['user']['role'] == 'customer'
    assert 'password_hash' not in str(response.json)
    assert db.users.find_one({'email': data['email']})['password_hash'].startswith('scrypt:')
    assert clients['customer'].post('/api/auth/register', json=data).status_code == 409


def test_optional_session_without_valid_cookie(app):
    client = app.test_client()
    response = client.post('/api/auth/session')
    assert response.status_code == 200
    assert response.json == {'data': None, 'error': None}
    client.set_cookie('kitchen_refresh', 'invalid', path='/api/auth')
    response = client.post('/api/auth/session')
    assert response.status_code == 200
    assert response.json == {'data': None, 'error': None}
    assert client.get_cookie('kitchen_refresh', path='/api/auth') is None
    assert client.post('/api/auth/refresh').status_code == 401
    assert client.get('/api/auth/me').status_code == 401
    assert client.post('/api/auth/session', headers={'Origin': 'https://evil.test'}).status_code == 403


def test_optional_session_restores_login(env):
    _, clients, _ = env
    client = clients['customer']
    old = client.get_cookie('kitchen_refresh', path='/api/auth').value
    response = client.post('/api/auth/session')
    assert response.status_code == 200
    assert response.json['data']['user']['role'] == 'customer'
    assert client.get_cookie('kitchen_refresh', path='/api/auth').value != old
    token = response.json['data']['access_token']
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 200
    assert client.post('/api/auth/refresh').status_code == 200


def test_refresh_rotation_replay_and_logout(env, app):
    _, clients, tokens = env
    client = clients['customer']
    old = client.get_cookie('kitchen_refresh', path='/api/auth').value
    response = client.post('/api/auth/refresh')
    assert response.status_code == 200
    assert client.get_cookie('kitchen_refresh', path='/api/auth').value != old
    rogue = app.test_client()
    rogue.set_cookie('kitchen_refresh', old, path='/api/auth')
    assert rogue.post('/api/auth/refresh').status_code == 401
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + response.json['data']['access_token']}).status_code == 401
    assert clients['admin'].post('/api/auth/logout').status_code == 200
    assert clients['admin'].get('/api/auth/me', headers={'Authorization': 'Bearer ' + tokens['admin']}).status_code == 401


def test_expired_token_bad_login_and_origin(env, app):
    _, clients, tokens = env
    payload = jwt.decode(tokens['customer'], app.config['JWT_SECRET'], algorithms=['HS256'], audience='cloud-kitchen-web')
    payload['exp'] = now() - timedelta(seconds=1)
    expired = jwt.encode(payload, app.config['JWT_SECRET'], algorithm='HS256')
    assert clients['customer'].get('/api/auth/me', headers={'Authorization': 'Bearer ' + expired}).status_code == 401
    assert clients['customer'].post('/api/auth/login', json={'email': 'customer@cloudkitchen.local', 'password': 'wrong'}).status_code == 401
    assert clients['customer'].post('/api/auth/refresh', headers={'Origin': 'https://evil.test'}).status_code == 403


def test_schema_seed_and_indexes(env):
    db, _, _ = env
    seed()
    assert db.users.count_documents({}) == 4
    assert db.menu.count_documents({}) == 6
    assert db.addresses.count_documents({}) == 1
    assert db.orders.index_information()['one_active_order_per_agent']['unique']
    with pytest.raises(OperationFailure):
        db.menu.insert_one({'name': 'invalid'})


def test_menu_filter_cart_billing_and_availability(env):
    db, _, _ = env
    result = call(env, 'customer', 'get', '/menu?veg=true&sort=price_asc&limit=2')
    assert len(result['items']) == 2 and all(x['veg'] for x in result['items'])
    assert result['items'][0]['price'] <= result['items'][1]['price']
    food = db.menu.find_one({})
    data = {'version': 0, 'items': [{'item_id': str(food['_id']), 'quantity': 2, 'price': 1}], 'total': 1}
    cart = call(env, 'customer', 'put', '/cart', data)
    assert cart['subtotal'] == food['price'] * 2
    assert cart['total'] == cart['subtotal'] + cart['tax'] + cart['delivery_fee']
    call(env, 'customer', 'put', '/cart', data, 409)
    db.menu.update_one({'_id': food['_id']}, {'$set': {'available': False}})
    increased = {'version': cart['version'], 'items': [{'item_id': str(food['_id']), 'quantity': 3}]}
    call(env, 'customer', 'put', '/cart', increased, 409)
    call(env, 'customer', 'put', '/cart', {'version': cart['version'], 'items': []})


def test_addresses_and_ownership(env, app):
    db, clients, _ = env
    added = call(env, 'customer', 'post', '/addresses', {'label': 'Work', 'line': '123 Office Street, New Delhi', 'phone': '9999999999'}, 201)
    call(env, 'customer', 'put', '/addresses/' + added['_id'], {'label': 'Office', 'line': '456 Office Street, New Delhi', 'phone': '9999999999'})
    foreign = ObjectId()
    call(env, 'customer', 'delete', '/addresses/' + str(foreign), expected=404)
    call(env, 'kitchen', 'get', '/addresses', expected=403)
    call(env, 'customer', 'delete', '/addresses/' + added['_id'])


def test_order_idempotency_snapshot_cancel_reorder(env):
    db, _, _ = env
    order, data, key = checkout(env)
    assert call(env, 'customer', 'post', '/orders', data, headers={'Idempotency-Key': key})['_id'] == order['_id']
    assert db.orders.count_documents({}) == 1
    changed = {**data, 'note': 'different'}
    call(env, 'customer', 'post', '/orders', changed, 409, {'Idempotency-Key': key})
    first = order['items'][0]
    db.menu.update_one({'_id': ObjectId(first['item_id'])}, {'$set': {'price': 9900}})
    detail = call(env, 'customer', 'get', '/orders/' + order['_id'])
    assert detail['items'][0]['unit_price'] == first['unit_price']
    call(env, 'customer', 'post', f"/orders/{order['_id']}/rating", {'score': 5, 'review': 'Great'}, 409)
    call(env, 'customer', 'post', f"/orders/{order['_id']}/transition", {'status': 'Cancelled'})
    cart = call(env, 'customer', 'get', '/cart')
    reordered = call(env, 'customer', 'post', f"/orders/{order['_id']}/reorder", {'cart_version': cart['version']})
    assert reordered['items'][0]['unit_price'] == 9900


def test_full_workflow_rating_analytics_and_redaction(env):
    db, _, _ = env
    order = delivered(env)
    assert order['status'] == 'Delivered' and not order['active_delivery']
    assert 'delivery_otp' not in order and 'otp_nonce' not in order
    assert [h['status'] for h in order['history']] == ['Placed', 'Accepted', 'Preparing', 'Ready', 'Ready', 'Ready', 'Picked Up', 'Delivered']
    review = {'score': 5, 'review': 'Fresh and delicious.'}
    call(env, 'customer', 'post', f"/orders/{order['_id']}/rating", review, 201)
    call(env, 'customer', 'post', f"/orders/{order['_id']}/rating", review)
    call(env, 'customer', 'post', f"/orders/{order['_id']}/rating", {**review, 'score': 4}, 409)
    assert db.ratings.count_documents({}) == 1
    report = call(env, 'admin', 'get', '/admin/analytics')
    assert report['summary']['revenue'] == order['total']
    assert report['summary']['orders'] == 1
    assert report['agents'][0]['deliveries'] == 1
    assert call(env, 'customer', 'get', f"/menu/{order['items'][0]['item_id']}/reviews")['total'] == 1


def test_permissions_invalid_transitions_rejection_and_cancel_rules(env, app):
    db, _, _ = env
    order, _, _ = checkout(env)
    path = f"/orders/{order['_id']}/transition"
    call(env, 'customer', 'post', path, {'status': 'Accepted'}, 403)
    call(env, 'kitchen', 'post', path, {'status': 'Ready'}, 409)
    call(env, 'delivery', 'get', '/orders/' + order['_id'], expected=404)
    other = app.test_client()
    response = other.post('/api/auth/register', json={'name': 'Other Person', 'email': 'other@test.local', 'password': 'SecurePassword123!'})
    assert other.get('/api/orders/' + order['_id'], headers={'Authorization': 'Bearer ' + response.json['data']['access_token']}).status_code == 404
    call(env, 'kitchen', 'post', path, {'status': 'Rejected'})
    order2, _, _ = checkout(env)
    ready(env, order2)
    call(env, 'customer', 'post', f"/orders/{order2['_id']}/transition", {'status': 'Cancelled'}, 409)
    call(env, 'kitchen', 'post', f"/orders/{order2['_id']}/transition", {'status': 'Rejected'}, 409)
    call(env, 'kitchen', 'get', '/admin/analytics', expected=403)
    call(env, 'customer', 'get', '/admin/agents', expected=403)


def test_otp_attempt_limit_reset_and_assignment_acceptance(env):
    db, _, _ = env
    order, _, _ = checkout(env)
    ready(env, order)
    agent = db.users.find_one({'role': 'delivery'})
    base = '/orders/' + order['_id']
    call(env, 'kitchen', 'post', base + '/assign', {'agent_id': str(agent['_id'])})
    assert 'delivery_otp' not in call(env, 'delivery', 'get', base)
    call(env, 'delivery', 'post', base + '/transition', {'status': 'Picked Up'}, 409)
    call(env, 'delivery', 'post', base + '/accept-assignment', {})
    call(env, 'delivery', 'post', base + '/transition', {'status': 'Picked Up'})
    for _ in range(5):
        call(env, 'delivery', 'post', base + '/transition', {'status': 'Delivered', 'otp': 'invalid'}, 400)
    detail = call(env, 'customer', 'get', base)
    call(env, 'delivery', 'post', base + '/transition', {'status': 'Delivered', 'otp': detail['delivery_otp']}, 429)
    call(env, 'kitchen', 'post', base + '/otp-reset', {})
    detail = call(env, 'customer', 'get', base)
    call(env, 'delivery', 'post', base + '/transition', {'status': 'Delivered', 'otp': detail['delivery_otp']})
    call(env, 'delivery', 'post', base + '/transition', {'status': 'Delivered', 'otp': detail['delivery_otp']})
    assert db.orders.find_one({'_id': ObjectId(order['_id'])})['status'] == 'Delivered'


def test_concurrent_assignments_are_unique(env, app):
    db, _, tokens = env
    orders = [checkout(env)[0], checkout(env)[0]]
    for order in orders:
        ready(env, order)
    agent = db.users.find_one({'role': 'delivery'})
    def assign_one(order):
        with app.test_client() as client:
            return client.post(f"/api/orders/{order['_id']}/assign", json={'agent_id': str(agent['_id'])}, headers={'Authorization': 'Bearer ' + tokens['kitchen']}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(assign_one, orders)) == [200, 409]
    assert db.orders.count_documents({'active_delivery': True, 'agent_id': agent['_id']}) == 1
    assert len(call(env, 'kitchen', 'get', '/agents/available')) == 0
    call(env, 'admin', 'patch', '/admin/agents/' + str(agent['_id']), {'active': False}, 409)


def test_admin_crud_agent_deactivation_and_empty_analytics(env):
    db, _, _ = env
    item = {'name': 'Test special', 'category': 'Specials', 'description': 'A seasonal special.', 'price': 9900, 'veg': True,
        'available': True, 'image': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd'}
    created = call(env, 'admin', 'post', '/admin/menu', item, 201)
    call(env, 'admin', 'put', '/admin/menu/' + created['_id'], {**item, 'price': -1}, 400)
    call(env, 'admin', 'put', '/admin/menu/' + created['_id'], {**item, 'price': 10900})
    call(env, 'admin', 'delete', '/admin/menu/' + created['_id'])
    assert call(env, 'customer', 'get', '/menu?q=Test%20special')['total'] == 0
    agent = call(env, 'admin', 'post', '/admin/agents', {'name': 'New Rider', 'email': 'rider@test.local', 'password': 'SecurePassword123!'}, 201)
    call(env, 'admin', 'patch', '/admin/agents/' + agent['_id'], {'active': False})
    report = call(env, 'admin', 'get', '/admin/analytics?days=7')
    assert report['summary']['revenue'] == 0 and len(report['daily']) == 7


def test_concurrent_checkout_does_not_duplicate_orders(env, app):
    db, _, tokens = env
    food = db.menu.find_one({})
    cart = call(env, 'customer', 'put', '/cart', {'version': 0, 'items': [{'item_id': str(food['_id']), 'quantity': 1}]})
    address = db.addresses.find_one({})
    payload = {'address_id': str(address['_id']), 'cart_version': cart['version']}
    key = uuid.uuid4().hex
    def place(_):
        with app.test_client() as client:
            return client.post('/api/orders', json=payload, headers={'Authorization': 'Bearer ' + tokens['customer'], 'Idempotency-Key': key}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(place, range(2)))
    assert all(code in (200, 201) for code in results)
    assert db.orders.count_documents({}) == 1
    assert not call(env, 'customer', 'get', '/cart')['items']


def test_concurrent_transitions_keep_history_consistent(env, app):
    db, _, tokens = env
    order, _, _ = checkout(env)
    path = f"/orders/{order['_id']}/transition"
    call(env, 'kitchen', 'post', path, {'status': 'Accepted'})
    def change(action):
        role, status = action
        with app.test_client() as client:
            return client.post('/api' + path, json={'status': status}, headers={'Authorization': 'Bearer ' + tokens[role]}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(change, [('kitchen', 'Preparing'), ('customer', 'Cancelled')]))
    assert sorted(results) == [200, 409]
    current = db.orders.find_one({'_id': ObjectId(order['_id'])})
    assert len(current['history']) == 3
    assert current['status'] == current['history'][-1]['status']


def test_order_filter_validation_and_inactive_agent(env):
    db, clients, _ = env
    call(env, 'admin', 'get', '/orders?date=invalid', expected=400)
    order, _, _ = checkout(env)
    call(env, 'kitchen', 'post', f"/orders/{order['_id']}/transition", {'status': []}, 400)
    filtered = call(env, 'admin', 'get', '/orders?q=' + order['_id'])
    assert filtered['total'] == 1
    agent = db.users.find_one({'role': 'delivery'})
    call(env, 'admin', 'patch', '/admin/agents/' + str(agent['_id']), {'active': False})
    call(env, 'delivery', 'get', '/orders', expected=401)


def test_logout_revokes_access_even_without_refresh_cookie(env):
    _, clients, _ = env
    clients['customer'].delete_cookie('kitchen_refresh', path='/api/auth')
    call(env, 'customer', 'post', '/auth/logout', {})
    call(env, 'customer', 'get', '/auth/me', expected=401)


def test_cart_can_remove_items_when_another_is_unavailable(env):
    db, _, _ = env
    foods = list(db.menu.find({}).limit(2))
    items = [{'item_id': str(food['_id']), 'quantity': 1} for food in foods]
    cart = call(env, 'customer', 'put', '/cart', {'version': 0, 'items': items})
    db.menu.update_one({'_id': foods[0]['_id']}, {'$set': {'available': False}})
    result = call(env, 'customer', 'put', '/cart', {'version': cart['version'], 'items': items[:1]})
    assert len(result['items']) == 1 and not result['items'][0]['available']
