from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(
    title="AetherLearn API - Google Custom Search + Vertex AI Integration",
    description="API for AetherLearn AI-Powered Learning Platform with Google Custom Search and Vertex AI Gemini",
    version="3.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
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
        result = service.cse().list(
            q=search_query.query,
            cx=settings.search_engine_id,
            num=settings.search_results_per_query
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
        "features": ["Google Custom Search API", "Vertex AI Gemini", "Learning Path Generation"]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
