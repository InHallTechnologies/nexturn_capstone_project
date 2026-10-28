from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, CheckConstraint, UniqueConstraint
from datetime import datetime, timezone
from app.database import Base
from sqlalchemy.orm import relationship

class Review(Base):
  __tablename__ = "reviews"
  id = Column(Integer, primary_key=True)
  user_id = Column(Integer,ForeignKey("users.id"),nullable=False)
  property_id  = Column(Integer,ForeignKey("properties.id"),nullable=False)
  rating = Column(Integer, nullable=False)
  comment = Column(String(1000), nullable=True)
  created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc),nullable=False)
  __table_args__ = CheckConstraint("rating >= 1 AND rating <= 5", name="check_review_rating"),UniqueConstraint("user_id", "property_id", name="unique_user_property_review")
  property = relationship(
    "Property",
    back_populates="reviews"
  )

  

