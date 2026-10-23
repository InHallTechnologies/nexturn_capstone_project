
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey

from backend.database1 import Base


class Sale(Base):
    __tablename__ = "sales"

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
