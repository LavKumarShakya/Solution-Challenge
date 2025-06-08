from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging

from app.database import db
from app.routers.auth import get_current_active_user
from models.user import User
from models.saved_course import (
    SavedCourse, SavedCourseCreate, SavedCourseUpdate,
    ResourceCollection, ResourceCollectionCreate, ResourceCollectionUpdate,
    CourseFolder, CourseFolderCreate,
    ResourceProgress, CourseAnalytics
)
from utils.pdf_generator import PDFGenerator
from utils.vertex_ai import VertexAIClient

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/courses", tags=["saved_courses"])

@router.post("/save", response_model=Dict[str, Any])
async def save_learning_path_as_course(
    course_data: SavedCourseCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Save a learning path as a user's course"""
    try:
        # Get the original learning path
        learning_path = await db.learning_paths.find_one({"_id": ObjectId(course_data.learning_path_id)})
        
        if not learning_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning path not found"
            )
        
        # Check if user already saved this learning path
        existing_course = await db.saved_courses.find_one({
            "user_id": current_user.id,
            "original_learning_path_id": course_data.learning_path_id
        })
        
        if existing_course:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This learning path is already saved as a course"
            )
        
        # Create saved course structure
        saved_course_data = {
            "user_id": current_user.id,
            "original_learning_path_id": course_data.learning_path_id,
            "course_name": course_data.course_name or learning_path.get("title", "Untitled Course"),
            "description": learning_path.get("description", ""),
            "modules": _convert_modules_to_saved_format(learning_path.get("modules", [])),
            "total_estimated_hours": learning_path.get("estimated_hours", 0),
            "difficulty": learning_path.get("difficulty", "intermediate"),
            "prerequisites": learning_path.get("prerequisites", []),
            "custom_tags": course_data.custom_tags,
            "folder_name": course_data.folder_name,
            "user_notes": "",
            "is_favorite": False,
            "completion_percentage": 0.0,
            "total_resources": _count_total_resources(learning_path.get("modules", [])),
            "completed_resources": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_accessed": None,
            "original_query": learning_path.get("query", ""),
            "original_preferences": learning_path.get("preferences", {})
        }
        
        # Insert the saved course
        result = await db.saved_courses.insert_one(saved_course_data)
        saved_course_id = str(result.inserted_id)
        
        # Update folder statistics
        await _update_folder_stats(current_user.id, course_data.folder_name)
        
        # Initialize course analytics
        analytics_data = {
            "course_id": saved_course_id,
            "user_id": current_user.id,
            "total_time_spent": 0,
            "completion_rate": 0.0,
            "most_accessed_resource_type": None,
            "learning_velocity": 0.0,
            "last_study_session": None,
            "study_streak_days": 0,
            "total_sessions": 0,
            "average_session_time": 0.0
        }
        await db.course_analytics.insert_one(analytics_data)
        
        logger.info(f"User {current_user.id} saved learning path {course_data.learning_path_id} as course {saved_course_id}")
        
        return {
            "success": True,
            "course_id": saved_course_id,
            "message": "Learning path saved as course successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving learning path as course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save learning path as course"
        )

@router.get("/", response_model=List[SavedCourse])
async def get_user_courses(
    folder: Optional[str] = Query(None, description="Filter by folder name"),
    search: Optional[str] = Query(None, description="Search in course names and descriptions"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    sort_by: Optional[str] = Query("updated_at", description="Sort by field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    limit: Optional[int] = Query(50, le=100),
    skip: Optional[int] = Query(0),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's saved courses with filtering and sorting"""
    try:
        # Build query
        query = {"user_id": current_user.id}
        
        if folder:
            query["folder_name"] = folder
        
        if difficulty:
            query["difficulty"] = difficulty
        
        if search:
            query["$or"] = [
                {"course_name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            query["custom_tags"] = {"$in": tag_list}
        
        # Build sort criteria
        sort_direction = 1 if sort_order.lower() == "asc" else -1
        sort_criteria = [(sort_by, sort_direction)]
        
        # Execute query
        cursor = db.saved_courses.find(query).sort(sort_criteria).skip(skip).limit(limit)
        courses = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format response
        formatted_courses = []
        for course in courses:
            course["id"] = str(course["_id"])
            del course["_id"]
            formatted_courses.append(SavedCourse(**course))
        
        return formatted_courses
        
    except Exception as e:
        logger.error(f"Error retrieving user courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve courses"
        )

@router.get("/{course_id}", response_model=SavedCourse)
async def get_course_details(
    course_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed information about a specific course"""
    try:
        course = await db.saved_courses.find_one({
            "_id": ObjectId(course_id),
            "user_id": current_user.id
        })
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Update last accessed timestamp
        await db.saved_courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": {"last_accessed": datetime.utcnow()}}
        )
        
        # Format response
        course["id"] = str(course["_id"])
        del course["_id"]
        
        return SavedCourse(**course)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve course details"
        )

@router.put("/{course_id}", response_model=Dict[str, Any])
async def update_course(
    course_id: str,
    course_update: SavedCourseUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update course information"""
    try:
        # Check if course exists and belongs to user
        course = await db.saved_courses.find_one({
            "_id": ObjectId(course_id),
            "user_id": current_user.id
        })
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Prepare update data
        update_data = course_update.dict(exclude_none=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Update the course
        await db.saved_courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": update_data}
        )
        
        # Update folder statistics if folder changed
        if "folder_name" in update_data:
            await _update_folder_stats(current_user.id, update_data["folder_name"])
            await _update_folder_stats(current_user.id, course["folder_name"])  # Update old folder
        
        return {
            "success": True,
            "message": "Course updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update course"
        )

@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a saved course"""
    try:
        # Check if course exists and belongs to user
        course = await db.saved_courses.find_one({
            "_id": ObjectId(course_id),
            "user_id": current_user.id
        })
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Delete the course
        await db.saved_courses.delete_one({"_id": ObjectId(course_id)})
        
        # Delete related progress and analytics
        await db.resource_progress.delete_many({"course_id": course_id})
        await db.course_analytics.delete_many({"course_id": course_id})
        
        # Update folder statistics
        await _update_folder_stats(current_user.id, course["folder_name"])
        
        return {"success": True, "message": "Course deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete course"
        )

@router.post("/{course_id}/resources/{resource_id}/progress")
async def update_resource_progress(
    course_id: str,
    resource_id: str,
    progress_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """Update progress for a specific resource in a course"""
    try:
        # Verify course ownership
        course = await db.saved_courses.find_one({
            "_id": ObjectId(course_id),
            "user_id": current_user.id
        })
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Prepare progress update
        progress_update = {
            "resource_id": resource_id,
            "user_id": current_user.id,
            "course_id": course_id,
            "status": progress_data.get("status", "in_progress"),
            "progress_percentage": progress_data.get("progress_percentage", 0.0),
            "time_spent_minutes": progress_data.get("time_spent_minutes", 0),
            "notes": progress_data.get("notes", ""),
            "last_accessed": datetime.utcnow()
        }
        
        if progress_data.get("status") == "completed":
            progress_update["completed_at"] = datetime.utcnow()
        
        # Upsert progress record
        await db.resource_progress.update_one(
            {
                "resource_id": resource_id,
                "user_id": current_user.id,
                "course_id": course_id
            },
            {"$set": progress_update},
            upsert=True
        )
        
        # Update course completion statistics
        await _update_course_completion(course_id, current_user.id)
        
        # Update analytics
        await _update_course_analytics(course_id, current_user.id, progress_data)
        
        return {
            "success": True,
            "message": "Resource progress updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resource progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update resource progress"
        )

@router.get("/{course_id}/export/pdf")
async def export_course_to_pdf(
    course_id: str,
    include_resources: bool = Query(True, description="Include resource details"),
    include_progress: bool = Query(True, description="Include progress information"),
    current_user: User = Depends(get_current_active_user)
):
    """Export course to PDF format"""
    try:
        # Get course details
        course = await db.saved_courses.find_one({
            "_id": ObjectId(course_id),
            "user_id": current_user.id
        })
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Get progress data if requested
        progress_data = None
        if include_progress:
            progress_cursor = db.resource_progress.find({
                "course_id": course_id,
                "user_id": current_user.id
            })
            progress_data = await progress_cursor.to_list(length=None)
        
        # Generate PDF
        pdf_generator = PDFGenerator()
        pdf_path = await pdf_generator.generate_course_pdf(
            course=course,
            progress_data=progress_data,
            include_resources=include_resources,
            include_progress=include_progress
        )
        
        # Return file response
        filename = f"{course['course_name'].replace(' ', '_')}_course.pdf"
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting course to PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export course to PDF"
        )

@router.get("/{course_id}/analytics", response_model=CourseAnalytics)
async def get_course_analytics(
    course_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get analytics for a specific course"""
    try:
        # Verify course ownership
        course = await db.saved_courses.find_one({
            "_id": ObjectId(course_id),
            "user_id": current_user.id
        })
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Get analytics data
        analytics = await db.course_analytics.find_one({
            "course_id": course_id,
            "user_id": current_user.id
        })
        
        if not analytics:
            # Create default analytics if not exists
            analytics = {
                "course_id": course_id,
                "user_id": current_user.id,
                "total_time_spent": 0,
                "completion_rate": 0.0,
                "most_accessed_resource_type": None,
                "learning_velocity": 0.0,
                "last_study_session": None,
                "study_streak_days": 0,
                "total_sessions": 0,
                "average_session_time": 0.0
            }
            await db.course_analytics.insert_one(analytics)
        
        return CourseAnalytics(**analytics)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve course analytics"
        )

# Folder Management Endpoints

@router.post("/folders", response_model=Dict[str, Any])
async def create_course_folder(
    folder_data: CourseFolderCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new course folder"""
    try:
        # Check if folder name already exists for user
        existing_folder = await db.course_folders.find_one({
            "user_id": current_user.id,
            "name": folder_data.name
        })
        
        if existing_folder:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Folder name already exists"
            )
        
        # Create folder
        folder_doc = {
            "user_id": current_user.id,
            "name": folder_data.name,
            "description": folder_data.description,
            "color": folder_data.color,
            "course_count": 0,
            "collection_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.course_folders.insert_one(folder_doc)
        folder_id = str(result.inserted_id)
        
        return {
            "success": True,
            "folder_id": folder_id,
            "message": "Folder created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating course folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create folder"
        )

@router.get("/folders", response_model=List[CourseFolder])
async def get_course_folders(
    current_user: User = Depends(get_current_active_user)
):
    """Get all course folders for the user"""
    try:
        cursor = db.course_folders.find({"user_id": current_user.id}).sort("name", 1)
        folders = await cursor.to_list(length=None)
        
        # Format response
        formatted_folders = []
        for folder in folders:
            folder["id"] = str(folder["_id"])
            del folder["_id"]
            formatted_folders.append(CourseFolder(**folder))
        
        return formatted_folders
        
    except Exception as e:
        logger.error(f"Error retrieving course folders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve folders"
        )

# Helper Functions

def _convert_modules_to_saved_format(modules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert learning path modules to saved course format"""
    saved_modules = []
    for module in modules:
        saved_module = {
            "id": str(ObjectId()),
            "title": module.get("title", "Untitled Module"),
            "description": module.get("description", ""),
            "order": module.get("order", 1),
            "is_completed": False,
            "completion_percentage": 0.0,
            "resources": []
        }
        
        # Convert resources
        for resource in module.get("resources", []):
            saved_resource = {
                "id": str(ObjectId()),
                "title": resource.get("title", "Untitled Resource"),
                "url": resource.get("url", ""),
                "resource_type": resource.get("resource_type", "article"),
                "source": resource.get("source", "Unknown"),
                "estimated_time_minutes": resource.get("estimated_time_minutes", 30),
                "difficulty": resource.get("difficulty", "intermediate"),
                "description": resource.get("description", ""),
                "quality_score": resource.get("quality_score", 0.5),
                "is_selected": True,
                "user_notes": None,
                "completion_status": "not_started",
                "metadata": resource.get("metadata", {}),
                "saved_at": datetime.utcnow(),
                "last_accessed": None
            }
            saved_module["resources"].append(saved_resource)
        
        saved_modules.append(saved_module)
    
    return saved_modules

def _count_total_resources(modules: List[Dict[str, Any]]) -> int:
    """Count total resources across all modules"""
    return sum(len(module.get("resources", [])) for module in modules)

async def _update_folder_stats(user_id: str, folder_name: str):
    """Update statistics for a course folder"""
    try:
        # Count courses in folder
        course_count = await db.saved_courses.count_documents({
            "user_id": user_id,
            "folder_name": folder_name
        })
        
        # Count collections in folder
        collection_count = await db.resource_collections.count_documents({
            "user_id": user_id,
            "folder_name": folder_name
        })
        
        # Update folder stats
        await db.course_folders.update_one(
            {"user_id": user_id, "name": folder_name},
            {
                "$set": {
                    "course_count": course_count,
                    "collection_count": collection_count,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
    except Exception as e:
        logger.error(f"Error updating folder stats: {str(e)}")

async def _update_course_completion(course_id: str, user_id: str):
    """Update course completion percentage"""
    try:
        # Get total resources in course
        course = await db.saved_courses.find_one({"_id": ObjectId(course_id)})
        if not course:
            return
        
        total_resources = course.get("total_resources", 0)
        if total_resources == 0:
            return
        
        # Count completed resources
        completed_count = await db.resource_progress.count_documents({
            "course_id": course_id,
            "user_id": user_id,
            "status": "completed"
        })
        
        # Calculate completion percentage
        completion_percentage = (completed_count / total_resources) * 100
        
        # Update course
        await db.saved_courses.update_one(
            {"_id": ObjectId(course_id)},
            {
                "$set": {
                    "completion_percentage": completion_percentage,
                    "completed_resources": completed_count,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error updating course completion: {str(e)}")

async def _update_course_analytics(course_id: str, user_id: str, progress_data: Dict[str, Any]):
    """Update course analytics based on progress data"""
    try:
        # Get current analytics
        analytics = await db.course_analytics.find_one({
            "course_id": course_id,
            "user_id": user_id
        })
        
        if not analytics:
            return
        
        # Update time spent
        time_spent = progress_data.get("time_spent_minutes", 0)
        total_time = analytics.get("total_time_spent", 0) + time_spent
        
        # Update session count
        total_sessions = analytics.get("total_sessions", 0) + 1
        
        # Calculate average session time
        avg_session_time = total_time / total_sessions if total_sessions > 0 else 0
        
        # Update analytics
        update_data = {
            "total_time_spent": total_time,
            "total_sessions": total_sessions,
            "average_session_time": avg_session_time,
            "last_study_session": datetime.utcnow()
        }
        
        await db.course_analytics.update_one(
            {"course_id": course_id, "user_id": user_id},
            {"$set": update_data}
        )
        
    except Exception as e:
        logger.error(f"Error updating course analytics: {str(e)}")
