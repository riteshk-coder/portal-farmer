from sqlalchemy import Column, String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductType(Base):
    __tablename__ = "product_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    image_path = Column(String, nullable=True)

    category = relationship("ProductCategory", back_populates="product_types")
