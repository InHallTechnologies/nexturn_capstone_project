import bcrypt
from werkzeug.security import check_password_hash


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(hashed_password, password):
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except ValueError:
            return False
    return check_password_hash(hashed_password, password)


def is_bcrypt_hash(hashed_password):
    return hashed_password.startswith(("$2a$", "$2b$", "$2y$"))