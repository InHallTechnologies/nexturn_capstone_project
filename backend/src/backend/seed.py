from datetime import datetime, timezone

from backend.database1 import SessionLocal
from backend.models.user import User
from backend.utils.password import hash_password


DEMO_USERS = [
    {
        "name": "Demo Owner",
        "email": "owner@example.com",
        "password": "Owner@123",
        "role": "Owner",
    },
    {
        "name": "Demo Manager",
        "email": "manager@example.com",
        "password": "Manager@123",
        "role": "Manager",
    },
    {
        "name": "Demo Staff",
        "email": "staff@example.com",
        "password": "Staff@123",
        "role": "Staff",
    },
]


def seed_users():
    db=SessionLocal()
    try:
        for demo_user in DEMO_USERS:
            email = demo_user["email"].strip().lower()
            existing_user =db.query(User).filter_by(email=email).first()

            if existing_user:
                print(f"Already exists: {email} — skipping")
                continue

            user_document = User(
                name= demo_user["name"],
                email= email,
                password=hash_password(demo_user["password"]),
                role= demo_user["role"],
            )

            db.add(user_document)
            print(f"Created {demo_user['role']}: {email}")
        db.commit()
        print("User seeding completed.")
    except Exception:
        db.rollback()
        raise
    
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()