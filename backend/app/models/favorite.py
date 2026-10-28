from app.database import Base
from sqlalchemy import Integer,Column,ForeignKey,String,DateTime
from datetime import datetime,timezone
from sqlalchemy.orm import relationship
class Favorite(Base):
  __tablename__ = "favorites"
  id = Column(Integer,primary_key=True)
  user_id = Column(Integer,ForeignKey("users.id"),nullable=False)
  property_id = Column(Integer,ForeignKey("properties.id"),nullable=False)
  user = relationship("User")
  property = relationship("Property")
  