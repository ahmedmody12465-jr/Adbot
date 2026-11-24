from typing import Optional
from fastapi import APIRouter, Query
from backend.models import AdvertisementsResponse, AdvertisementItem
from backend.database import fetch_advertisements_by_category

router = APIRouter(prefix="/api/advertisements", tags=["Advertisements"])

@router.get("/{category_name}", response_model=AdvertisementsResponse)
def get_advertisements(
    category_name: str,
    interests: Optional[str] = Query(None, description="Comma-separated list of user interests")
):
    """Retrieve advertisements filtered by category name and optional interests."""
    interest_list = [i.strip() for i in interests.split(",") if i.strip()] if interests else None
    ads_raw = fetch_advertisements_by_category(category_name, interest_list)
    items = [AdvertisementItem(**ad) for ad in ads_raw]
    return AdvertisementsResponse(data=items)
