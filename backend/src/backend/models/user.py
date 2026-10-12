from datetime import datetime, timezone


def create_user_document(name, email, hashed_password, role):
    return {
        "name": name.strip(),
        "email": email.strip().lower(),
        "password": hashed_password,
        "role": role,
        "created_at": datetime.now(timezone.utc)
    }