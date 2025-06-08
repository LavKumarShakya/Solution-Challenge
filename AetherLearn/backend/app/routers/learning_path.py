from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import FileResponse
from typing import Optional, List
import uuid
from datetime import datetime
from app.database import db
from models.learning_path import (
    LearningPathCreate,
    LearningPathCustomize,
    LearningPath,
    SearchStatus,
    SearchStatusUpdate
)
from app.routers.auth import get_current_active_user
from models.user import User
from utils.search_manager import SearchManager
from utils.vertex_ai import VertexAIClient
from utils.pdf_generator import PDFGenerator

router = APIRouter()
search_manager = SearchManager()
vertex_ai = VertexAIClient()
pdf_generator = PDFGenerator()

# In-memory storage for queries (for mock testing when database unavailable)
mock_search_data = {}

@router.post("/search", status_code=status.HTTP_202_ACCEPTED)
async def create_learning_path(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Initiate a search for creating a learning path based on the query.
    This is an asynchronous operation.
    """
    # Parse JSON body manually
    try:
        request_data = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {str(e)}"
        )
    
    # Extract data from request
    query = request_data.get("query")
    preferences = request_data.get("preferences", {})
    
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query is required"
        )
    
    search_id = str(uuid.uuid4())
    user_id = None  # No user authentication for public endpoint
    
    # Store query data for mock testing (when database unavailable)
    mock_search_data[search_id] = {
        "query": query,
        "preferences": preferences,
        "created_at": datetime.utcnow()
    }
    
    # Create status document (only if database is available)
    status_doc = {
        "search_id": search_id,
        "user_id": user_id,
        "query": query,
        "status": "INITIATED",
        "progress": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "message": "Search initiated"
    }
    
    # Try to insert status into database if available
    try:
        if db is not None:
            await db.search_status.insert_one(status_doc)
    except Exception as e:
        print(f"Database insert failed: {e}")
        # Continue without database for testing
    
    # Start the search process in the background (mock for now)
    # background_tasks.add_task(
    #     search_manager.process_search,
    #     search_id=search_id,
    #     query=query,
    #     user_id=user_id,
    #     preferences=preferences
    # )
    
    return {"search_id": search_id, "message": "Search initiated successfully"}

@router.get("/status/{search_id}")
async def get_search_status(search_id: str):
    """
    Get the current status of a learning path search.
    """
    # Handle case when database is not available
    if db is None:
        # Get stored query data for mock response
        search_data = mock_search_data.get(search_id, {"query": "Unknown query", "preferences": {}})
        return {
            "search_id": search_id,
            "user_id": None,
            "query": search_data["query"],
            "status": "COMPLETED",
            "progress": 100,
            "message": "Learning path generation completed (mock response)",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
            "is_customization": False,
            "original_path_id": None,
            "learning_path_id": f"mock_path_{search_id}"
        }
    
    try:
        status = await db.search_status.find_one({"search_id": search_id})
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Search with ID {search_id} not found"
            )
        
        return status
    except Exception as e:
        # Fallback to mock response if database operation fails
        return {
            "search_id": search_id,
            "user_id": None,
            "query": "Mock query",
            "status": "COMPLETED",
            "progress": 100,
            "message": "Learning path generation completed (mock response)",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
            "is_customization": False,
            "original_path_id": None,
            "learning_path_id": f"mock_path_{search_id}"
        }

@router.get("/{learning_path_id}")
async def get_learning_path(learning_path_id: str):
    """
    Get a specific learning path by ID.
    """
    # Handle case when database is not available or for mock testing
    if db is None or learning_path_id.startswith("mock_path_"):
        # Extract search_id from learning_path_id to get stored query
        search_id = learning_path_id.replace("mock_path_", "") if learning_path_id.startswith("mock_path_") else learning_path_id
        search_data = mock_search_data.get(search_id, {"query": "Sample Learning Topic", "preferences": {}})
        user_query = search_data["query"]
        
        # Return mock learning path for testing with actual user query
        return {
            "id": learning_path_id,
            "user_id": None,
            "query": user_query,
            "title": f"Complete {user_query} Learning Path",
            "description": f"A comprehensive learning path covering {user_query.lower()} fundamentals, concepts, and practical applications.",
            "modules": [
                {
                    "id": "module_1",
                    "title": "Introduction to Machine Learning",
                    "description": "Learn the basics of machine learning and its applications",
                    "order": 1,
                    "resources": [
                        {
                            "id": "resource_1",
                            "title": "Machine Learning Explained - A Complete Guide",
                            "url": "https://example.com/ml-guide",
                            "resource_type": "video",
                            "source": "YouTube",
                            "estimated_time_minutes": 45,
                            "difficulty": "Beginner",
                            "description": "Comprehensive introduction to machine learning concepts",
                            "quality_score": 0.9,
                            "metadata": {},
                            "created_at": "2024-01-01T00:00:00"
                        }
                    ]
                }
            ],
            "estimated_hours": 8.5,
            "difficulty": "Beginner",
            "prerequisites": [],
            "is_public": True,
            "preferences": {},
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
    
    try:
        path = await db.learning_paths.find_one({"_id": learning_path_id})
        if not path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning path with ID {learning_path_id} not found"
            )
        
        return path
    except Exception as e:
        # Fallback to mock learning path
        return {
            "id": learning_path_id,
            "user_id": None,
            "query": "Sample Learning Topic",
            "title": "Sample Learning Path",
            "description": "A sample learning path for testing purposes.",
            "modules": [],
            "estimated_hours": 5.0,
            "difficulty": "Beginner",
            "prerequisites": [],
            "is_public": True,
            "preferences": {},
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }

@router.post("/customize", response_model=LearningPath)
async def customize_learning_path(
    request: LearningPathCustomize,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    Customize an existing learning path with new preferences.
    """
    # Check if the learning path exists and belongs to the user
    path = await db.learning_paths.find_one({"_id": request.learning_path_id})
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {request.learning_path_id} not found"
        )
    
    if not path["is_public"] and str(path["user_id"]) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to customize this learning path"
        )
    
    # Create a new search ID for the customization
    search_id = str(uuid.uuid4())
    
    # Create status document for the customization
    status_doc = {
        "search_id": search_id,
        "user_id": str(current_user.id),
        "query": path["query"],
        "status": "INITIATED",
        "progress": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "message": "Customization initiated",
        "is_customization": True,
        "original_path_id": request.learning_path_id
    }
    
    # Insert status into database
    await db.search_status.insert_one(status_doc)
    
    # Start the customization process in the background
    background_tasks.add_task(
        search_manager.customize_learning_path_with_status,
        search_id=search_id,
        learning_path_id=request.learning_path_id,
        preferences=request.preferences,
        user_id=str(current_user.id)
    )
    
    return {"search_id": search_id, "message": "Customization initiated"}

@router.get("/user/paths", response_model=List[LearningPath])
async def get_user_learning_paths(current_user: User = Depends(get_current_active_user)):
    """
    Get all learning paths for the current user.
    """
    paths = await db.learning_paths.find({"user_id": str(current_user.id)}).to_list(100)
    return [LearningPath(**path) for path in paths]

@router.get("/{learning_path_id}/export/pdf")
async def export_learning_path_to_pdf(
    learning_path_id: str,
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """
    Export a learning path to PDF format.
    """
    # Get the learning path
    path = await db.learning_paths.find_one({"_id": learning_path_id})
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )
    
    # Check permissions
    if not path["is_public"] and (not current_user or str(path["user_id"]) != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this learning path"
        )
    
    try:
        # Generate PDF
        pdf_path = await pdf_generator.generate_learning_path_pdf(
            learning_path=path,
            query=path.get("query", ""),
            preferences=path.get("preferences", {})
        )
        
        # Return file response
        filename = f"{path.get('title', 'learning_path').replace(' ', '_')}.pdf"
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )
