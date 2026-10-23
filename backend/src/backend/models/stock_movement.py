
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

from backend.database1 import Base


VALID_REASONS = {
    "purchase",
    "sale",
    "adjustment",
    "return",
}


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )

    quantity = Column(Integer, nullable=False)

    reason = Column(String(20), nullable=False)

    reference_id = Column(Integer, nullable=True)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
