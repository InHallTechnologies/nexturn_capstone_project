"""Repeatable demo seed: inserts missing records without resetting edited data."""
import os
from werkzeug.security import generate_password_hash
from app import create_app
from common import now
from db import get_db


def seed():
    db = get_db()
    password = os.getenv('DEMO_PASSWORD', 'KitchenDemo123!')
    for role, name in [('customer', 'Aarav Sharma'), ('kitchen', 'Chef Priya'), ('delivery', 'Rohan Kumar'), ('admin', 'Operations Admin')]:
        db.users.update_one({'email': f'{role}@cloudkitchen.local'}, {'$setOnInsert': {
            'email': f'{role}@cloudkitchen.local', 'name': name, 'role': role, 'active': True,
            'password_hash': generate_password_hash(password, method='scrypt'), 'created_at': now(),
        }}, upsert=True)
    foods = [
        ('Paneer tikka bowl', 'Bowls', 24900, True, 'Smoky paneer, saffron rice, crunchy slaw and mint chutney.', 'photo-1546833999-b9f581a1996d'),
        ('Butter chicken', 'Curries', 32900, False, 'Tandoor-roasted chicken in a slow-simmered tomato and butter gravy.', 'photo-1603894584373-5ac82b2ae398'),
        ('Hyderabadi biryani', 'Biryani', 29900, False, 'Fragrant basmati, spiced chicken, fried onions and cooling raita.', 'photo-1631515243349-e0cb75fb8d3a'),
        ('Garden harvest bowl', 'Bowls', 21900, True, 'Roasted seasonal vegetables, chickpeas and lemon tahini dressing.', 'photo-1512621776951-a57141f2eefd'),
        ('Classic margherita', 'Pizza', 27900, True, 'Stone-baked crust, tomato, mozzarella and fresh basil.', 'photo-1574071318508-1cdbab80d002'),
        ('Chocolate brownie', 'Desserts', 12900, True, 'A rich, fudgy chocolate brownie baked fresh in our kitchen.', 'photo-1606313564200-e75d5e30476c'),
    ]
    for name, category, price, veg, description, photo in foods:
        image = f'https://images.unsplash.com/{photo}?auto=format&fit=crop&w=800&q=80'
        db.menu.update_one({'name': name}, {'$setOnInsert': {
            'name': name, 'category': category, 'price': price, 'veg': veg, 'available': True,
            'description': description, 'image': image,
            'created_at': now(),
        }}, upsert=True)
        # Repair the original broken demo URL without replacing customized images.
        if name == 'Hyderabadi biryani':
            db.menu.update_one({'name': name, 'image': {
                '$regex': r'^https://images\.unsplash\.com/photo-1563379091339-03246963d96c(?:\?|$)',
            }}, {'$set': {'image': image}})
    customer = db.users.find_one({'email': 'customer@cloudkitchen.local'})
    db.addresses.update_one({'user_id': customer['_id'], 'label': 'Home'}, {'$setOnInsert': {
        'user_id': customer['_id'], 'label': 'Home', 'line': '42, Green Park Main, New Delhi 110016',
        'phone': '9876543210', 'created_at': now(),
    }}, upsert=True)


if __name__ == '__main__':
    with create_app().app_context():
        seed()
        print('Demo users, menu and customer address are ready. Existing records were preserved.')
