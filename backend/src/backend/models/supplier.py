from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime

from backend.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    contact = Column(String(30), default="", nullable=False)
    email = Column(String(255), default="", nullable=False)
    address = Column(String(500), default="", nullable=False)
    payment_terms = Column(String(100), default="", nullable=False)

    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc),nullable=False,)
    
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
