
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, Integer, String, DateTime, ForeignKey

from backend.database import Base


VALID_REASONS = {
    "purchase",
    "sale",
    "adjustment",
    "return",
}


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("quantity != 0", name="ck_stock_movements_nonzero"),
        CheckConstraint(
            "reason IN ('purchase', 'sale', 'adjustment', 'return')",
            name="ck_stock_movements_reason",
        ),
        CheckConstraint(
            "(reason = 'purchase' AND quantity > 0) OR "
            "(reason = 'sale' AND quantity < 0) OR "
            "(reason = 'return' AND quantity > 0) OR "
            "reason = 'adjustment'",
            name="ck_stock_movements_direction",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )

    quantity = Column(Integer, nullable=False)

    reason = Column(String(20), nullable=False)

    notes = Column(String(500), nullable=True)

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
