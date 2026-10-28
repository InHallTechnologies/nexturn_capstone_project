from app.database import Base
from sqlalchemy import Integer,Column,ForeignKey,String,DateTime,Text
from datetime import datetime,timezone
 
class Inquiry(Base):
  __tablename__ = "property_inquiries"
  id = Column(Integer,primary_key=True,)
  user_id = Column(Integer,ForeignKey("users.id"),nullable=False)
  property_id = Column(Integer,ForeignKey("properties.id"), nullable=False)
  message = Column(Text,nullable=False)
  status = Column(String,default="Pending",nullable=False)
  created_at = Column(
    DateTime(timezone=True),
    default=lambda : datetime.now(timezone.utc),nullable=False
  )