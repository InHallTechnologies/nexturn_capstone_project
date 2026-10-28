
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class PropertyAmenity(Base):
    __tablename__ = "property_amenity"

    property_id = Column(
        Integer,
        ForeignKey("properties.id"),
        primary_key=True,
    )

    amenity_id = Column(
        Integer,
        ForeignKey("amenities.id"),
        primary_key=True,
    )

    property = relationship(
        "Property",
        back_populates="property_amenities",
    )

