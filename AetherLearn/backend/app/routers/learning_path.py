from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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

router = APIRouter()
search_manager = SearchManager()
vertex_ai = VertexAIClient()

@router.post("/search", status_code=status.HTTP_202_ACCEPTED)
async def create_learning_path(
    request: LearningPathCreate,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """
    Initiate a search for creating a learning path based on the query.
    This is an asynchronous operation.
    """
    search_id = str(uuid.uuid4())
    user_id = current_user.id if current_user else None
    
    # Create status document
    status_doc = {
        "search_id": search_id,
        "user_id": user_id,
        "query": request.query,
        "status": "INITIATED",
        "progress": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "message": "Search initiated"
    }
    
    # Insert status into database
    await db.search_status.insert_one(status_doc)
    
    # Start the search process in the background
    background_tasks.add_task(
        search_manager.process_search,
        search_id=search_id,
        query=request.query,
        user_id=user_id,
        preferences=request.preferences
    )
    
    return {"search_id": search_id, "message": "Search initiated"}

@router.get("/status/{search_id}", response_model=SearchStatus)
async def get_search_status(search_id: str):
    """
    Get the current status of a learning path search.
    """
    status = await db.search_status.find_one({"search_id": search_id})
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Search with ID {search_id} not found"
        )
    
    return SearchStatus(**status)

@router.get("/{learning_path_id}", response_model=LearningPath)
async def get_learning_path(
    learning_path_id: str,
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """
    Get a specific learning path by ID.
    """
    path = await db.learning_paths.find_one({"_id": learning_path_id})
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning path with ID {learning_path_id} not found"
        )
    
    # Check if the learning path is public or belongs to the current user
    if not path["is_public"] and (not current_user or str(path["user_id"]) != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this learning path"
        )
    
    return LearningPath(**path)

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
        search_manager.customize_learning_path,
        learning_path_id=request.learning_path_id,
        preferences=request.preferences,
        user_id=str(current_user.id)
    )
    
    # Update the search status to indicate it's started
    await search_manager.update_search_status(
        search_id,
        SearchStatusUpdate(
            status="PROCESSING",
            progress=10,
            message="Customizing learning path"
        )
    )
    
    return {"search_id": search_id, "message": "Customization initiated"}

@router.get("/user/paths", response_model=List[LearningPath])
async def get_user_learning_paths(current_user: User = Depends(get_current_active_user)):
    """
    Get all learning paths for the current user.
    """
    paths = await db.learning_paths.find({"user_id": str(current_user.id)}).to_list(100)
    return [LearningPath(**path) for path in paths]
