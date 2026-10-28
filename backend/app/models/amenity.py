from sqlalchemy import Column, Integer, String,ForeignKey
from app.database import Base

class Amenity(Base):
  __tablename__ = 'amenities'
  id = Column(Integer, primary_key=True)
  name = Column(String(100), unique=True, nullable=False)