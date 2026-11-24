import json
import logging
from typing import Optional, List, Dict, Any, Tuple
from google import genai
from google.genai import types
from backend.config import settings
from backend.database import fetch_all_advertisements

logger = logging.getLogger(__name__)

def get_gemini_client() -> Optional[genai.Client]:
    """Initialize Google GenAI client if API key is provided."""
    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not configured. Running chatbot in offline rule-based mode.")
        return None
    try:
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.error("Failed to initialize Google GenAI Client: %s", str(e))
        return None

def determine_age_group(user_age: Optional[int], age_group: Optional[str]) -> str:
    """Helper to resolve age category based on numeric age or explicit selection."""
    if age_group:
        return age_group.capitalize()
    
    if user_age is not None:
        if user_age <= 12:
            return "Children"
        elif 13 <= user_age <= 19:
            return "Teenagers"
        else:
            return "Adults"
            
    return "General"

def generate_ad_recommendation(
    user_message: str,
    age_group: Optional[str] = None,
    user_age: Optional[int] = None,
    interests: Optional[List[str]] = None
) -> Tuple[str, str, List[str], List[Dict[str, Any]]]:
    """
    Generate personalized ad recommendation using Google Gemini API or intelligent fallback.
    Returns: (bot_reply, resolved_age_group, detected_interests, recommended_ads)
    """
    resolved_group = determine_age_group(user_age, age_group)
    selected_interests = interests or []
    all_ads = fetch_all_advertisements()
    
    # Filter candidate ads matching category and interests
    matching_ads = [
        ad for ad in all_ads
        if ad.get("category_name", "").lower() == resolved_group.lower()
    ]
    if selected_interests and matching_ads:
        interest_set = {i.lower() for i in selected_interests}
        interest_matched = [
            ad for ad in matching_ads
            if interest_set.intersection({x.lower() for x in ad.get("interests", [])})
        ]
        if interest_matched:
            matching_ads = interest_matched
    if not matching_ads:
        matching_ads = all_ads[:2]

    client = get_gemini_client()
    
    if client:
        try:
            # System instruction providing context of available ads
            ads_context = json.dumps([
                {
                    "ad_id": a["ad_id"],
                    "title": a["title"],
                    "description": a["description"],
                    "category": a.get("category_name", "General"),
                    "interests": a.get("interests", [])
                }
                for a in all_ads
            ], indent=2)

            system_instruction = (
                "You are AdBot AI, a friendly, bilingual (English & Arabic) shopping and promotional assistant. "
                "Your role is to recommend relevant deals, video advertisements, and activities based on the "
                "user's category/age group and personal interests (Gaming, Food, Entertainment, Shopping, Travel).\n"
                f"Available advertisement catalog:\n{ads_context}\n\n"
                "Reply in the same language the user writes in (Arabic or English). "
                "Keep responses polite, exciting, and concise (2-4 sentences max). "
                "Mention the title of recommended offers clearly."
            )

            prompt = (
                f"User category/age group: {resolved_group}\n"
                f"User interests: {', '.join(selected_interests) if selected_interests else 'Any'}\n"
                f"User input message: {user_message}\n\n"
                "Please recommend the best matching offers from the catalog for this user."
            )

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
            )

            reply_text = response.text.strip()
            return reply_text, resolved_group, selected_interests, matching_ads[:2]

        except Exception as e:
            logger.error("Gemini API generation error: %s", str(e))
            # Fall through to fallback

    # Rule-based fallback when Gemini API key is absent or call fails
    bot_reply = (
        f"Hello! Based on the {resolved_group} category, I found great matching offers for you! "
        f"Check out '{matching_ads[0]['title']}' - {matching_ads[0]['description']}"
    ) if matching_ads else "Welcome to AdBot! Please select a category to view customized advertisements."

    return bot_reply, resolved_group, selected_interests, matching_ads[:2]
