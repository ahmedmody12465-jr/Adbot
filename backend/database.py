import logging
from typing import List, Dict, Any, Optional
import pyodbc
from backend.config import settings

logger = logging.getLogger(__name__)

# Fallback in-memory catalog used when SQL Server is not yet running/configured
DEFAULT_CATEGORIES = [
    {"category_id": 1, "category_name": "Children", "description": "Fun offers and exciting experiences for children.", "icon": "🧒"},
    {"category_id": 2, "category_name": "Teenagers", "description": "Discover exciting deals and trendy offers.", "icon": "🧑"},
    {"category_id": 3, "category_name": "Adults", "description": "Explore products and offers made for adults.", "icon": "👨"},
    {"category_id": 4, "category_name": "Family", "description": "Enjoy special offers for the whole family.", "icon": "👨‍👩‍👧‍👦"},
    {"category_id": 5, "category_name": "Friends", "description": "Find great deals to enjoy with your friends.", "icon": "👫"},
    {"category_id": 6, "category_name": "Visitors", "description": "Discover interesting offers and experiences.", "icon": "👋"}
]

DEFAULT_ADVERTISEMENTS = [
    {"ad_id": 1, "title": "Kids Fun Zone & Arcade", "description": "Fun playground games, interactive activities, and arcade surprises for kids.", "video_url": "videos/children.mp4", "category_name": "Children", "target_age_group": "Children", "interests": ["Gaming", "Travel"]},
    {"ad_id": 2, "title": "Children Story & Cartoon World", "description": "Magical stories and creative animation experiences for young minds.", "video_url": "videos/children2.mp4", "category_name": "Children", "target_age_group": "Children", "interests": ["Entertainment", "Shopping"]},
    {"ad_id": 3, "title": "Kids Toy & Gift Wonderland", "description": "Special discounts on educational toys, games, and gifts for children.", "video_url": "videos/children3.mp4", "category_name": "Children", "target_age_group": "Children", "interests": ["Shopping", "Gaming"]},
    {"ad_id": 4, "title": "Sweet Treats & Kids Meal Deals", "description": "Delicious kids meals, ice cream, and fun family restaurant treats.", "video_url": "videos/children4.mp4", "category_name": "Children", "target_age_group": "Children", "interests": ["Food", "Entertainment"]},
    {"ad_id": 5, "title": "Junior Adventure & Play Park", "description": "Exciting outdoor rides, kids theme park passes, and weekend fun.", "video_url": "videos/children5.mp4", "category_name": "Children", "target_age_group": "Children", "interests": ["Travel", "Entertainment"]},
    {"ad_id": 6, "title": "Youth Tech & Gaming Hub", "description": "Latest gaming consoles, gadgets, and trendy tech deals for teenagers.", "video_url": "videos/visitors.mp4", "category_name": "Teenagers", "target_age_group": "Teenagers", "interests": ["Gaming", "Shopping"]},
    {"ad_id": 7, "title": "Cinema & Music Hangout Pass", "description": "Student discounts on movie tickets, live music nights, and snacks.", "video_url": "videos/visitors5.mp4", "category_name": "Teenagers", "target_age_group": "Teenagers", "interests": ["Entertainment", "Food"]},
    {"ad_id": 8, "title": "Streetwear & Trendy Gear Sale", "description": "Fresh fashion, sneakers, and accessories curated for teens.", "video_url": "videos/visitors2.mp4", "category_name": "Teenagers", "target_age_group": "Teenagers", "interests": ["Shopping", "Entertainment"]},
    {"ad_id": 9, "title": "VR Arena & Adventure Park", "description": "High-energy VR gaming sessions and thrill rides for teens.", "video_url": "videos/children5.mp4", "category_name": "Teenagers", "target_age_group": "Teenagers", "interests": ["Travel", "Gaming"]},
    {"ad_id": 10, "title": "Burger & Boba Teen Combos", "description": "Exclusive teen hangout combos at top burger spots and boba cafes.", "video_url": "videos/children4.mp4", "category_name": "Teenagers", "target_age_group": "Teenagers", "interests": ["Food", "Entertainment"]},
    {"ad_id": 11, "title": "Gourmet Dining Experience", "description": "Fine dining and exclusive discounts at top-tier restaurants for adults.", "video_url": "videos/visitors2.mp4", "category_name": "Adults", "target_age_group": "Adults", "interests": ["Food", "Travel"]},
    {"ad_id": 12, "title": "Smart Gadgets & Lifestyle Store", "description": "Exclusive offers on smartwatches, audio gear, and tech accessories.", "video_url": "videos/visitors.mp4", "category_name": "Adults", "target_age_group": "Adults", "interests": ["Gaming", "Shopping"]},
    {"ad_id": 13, "title": "Luxury Getaway & City Tours", "description": "Curated weekend trips, boutique stays, and guided city experiences.", "video_url": "videos/visitors4.mp4", "category_name": "Adults", "target_age_group": "Adults", "interests": ["Travel", "Food"]},
    {"ad_id": 14, "title": "VIP Cinema & Live Shows", "description": "Premium theater seating, concerts, and cultural night passes.", "video_url": "videos/visitors3.mp4", "category_name": "Adults", "target_age_group": "Adults", "interests": ["Entertainment", "Food"]},
    {"ad_id": 15, "title": "Family Weekend Adventure Park", "description": "Special family packages, theme park passes, and bundle discounts.", "video_url": "videos/visitors3.mp4", "category_name": "Family", "target_age_group": "Family", "interests": ["Travel", "Entertainment"]},
    {"ad_id": 16, "title": "Family Feast & Restaurant Bundle", "description": "Save big on family-sized meals and weekend dining bundles.", "video_url": "videos/children4.mp4", "category_name": "Family", "target_age_group": "Family", "interests": ["Food", "Shopping"]},
    {"ad_id": 17, "title": "Family Movie Night & Arcade", "description": "Combo tickets for family blockbusters plus arcade game tokens.", "video_url": "videos/children2.mp4", "category_name": "Family", "target_age_group": "Family", "interests": ["Entertainment", "Gaming"]},
    {"ad_id": 18, "title": "Family Mall & Gift Shopping", "description": "Bundle offers on apparel, toys, and home essentials for the whole family.", "video_url": "videos/children3.mp4", "category_name": "Family", "target_age_group": "Family", "interests": ["Shopping", "Travel"]},
    {"ad_id": 19, "title": "Friends Cafe & Lounge Deals", "description": "Group discounts on cafes, restaurants, and hangout spots for friends.", "video_url": "videos/visitors5.mp4", "category_name": "Friends", "target_age_group": "Friends", "interests": ["Food", "Entertainment"]},
    {"ad_id": 20, "title": "Multiplayer Gaming & Bowling Night", "description": "Squad packages for esports lounges, bowling alleys, and arcades.", "video_url": "videos/visitors.mp4", "category_name": "Friends", "target_age_group": "Friends", "interests": ["Gaming", "Entertainment"]},
    {"ad_id": 21, "title": "Group Roadtrip & Escape Rooms", "description": "Discounted group adventures, escape rooms, and weekend day trips.", "video_url": "videos/visitors4.mp4", "category_name": "Friends", "target_age_group": "Friends", "interests": ["Travel", "Gaming"]},
    {"ad_id": 22, "title": "Group Shopping & Fashion Deals", "description": "Buy-more-save-more fashion and lifestyle vouchers for friend groups.", "video_url": "videos/visitors2.mp4", "category_name": "Friends", "target_age_group": "Friends", "interests": ["Shopping", "Food"]},
    {"ad_id": 23, "title": "City Explorer Sightseeing Pass", "description": "Tour popular city landmarks and attractions with visitor-exclusive offers.", "video_url": "videos/visitors4.mp4", "category_name": "Visitors", "target_age_group": "Visitors", "interests": ["Travel", "Entertainment"]},
    {"ad_id": 24, "title": "Local Cuisine & Fine Dining Tour", "description": "Taste authentic local dishes and top-rated restaurants at special prices.", "video_url": "videos/visitors2.mp4", "category_name": "Visitors", "target_age_group": "Visitors", "interests": ["Food", "Travel"]},
    {"ad_id": 25, "title": "Souvenir & Duty-Free Shopping", "description": "Visitor discounts on gifts, crafts, and duty-free mall boutiques.", "video_url": "videos/visitors5.mp4", "category_name": "Visitors", "target_age_group": "Visitors", "interests": ["Shopping", "Travel"]},
    {"ad_id": 26, "title": "Cultural Shows & Entertainment Pass", "description": "Live performances, museums, and evening entertainment for visitors.", "video_url": "videos/visitors3.mp4", "category_name": "Visitors", "target_age_group": "Visitors", "interests": ["Entertainment", "Gaming"]}
]

def get_connection_string() -> str:
    """Build ODBC connection string for Microsoft SQL Server."""
    conn_str = (
        f"DRIVER={{{settings.MSSQL_DRIVER}}};"
        f"SERVER={settings.MSSQL_SERVER},{settings.MSSQL_PORT};"
        f"DATABASE={settings.MSSQL_DATABASE};"
        f"UID={settings.MSSQL_USER};"
        f"PWD={settings.MSSQL_PASSWORD};"
        f"TrustServerCertificate={settings.MSSQL_TRUST_CERT};"
    )
    return conn_str

def get_db_connection() -> Optional[pyodbc.Connection]:
    """Attempts to establish connection to Microsoft SQL Server."""
    try:
        conn = pyodbc.connect(get_connection_string(), timeout=3)
        return conn
    except Exception as e:
        logger.warning(
            "SQL Server not connected (%s). Falling back to local data store.",
            str(e)
        )
        return None

def fetch_categories() -> List[Dict[str, Any]]:
    """Retrieve all categories from SQL Server or fallback dataset."""
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT category_id, category_name, description, icon FROM categories")
            rows = cursor.fetchall()
            return [
                {
                    "category_id": row[0],
                    "category_name": row[1],
                    "description": row[2] if len(row) > 2 else None,
                    "icon": row[3] if len(row) > 3 else None
                }
                for row in rows
            ]
        except Exception as e:
            logger.error("Error executing query on categories: %s", str(e))
        finally:
            conn.close()
            
    return DEFAULT_CATEGORIES

def fetch_advertisements_by_category(
    category_name: str,
    interests: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Retrieve advertisements matching a category name and optional interests."""
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                SELECT a.ad_id, a.title, a.description, a.video_url, c.category_name
                FROM advertisements a
                JOIN categories c ON a.category_id = c.category_id
                WHERE LOWER(c.category_name) = LOWER(?)
            """
            cursor.execute(query, (category_name,))
            rows = cursor.fetchall()
            return [
                {
                    "ad_id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "video_url": row[3],
                    "category_name": row[4],
                    "target_age_group": row[4],
                    "interests": []
                }
                for row in rows
            ]
        except Exception as e:
            logger.error("Error executing query on advertisements: %s", str(e))
        finally:
            conn.close()

    # Fallback filter by category
    category_ads = [
        ad for ad in DEFAULT_ADVERTISEMENTS
        if ad["category_name"].lower() == category_name.lower()
    ]
    if not interests:
        return category_ads

    interest_set = {i.strip().lower() for i in interests if i.strip()}
    matched = [
        ad for ad in category_ads
        if interest_set.intersection({x.lower() for x in ad.get("interests", [])})
    ]
    return matched if matched else category_ads

def fetch_all_advertisements() -> List[Dict[str, Any]]:
    """Retrieve all advertisements across all categories."""
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            query = """
                SELECT a.ad_id, a.title, a.description, a.video_url, c.category_name
                FROM advertisements a
                LEFT JOIN categories c ON a.category_id = c.category_id
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            return [
                {
                    "ad_id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "video_url": row[3],
                    "category_name": row[4],
                    "target_age_group": row[4]
                }
                for row in rows
            ]
        except Exception as e:
            logger.error("Error fetching all advertisements: %s", str(e))
        finally:
            conn.close()

    return DEFAULT_ADVERTISEMENTS
