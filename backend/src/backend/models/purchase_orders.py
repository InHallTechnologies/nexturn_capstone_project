
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
)
from backend.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'approved', 'partially_received', "
            "'received', 'cancelled')",
            name="ck_purchase_orders_status",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    supplier_id = Column(
        Integer,
        ForeignKey("suppliers.id"),
        nullable=False
    )

    status = Column(
        String(30),
        default="draft",
        nullable=False
    )

    expected_date = Column(Date, nullable=True)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
