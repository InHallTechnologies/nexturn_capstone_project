from app.database import Base
from sqlalchemy import Integer,Column,ForeignKey,String,DateTime
from datetime import datetime,timezone
from sqlalchemy.orm import relationship
class PropertyImage(Base):
  __tablename__ = "propertyimages"
  id = id = Column(Integer,
  primary_key=True)
  property_id = Column(Integer,ForeignKey("properties.id"),nullable=False)
  image_url = Column(String,nullable=False)
  created_at = Column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc),nullable=False)
  property = relationship(
    "Property",
    back_populates="images"
  )




