import jwt
from datetime import timedelta,datetime,timezone
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY=os.getenv("SECRET_KEY")

def tokenizing(email):
    payload={
        "email":email,
        "exp":datetime.now(timezone.utc)+timedelta(hours=1)
    }
    
    token=jwt.encode(payload,SECRET_KEY,algorithm="HS256")
    
    return token

def verifying_token(token):
    try:
        payload = jwt.decode(token,SECRET_KEY,algorithms=["HS256"])
        email=payload["email"]
        return email

    except (jwt.InvalidTokenError, KeyError):
        return None