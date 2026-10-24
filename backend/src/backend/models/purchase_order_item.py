
from sqlalchemy import CheckConstraint, Column, Integer, Numeric, ForeignKey

from backend.database import Base


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    __table_args__ = (
        CheckConstraint("ordered_qty > 0", name="ck_po_items_ordered_qty"),
        CheckConstraint("received_qty >= 0", name="ck_po_items_received_qty"),
        CheckConstraint(
            "received_qty <= ordered_qty",
            name="ck_po_items_received_not_over_ordered",
        ),
    )

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
