"""Short-lived access JWTs and rotating, revocable HttpOnly refresh sessions."""

from flask import Blueprint, abort, current_app, g, request
from pymongo import ReturnDocument
from werkzeug.exceptions import Unauthorized
from werkzeug.security import generate_password_hash, check_password_hash
from common import body, email, now, oid, ok, text, user_view
from db import get_db
import hashlib
import secrets
from datetime import timedelta
from functools import wraps
import jwt


bp = Blueprint('auth', __name__)
COOKIE = 'kitchen_refresh'


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def token(user_id, session_id, kind, jti):
    return jwt.encode({
        'sub': str(user_id), 'sid': str(session_id), 'type': kind, 'jti': jti,
        'iat': now(), 'exp': now() + (timedelta(minutes=15) if kind == 'access' else timedelta(days=7)),
        'iss': 'cloud-kitchen', 'aud': 'cloud-kitchen-web',
    }, current_app.config['JWT_SECRET'], algorithm='HS256')


def decode(value, kind):
    try:
        payload = jwt.decode(value, current_app.config['JWT_SECRET'], algorithms=['HS256'],
            issuer='cloud-kitchen', audience='cloud-kitchen-web',
            options={'require': ['exp', 'iat', 'sub', 'sid', 'type', 'jti']})
        if payload['type'] != kind:
            abort(401, 'Invalid token type.')
        return payload
    except jwt.InvalidTokenError:
        abort(401, 'Session expired. Please sign in again.')


def require(*roles):
    def decorate(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            header = request.headers.get('Authorization', '')
            if not header.startswith('Bearer '):
                abort(401, 'Sign in to continue.')
            payload = decode(header[7:], 'access')
            db = get_db()
            session = db.sessions.find_one({'_id': oid(payload['sid']), 'user_id': oid(payload['sub']), 'revoked': False, 'expires_at': {'$gt': now()}})
            user = db.users.find_one({'_id': oid(payload['sub']), 'active': True})
            if not session or not user:
                abort(401, 'Session revoked or account inactive.')
            if roles and user['role'] not in roles:
                abort(403, 'This action is not available to your role.')
            g.user, g.session = user, session
            return func(*args, **kwargs)
        return wrapped
    return decorate


def same_origin():
    origin = request.headers.get('Origin')
    allowed = {value.strip().rstrip('/') for value in current_app.config['FRONTEND_ORIGIN'].split(',')}
    allowed.add(request.host_url.rstrip('/'))
    if origin and origin not in allowed:
        abort(403, 'Untrusted request origin.')


def session_response(user, session_id, refresh_jti, status=200):
    response, code = ok({'user': user_view(user), 'access_token': token(user['_id'], session_id, 'access', secrets.token_hex(16))}, status)
    response.set_cookie(COOKIE, token(user['_id'], session_id, 'refresh', refresh_jti),
        httponly=True, secure=current_app.config['COOKIE_SECURE'], samesite='Strict',
        max_age=7 * 24 * 3600, path='/api/auth')
    response.headers['Cache-Control'] = 'no-store'
    return response, code


def new_session(user, status=200):
    jti = secrets.token_hex(32)
    sid = get_db().sessions.insert_one({'user_id': user['_id'], 'refresh_hash': digest(jti),
        'revoked': False, 'created_at': now(), 'expires_at': now() + timedelta(days=7)}).inserted_id
    return session_response(user, sid, jti, status)


@bp.post('/auth/register')
def register():
    same_origin()
    data = body()
    password = text(data, 'password', 10, 128)
    user = {'name': text(data, 'name', 2, 80), 'email': email(data),
        'password_hash': generate_password_hash(password, method='scrypt'),
        'role': 'customer', 'active': True, 'created_at': now()}
    user['_id'] = get_db().users.insert_one(user).inserted_id
    return new_session(user, 201)


@bp.post('/auth/login')
def login():
    same_origin()
    data = body()
    address = email(data)
    password = text(data, 'password', 1, 128)
    window = int(now().timestamp()) // 900
    key = digest(f'{address}:{request.remote_addr}:{window}')
    count = get_db().rate_limits.find_one_and_update({'_id': key},
        {'$inc': {'count': 1}, '$setOnInsert': {'expires_at': now() + timedelta(minutes=15)}},
        upsert=True, return_document=ReturnDocument.AFTER)
    if count['count'] > 20:
        abort(429, 'Too many sign-in attempts. Try again in 15 minutes.')
    user = get_db().users.find_one({'email': address, 'active': True})
    if not user or not check_password_hash(user['password_hash'], password):
        abort(401, 'Incorrect email or password.')
    return new_session(user)

@bp.post('/auth/refresh')
def refresh():
    same_origin()
    payload = decode(request.cookies.get(COOKIE, ''), 'refresh')
    jti = secrets.token_hex(32)
    session = get_db().sessions.find_one_and_update({
        '_id': oid(payload['sid']), 'user_id': oid(payload['sub']), 'revoked': False,
        'refresh_hash': digest(payload['jti']), 'expires_at': {'$gt': now()},
    }, {'$set': {'refresh_hash': digest(jti), 'expires_at': now() + timedelta(days=7)}}, return_document=ReturnDocument.AFTER)
    if not session:
        get_db().sessions.update_one({'_id': oid(payload['sid'])}, {'$set': {'revoked': True}})
        abort(401, 'Refresh token reused or expired. Sign in again.')
    user = get_db().users.find_one({'_id': oid(payload['sub']), 'active': True})
    if not user:
        abort(401, 'Account inactive.')
    return session_response(user, session['_id'], jti)


@bp.post('/auth/session')
def restore_session():
    """Restore a saved session, or report a normal signed-out state at startup."""
    try:
        return refresh()
    except Unauthorized:
        response, status = ok()
        response.delete_cookie(COOKIE, path='/api/auth', secure=current_app.config['COOKIE_SECURE'], httponly=True, samesite='Strict')
        return response, status


@bp.post('/auth/logout')
def logout():
    same_origin()
    if request.cookies.get(COOKIE):
        try:
            payload = decode(request.cookies[COOKIE], 'refresh')
            get_db().sessions.update_one({'_id': oid(payload['sid'])}, {'$set': {'revoked': True}})
        except Unauthorized:
            pass
    header = request.headers.get('Authorization', '')
    if header.startswith('Bearer '):
        try:
            payload = decode(header[7:], 'access')
            get_db().sessions.update_one({'_id': oid(payload['sid'])}, {'$set': {'revoked': True}})
        except Unauthorized:
            pass
    response, status = ok({'message': 'Signed out.'})
    response.delete_cookie(COOKIE, path='/api/auth', secure=current_app.config['COOKIE_SECURE'], httponly=True, samesite='Strict')
    return response, status


@bp.get('/auth/me')
@require()
def me():
    return ok(user_view(g.user))


