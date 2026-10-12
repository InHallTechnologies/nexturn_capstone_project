from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

Mongo_url=os.getenv("Mongo_url")

mongo_client=MongoClient(Mongo_url)

database=mongo_client["retail_inventory_db"]

users_collection = database["users"]
categories_collection = database["categories"]
products_collection = database["products"]
suppliers_collection=database["suppliers"]
purchase_orders_collection=database["purchase_orders"]
stock_movements_collection=database["stock_movements"]
sales_collection=database["sales"]
sale_items_collection=database["sale_items"]

users_collection.create_index(
    [("email", 1)],
    unique=True
)
