
from sqlalchemy import inspect, text

from backend.database import Base, engine
from backend.models.user import User
from backend.models.category import Category
from backend.models.products import Product
from backend.models.purchase_orders import PurchaseOrder
from backend.models.purchase_order_item import PurchaseOrderItem
from backend.models.sale_items import SaleItem
from backend.models.sales import Sale
from backend.models.stock_movement import StockMovement
from backend.models.supplier import Supplier
from backend.models.token_blocklist import TokenBlocklist


Base.metadata.create_all(bind=engine)

if "notes" not in {
    column["name"] for column in inspect(engine).get_columns("stock_movements")
}:
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE stock_movements ADD COLUMN notes VARCHAR(500)")
        )

print("table created successfully!")