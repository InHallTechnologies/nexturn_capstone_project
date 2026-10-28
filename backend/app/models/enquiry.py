
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)

    seeker_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    property_id = Column(
        Integer,
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False
    )

    status = Column(String(20), nullable=False, default="open")

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

    seeker = relationship("User", foreign_keys=[seeker_id])

    property = relationship("Property", foreign_keys=[property_id])

    messages = relationship(
        "EnquiryMessage",
        back_populates="enquiry",
        cascade="all, delete-orphan",
        order_by="EnquiryMessage.created_at"
    )

