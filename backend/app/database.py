from sqlalchemy import create_engine
from sqlalchemy.orm import Session,declarative_base,sessionmaker
from dotenv import load_dotenv
import os
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Base = declarative_base()
SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False
)

def get_session():
  return Session(engine)