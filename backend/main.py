import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.config import settings
from backend.routes import categories, advertisements, chat

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FastAPI Backend for AdBot with Microsoft SQL Server and Google Gemini AI recommendation."
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(categories.router)
app.include_router(advertisements.router)
app.include_router(chat.router)

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Mount static files and frontend pages if running from project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Serve static folders
if os.path.exists(os.path.join(BASE_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")

if os.path.exists(os.path.join(BASE_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")

if os.path.exists(os.path.join(BASE_DIR, "videos")):
    app.mount("/videos", StaticFiles(directory=os.path.join(BASE_DIR, "videos")), name="videos")

if os.path.exists(os.path.join(BASE_DIR, "images")):
    app.mount("/images", StaticFiles(directory=os.path.join(BASE_DIR, "images")), name="images")

# Serve root HTML files
from fastapi.responses import FileResponse

@app.get("/", include_in_schema=False)
def serve_home():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/categories.html", include_in_schema=False)
def serve_categories():
    return FileResponse(os.path.join(BASE_DIR, "categories.html"))

@app.get("/interests.html", include_in_schema=False)
def serve_interests():
    return FileResponse(os.path.join(BASE_DIR, "interests.html"))

@app.get("/ads.html", include_in_schema=False)
def serve_ads():
    return FileResponse(os.path.join(BASE_DIR, "ads.html"))

@app.get("/coupon.html", include_in_schema=False)
def serve_coupon():
    return FileResponse(os.path.join(BASE_DIR, "coupon.html"))

@app.get("/dashboard.html", include_in_schema=False)
def serve_dashboard():
    return FileResponse(os.path.join(BASE_DIR, "dashboard.html"))
