"""Flask factory, configuration and JSON API error boundary."""
import os
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask.json.provider import DefaultJSONProvider
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.exceptions import HTTPException
from db import get_db, init_db


class JSONProvider(DefaultJSONProvider):
    @staticmethod
    def default(value):
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            return value.replace(tzinfo=timezone.utc).isoformat()
        return DefaultJSONProvider.default(value)


def create_app(config=None):
    load_dotenv(Path(__file__).with_name('.env'))
    app = Flask(__name__)
    app.json = JSONProvider(app)
    app.config.from_mapping(
        MONGODB_URI=os.getenv('MONGODB_URI', 'mongodb://127.0.0.1:27017/'),
        MONGODB_DB=os.getenv('MONGODB_DB', 'cloud_kitchen'),
        JWT_SECRET=os.getenv('JWT_SECRET', ''),
        FRONTEND_ORIGIN=os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173,http://127.0.0.1:5173'),
        COOKIE_SECURE=os.getenv('COOKIE_SECURE', 'false').lower() == 'true',
        MAX_CONTENT_LENGTH=64 * 1024,
    )
    app.config.update(config or {})
    if len(app.config['JWT_SECRET']) < 32 or app.config['JWT_SECRET'].startswith('replace-'):
        raise RuntimeError('Set a random JWT_SECRET of at least 32 characters in backend/.env.')
    init_db(app)
    from auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api')
    from catalog import bp as catalog_bp
    app.register_blueprint(catalog_bp, url_prefix='/api')
    from orders import bp as orders_bp
    app.register_blueprint(orders_bp, url_prefix='/api')
    from admin import bp as admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api')

    @app.after_request
    def private_response(response):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.get('/api/health')
    def health():
        get_db().command('ping')
        return jsonify(data={'api': 'online', 'database': 'connected'}, error=None)

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(data=None, error={'message': error.description}), error.code

    @app.errorhandler(DuplicateKeyError)
    def conflict(error):
        return jsonify(data=None, error={'message': 'Record already exists or conflicts with an active assignment.'}), 409

    @app.errorhandler(PyMongoError)
    def database_error(error):
        app.logger.error('Database operation failed: %s', type(error).__name__)
        return jsonify(data=None, error={'message': 'Database unavailable. Please try again.'}), 503

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception('Unhandled API error')
        return jsonify(data=None, error={'message': 'An unexpected server error occurred.'}), 500

    return app
