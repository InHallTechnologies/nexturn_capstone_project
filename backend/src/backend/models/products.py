
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey

from backend.database1 import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    sku = Column(String(50), unique=True, nullable=False)

    name = Column(String(150), nullable=False)

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False,
    )

    unit = Column(String(30), nullable=False)

    cost_price = Column(Numeric(12, 2), nullable=False)

    selling_price = Column(Numeric(12, 2), nullable=False)

    reorder_level = Column(Integer, default=0, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
