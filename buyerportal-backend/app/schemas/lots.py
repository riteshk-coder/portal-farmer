from datetime import datetime
from typing import List, Optional
from pydantic import Field, field_serializer
from app.schemas.base import BaseSchema

class LotMatchResponse(BaseSchema):
    buyer_name: str
    match_score: int
    offered_price: float

    @field_serializer("offered_price")
    def serialize_price(self, price: float) -> float:
        return float(price)

class LotCreateRequest(BaseSchema):
    description: str
    variety: Optional[str] = Field(None, description="Turmeric variety e.g. Erode finger, Salem bulb")
    qty: float = Field(..., description="Quantity in metric tonnes")
    grade: str
    curcumin: Optional[float] = Field(None, description="Curcumin percentage")
    price_expectation: float = Field(..., description="Expected price in ₹ per kg")
    location: str
    harvest_date: Optional[datetime] = Field(None, description="Harvest date")
    available_date: Optional[datetime] = Field(None, description="Available date")
    notes: Optional[str] = Field(None, description="Additional notes")
    lab_report_url: Optional[str] = Field(None, description="Lab test report URL")
    product_photo: Optional[str] = Field(None, description="Product real-time photo URL")
    category_id: Optional[int] = Field(None, description="Taxonomy parent category ID")
    product_type_id: Optional[int] = Field(None, description="Taxonomy product type ID")
    custom_product_name: Optional[str] = Field(None, description="Custom product name if 'Other' is selected")

class LotUpdate(BaseSchema):
    priceExpectation: Optional[float] = None
    qty: Optional[float] = None
    grade: Optional[str] = None
    notes: Optional[str] = None
    availableDate: Optional[str] = None

class LotResponse(BaseSchema):
    id: str
    description: str
    variety: Optional[str] = None
    qty: float
    grade: str
    curcumin: Optional[float] = None
    status: str
    price_expectation: float = Field(..., serialization_alias="priceExpectation")
    location: str
    harvest_date: Optional[datetime] = Field(None, serialization_alias="harvestDate")
    available_date: Optional[datetime] = Field(None, serialization_alias="availableDate")
    notes: Optional[str] = None
    lab_report_url: Optional[str] = Field(None, serialization_alias="labReportUrl")
    product_photo: Optional[str] = Field(None, serialization_alias="productPhoto")
    fpo_name: str = Field(..., serialization_alias="fpoName")
    created_at: datetime = Field(..., serialization_alias="createdAt")
    matches: Optional[List[LotMatchResponse]] = None
    category_id: Optional[int] = Field(None, serialization_alias="categoryId")
    product_type_id: Optional[int] = Field(None, serialization_alias="productTypeId")
    custom_product_name: Optional[str] = Field(None, serialization_alias="customProductName")
    category_name: Optional[str] = Field(None, serialization_alias="categoryName")
    product_type_name: Optional[str] = Field(None, serialization_alias="productTypeName")

    @field_serializer("qty")
    def serialize_qty(self, qty: float) -> float:
        return float(qty)

    @field_serializer("price_expectation")
    def serialize_price(self, price: float) -> float:
        return float(price)

    @field_serializer("curcumin")
    def serialize_curcumin(self, val: Optional[float]) -> Optional[float]:
        return float(val) if val is not None else None

    @field_serializer("harvest_date")
    def serialize_harvest_date(self, dt: Optional[datetime]) -> Optional[str]:
        return dt.date().isoformat() if dt is not None else None

    @field_serializer("available_date")
    def serialize_available_date(self, dt: Optional[datetime]) -> Optional[str]:
        return dt.date().isoformat() if dt is not None else None

    @field_serializer("created_at")
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.isoformat()

class ProductCategoryResponse(BaseSchema):
    id: int
    name: str
    emoji: Optional[str] = None
    is_active: bool
    image_path: Optional[str] = None

class ProductTypeResponse(BaseSchema):
    id: int
    name: str
    category_id: int
    is_active: bool
    image_path: Optional[str] = None

class BuyerPreferenceRow(BaseSchema):
    category_id: Optional[int] = None
    product_type_id: Optional[int] = None
    custom_product_name: Optional[str] = None

class BuyerPreferencesResponse(BaseSchema):
    categories: List[int]
    product_types: List[int]
    rows: Optional[List[BuyerPreferenceRow]] = None

class BuyerPreferencesUpdateRequest(BaseSchema):
    categories: List[int]
    product_types: List[int]
    rows: Optional[List[BuyerPreferenceRow]] = None

class FpoPreferencesResponse(BaseSchema):
    categories: List[int]
    product_types: List[int]
    rows: Optional[List[BuyerPreferenceRow]] = None

class FpoPreferencesUpdateRequest(BaseSchema):
    categories: List[int]
    product_types: List[int]
    rows: Optional[List[BuyerPreferenceRow]] = None

class FpoOnboardingCompleteRequest(BaseSchema):
    bank_account_num: Optional[str] = None
    bank_ifsc: Optional[str] = None



