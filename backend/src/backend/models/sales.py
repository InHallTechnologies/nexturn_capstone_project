
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
)

from backend.database import Base


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="ck_sales_total_amount"),
    )

    id = Column(Integer, primary_key=True, index=True)

    bill_number = Column(String(50), unique=True, nullable=False)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    total_amount = Column(Numeric(12, 2), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
