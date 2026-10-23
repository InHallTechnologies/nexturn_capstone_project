
from backend.database1 import Base, engine
from backend.models.user import User
from backend.models.category import Category
from backend.models.products import Product
from backend.models.purchase_orders import PurchaseOrder
from backend.models.purchase_order_item import PurchaseOrderItem
from backend.models.sale_items import SaleItem
from backend.models.sales import Sale
from backend.models.stock_movement import StockMovement
from backend.models.supplier import Supplier


Base.metadata.create_all(bind=engine)

print("table created successfully!")