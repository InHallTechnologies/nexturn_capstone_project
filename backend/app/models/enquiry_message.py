from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class EnquiryMessage(Base):
    __tablename__ = "enquiry_messages"

    id = Column(Integer, primary_key=True, index=True)

    enquiry_id = Column(
        Integer,
        ForeignKey("enquiries.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    message = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    enquiry = relationship("Enquiry", back_populates="messages")

    sender = relationship(
        "User",
        foreign_keys=[sender_id]
    )

