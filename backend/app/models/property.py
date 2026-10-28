
from datetime import datetime, timezone

from app.database import Base
from sqlalchemy import (
    Integer,
    String,
    Column,
    ForeignKey,
    Date,
    Numeric,
    DateTime,
)
from sqlalchemy.orm import relationship


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    type = Column(String(30), nullable=False)
    city = Column(String(100), nullable=False)
    locality = Column(String(100), nullable=False)
    rent = Column(Numeric(10, 2), nullable=False)
    deposit = Column(Numeric(10, 2), nullable=False)
    bhk = Column(Integer, nullable=True)
    area = Column(Numeric(10, 2), nullable=False)
    furnishing = Column(String(30), nullable=False)
    available_from = Column(Date, nullable=False)

    status = Column(String(20), nullable=False, default="pending")
    view_count = Column(Integer, nullable=False, default=0)

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

    rejection_reason = Column(String, nullable=True)

    # Delete associated images when the property is deleted.
    images = relationship(
        "PropertyImage",
        back_populates="property",
        cascade="all, delete-orphan",
    )

    # Delete property-amenity association records when the property is deleted.
    property_amenities = relationship(
        "PropertyAmenity",
        back_populates="property",
        cascade="all, delete-orphan",
    )
    reviews = relationship(
    "Review",
    back_populates="property",
    cascade="all, delete-orphan"
    )

