from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductCategory(Base):
    __tablename__ = "product_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    emoji = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    image_path = Column(String, nullable=True)

    product_types = relationship("ProductType", back_populates="category", cascade="all, delete-orphan")

