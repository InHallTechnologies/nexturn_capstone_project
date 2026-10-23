
from sqlalchemy import Column, Integer, Numeric, ForeignKey

from backend.database1 import Base


class SaleItem(Base):
    __tablename__ = "sale_items"

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
