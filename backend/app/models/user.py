from sqlalchemy import Integer, String,Column,Boolean
from app.database import Base

class User(Base):
  __tablename__ = 'users'
  id = Column(Integer,primary_key=True)
  username = Column(String,unique=True,nullable=False)
  email = Column(String,unique=True,nullable=False)
  password_hash = Column(String,nullable=False)
  role = Column(String,nullable=False,default="seeker")
  phone = Column(String)
  verified = Column(Boolean,default=False)



  