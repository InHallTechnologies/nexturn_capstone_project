from pymongo import MongoClient

from .config import MONGO_URI, MONGO_DB

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[MONGO_DB]
