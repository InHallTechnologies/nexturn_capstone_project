
from backend.database1 import Base, engine
from backend.models.user import User

Base.metadata.create_all(bind=engine)

print("Users table created successfully!")