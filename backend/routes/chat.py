from fastapi import APIRouter
from backend.models import ChatRequest, ChatResponse, AdvertisementItem
from backend.services.gemini_service import generate_ad_recommendation

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

@router.post("", response_model=ChatResponse)
def chat_recommendation(request: ChatRequest):
    """
    Accepts user message, optional age group or numeric age,
    and returns Gemini AI recommendations with matching advertisements.
    """
    reply, resolved_group, detected_interests, matching_ads = generate_ad_recommendation(
        user_message=request.message,
        age_group=request.age_group,
        user_age=request.user_age,
        interests=request.interests
    )
    
    ad_items = [AdvertisementItem(**ad) for ad in matching_ads]
    
    return ChatResponse(
        reply=reply,
        detected_age_group=resolved_group,
        detected_interests=detected_interests,
        recommended_ads=ad_items
    )
