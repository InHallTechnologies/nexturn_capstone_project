
from sqlalchemy import CheckConstraint, Column, Integer, Numeric, ForeignKey

from backend.database import Base


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_items_quantity"),
        CheckConstraint("price_at_sale >= 0", name="ck_sale_items_price"),
        CheckConstraint("subtotal >= 0", name="ck_sale_items_subtotal"),
    )

    id = Column(Integer, primary_key=True, index=True)

    sale_id = Column(
        Integer,
        ForeignKey("sales.id"),
        nullable=False,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )

    quantity = Column(Integer, nullable=False)

    price_at_sale = Column(Numeric(12, 2), nullable=False)

    subtotal = Column(Numeric(12, 2), nullable=False)
