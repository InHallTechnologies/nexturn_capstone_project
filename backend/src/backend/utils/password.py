import hashlib

import bcrypt
from werkzeug.security import check_password_hash


def hash_password(password):
    password_bytes = hashlib.sha256(password.encode("utf-8")).digest()
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(hashed_password, password):
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        password_bytes = hashlib.sha256(password.encode("utf-8")).digest()
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))

    return check_password_hash(hashed_password, password)