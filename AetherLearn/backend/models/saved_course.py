from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

# Custom ObjectId field for MongoDB compatibility
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Saved Course Models
class SavedResourceBase(BaseModel):
    title: str
    url: str
    resource_type: str
    source: str
    estimated_time_minutes: int
    difficulty: str
    description: str
    quality_score: float
    is_selected: bool = True  # Whether user selected this resource
    user_notes: Optional[str] = None
    completion_status: str = "not_started"  # not_started, in_progress, completed
    
    class Config:
        populate_by_name = True

class SavedResource(SavedResourceBase):
    id: str = Field(alias="_id")
    metadata: Dict[str, Any] = {}
    saved_at: datetime
    last_accessed: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class SavedModuleBase(BaseModel):
    title: str
    description: str
    order: int
    is_completed: bool = False
    completion_percentage: float = 0.0
    
    class Config:
        populate_by_name = True

class SavedModule(SavedModuleBase):
    id: str = Field(alias="_id")
    resources: List[SavedResource] = []
    
    class Config:
        populate_by_name = True

class SavedCourseCreate(BaseModel):
    learning_path_id: str
    course_name: Optional[str] = None
    custom_tags: List[str] = []
    folder_name: Optional[str] = "General"
    
    class Config:
        populate_by_name = True

class SavedCourseUpdate(BaseModel):
    course_name: Optional[str] = None
    custom_tags: Optional[List[str]] = None
    folder_name: Optional[str] = None
    user_notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    
    class Config:
        populate_by_name = True

class SavedCourse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    original_learning_path_id: str
    course_name: str
    description: str
    modules: List[SavedModule]
    total_estimated_hours: float
    difficulty: str
    prerequisites: List[str] = []
    custom_tags: List[str] = []
    folder_name: str = "General"
    user_notes: Optional[str] = None
    is_favorite: bool = False
    completion_percentage: float = 0.0
    total_resources: int
    completed_resources: int = 0
    created_at: datetime
    updated_at: datetime
    last_accessed: Optional[datetime] = None
    original_query: str
    original_preferences: Dict[str, Any] = {}
    
    class Config:
        populate_by_name = True

# Individual Resource Collection Models
class ResourceCollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    folder_name: Optional[str] = "Collections"
    tags: List[str] = []
    
    class Config:
        populate_by_name = True

class ResourceCollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    folder_name: Optional[str] = None
    tags: Optional[List[str]] = None
    
    class Config:
        populate_by_name = True

class ResourceCollection(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    name: str
    description: Optional[str] = None
    resources: List[SavedResource] = []
    folder_name: str = "Collections"
    tags: List[str] = []
    is_public: bool = False
    total_resources: int = 0
    total_estimated_time: int = 0  # in minutes
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True

# Course Folder Models
class CourseFolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#007bff"
    
    class Config:
        populate_by_name = True

class CourseFolder(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    name: str
    description: Optional[str] = None
    color: str = "#007bff"
    course_count: int = 0
    collection_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True

# Progress Tracking Models
class ResourceProgress(BaseModel):
    resource_id: str
    user_id: str
    course_id: Optional[str] = None
    collection_id: Optional[str] = None
    status: str = "not_started"  # not_started, in_progress, completed
    progress_percentage: float = 0.0
    time_spent_minutes: int = 0
    notes: Optional[str] = None
    last_accessed: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

# Course Analytics Models
class CourseAnalytics(BaseModel):
    course_id: str
    user_id: str
    total_time_spent: int = 0  # in minutes
    completion_rate: float = 0.0
    most_accessed_resource_type: Optional[str] = None
    learning_velocity: float = 0.0  # resources per day
    last_study_session: Optional[datetime] = None
    study_streak_days: int = 0
    total_sessions: int = 0
    average_session_time: float = 0.0  # in minutes
    
    class Config:
        populate_by_name = True
