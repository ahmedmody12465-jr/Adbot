from fastapi import APIRouter
from backend.models import CategoriesResponse, CategoryItem
from backend.database import fetch_categories

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("", response_model=CategoriesResponse)
def get_categories():
    """Retrieve all audience and age categories."""
    categories_raw = fetch_categories()
    items = [CategoryItem(**cat) for cat in categories_raw]
    return CategoriesResponse(data=items)
