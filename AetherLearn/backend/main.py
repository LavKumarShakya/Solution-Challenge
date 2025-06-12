from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from typing import List, Optional
import uvicorn
import os
from app.routers import learning_path, auth, saved_courses, ai_tools
from app.database import init_db

# Google Custom Search API imports
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configuration
class Settings(BaseSettings):
    search_api_key: str = Field(alias='SEARCH_API_KEY')
    search_engine_id: str = Field(alias='SEARCH_ENGINE_ID')
    search_results_per_query: int = Field(default=10, alias='SEARCH_RESULTS_PER_QUERY')
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields from .env file

settings = Settings()

# Pydantic Models for Google Custom Search
class SearchQuery(BaseModel):
    query: str = Field(..., min_length=3, max_length=150)

class SearchResource(BaseModel):
    title: str
    link: str
    snippet: str
    displayLink: Optional[str] = None

class SearchResponse(BaseModel):
    resources: List[SearchResource]
    searchInformation: Optional[dict] = None

# Create FastAPI app with production settings
app = FastAPI(
    title="AetherLearn API - Google Custom Search + Vertex AI Integration",
    description="API for AetherLearn AI-Powered Learning Platform with Google Custom Search and Vertex AI Gemini",
    version="3.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

# Configure CORS for production
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")
if os.getenv("ENVIRONMENT") == "production":
    # Strict CORS for production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    # Trusted host middleware for production
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.run.app", "*.googleapis.com", "localhost"]
    )
else:
    # Permissive CORS for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(auth.router, tags=["Authentication"], prefix="/api/auth")
app.include_router(learning_path.router, tags=["Learning Path"], prefix="/api/learning-path")
app.include_router(saved_courses.router, tags=["Saved Courses"])
app.include_router(ai_tools.router, tags=["AI Tools"], prefix="/api/tools")

# NEW: Google Custom Search API Endpoint
@app.post("/api/v1/search-resources", response_model=SearchResponse, tags=["Search"])
async def search_for_resources(search_query: SearchQuery):
    """
    Search the web for educational resources using Google Custom Search API.
    Returns a structured list of search results that can be used for learning path generation.
    """
    try:
        # Build the service object for the Custom Search API
        service = build("customsearch", "v1", developerKey=settings.search_api_key)

        # Execute the search query
        # Google Custom Search API has a maximum of 10 results per request
        num_results = min(settings.search_results_per_query, 10)
        
        result = service.cse().list(
            q=search_query.query,
            cx=settings.search_engine_id,
            num=num_results
        ).execute()

        # Parse and format the results
        items = result.get('items', [])
        formatted_resources = []
        
        for item in items:
            formatted_resources.append(
                SearchResource(
                    title=item.get('title', ''),
                    link=item.get('link', ''),
                    snippet=item.get('snippet', ''),
                    displayLink=item.get('displayLink', '')
                )
            )

        if not formatted_resources:
            # Handle cases where Google finds no results
            return SearchResponse(
                resources=[],
                searchInformation=result.get('searchInformation', {})
            )

        return SearchResponse(
            resources=formatted_resources,
            searchInformation=result.get('searchInformation', {})
        )

    except HttpError as e:
        # Handle API-specific errors (e.g., quota exceeded)
        print(f"Google Custom Search API HttpError: {e}")
        raise HTTPException(
            status_code=e.resp.status,
            detail=f"Search API error: {e._get_reason()}"
        )
    except Exception as e:
        print(f"Unexpected error in search: {e}")
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred during search."
        )

@app.on_event("startup")
async def startup_db_client():
    print("🚀 Starting AetherLearn with Google Custom Search + Vertex AI Integration")
    await init_db()
    from app.database import ensure_real_data_collections
    await ensure_real_data_collections()
    print("✅ AetherLearn startup complete - Ready for Google search + AI processing")

@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": "Welcome to AetherLearn API!",
        "version": "3.0.0",
        "features": ["Google Custom Search API", "Vertex AI Gemini", "Learning Path Generation"],
        "environment": os.getenv("ENVIRONMENT", "development"),
        "status": "healthy"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring and load balancers"""
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "3.0.0",
        "timestamp": "2025-01-06T00:07:02Z"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
