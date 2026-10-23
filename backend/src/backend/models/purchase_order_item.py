
from sqlalchemy import Column, Integer, Numeric, ForeignKey

from backend.database1 import Base


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)

    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=False,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )

    ordered_qty = Column(Integer, nullable=False)

    received_qty = Column(Integer, default=0, nullable=False)

    unit_cost = Column(Numeric(12, 2), nullable=False)
