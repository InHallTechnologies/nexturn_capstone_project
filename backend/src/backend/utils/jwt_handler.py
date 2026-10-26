import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
from uuid import uuid4

load_dotenv()

SECRET_KEY=os.getenv("SECRET_KEY")
if (
    not SECRET_KEY
    or len(SECRET_KEY.encode("utf-8")) < 32
    or any(marker in SECRET_KEY.lower() for marker in ("replace", "change", "placeholder"))
):
    raise RuntimeError("SECRET_KEY must contain at least 32 bytes")

def tokenizing(email, role, token_type="access"):
    lifetime = timedelta(hours=1) if token_type == "access" else timedelta(days=7)
    payload = {
        "email": email,
        "role": role,
        "type": token_type,
        "jti": str(uuid4()),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + lifetime,
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


def decode_token(token):
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])


def verifying_token(token):
    try:
        payload = decode_token(token)
        email = payload["email"]
        return email

    except (jwt.InvalidTokenError, KeyError):
        return None