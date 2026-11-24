from pydantic import BaseModel, Field
from typing import List, Optional

class CategoryItem(BaseModel):
    category_id: int
    category_name: str
    description: Optional[str] = None
    icon: Optional[str] = None

class CategoriesResponse(BaseModel):
    message: str = "Categories retrieved successfully!"
    data: List[CategoryItem]

class AdvertisementItem(BaseModel):
    ad_id: int
    title: str
    description: str
    video_url: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    target_age_group: Optional[str] = None
    interests: List[str] = []

class AdvertisementsResponse(BaseModel):
    message: str = "Advertisements retrieved successfully!"
    data: List[AdvertisementItem]

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message or prompt")
    age_group: Optional[str] = Field(None, description="Selected age category (e.g. Children, Teenagers, Adults, Family)")
    user_age: Optional[int] = Field(None, description="Optional numerical age if provided by user")
    interests: Optional[List[str]] = Field(default=None, description="Optional list of user interests")

class ChatResponse(BaseModel):
    reply: str
    detected_age_group: Optional[str] = None
    detected_interests: List[str] = []
    recommended_ads: List[AdvertisementItem] = []
