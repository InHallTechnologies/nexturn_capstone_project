import os

from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "mini_lms")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not configured.")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not configured.")
