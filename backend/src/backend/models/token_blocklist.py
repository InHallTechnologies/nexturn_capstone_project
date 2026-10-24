from sqlalchemy import Column, DateTime, String

from backend.database import Base


class TokenBlocklist(Base):
    __tablename__ = "token_blocklist"

    jti = Column(String(36), primary_key=True)
    token_type = Column(String(20), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
