from pydantic import BaseModel, Field, validator
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


# Learning Path Models
class ResourceBase(BaseModel):
    title: str
    url: str
    resource_type: str  # video, article, interactive, etc.
    source: str  # website where the resource was found
    estimated_time_minutes: int
    difficulty: str  # beginner, intermediate, advanced
    description: str
    
    class Config:
        populate_by_name = True


class Resource(ResourceBase):
    id: str = Field(alias="_id")
    quality_score: float
    metadata: Dict[str, Any] = {}
    created_at: datetime
    
    class Config:
        populate_by_name = True


class ModuleBase(BaseModel):
    title: str
    description: str
    order: int
    
    class Config:
        populate_by_name = True


class Module(ModuleBase):
    id: str = Field(alias="_id")
    resources: List[Resource] = []
    
    class Config:
        populate_by_name = True


class LearningPathCreate(BaseModel):
    query: str
    preferences: Dict[str, Any] = {}
    
    class Config:
        populate_by_name = True


class LearningPathCustomize(BaseModel):
    learning_path_id: str
    preferences: Dict[str, Any]
    
    class Config:
        populate_by_name = True


class LearningPath(BaseModel):
    id: str = Field(alias="_id")
    user_id: Optional[str] = None
    query: str
    title: str
    description: str
    modules: List[Module]
    estimated_hours: float
    difficulty: str
    prerequisites: List[str] = []
    is_public: bool = True
    preferences: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True


class SearchStatus(BaseModel):
    search_id: str
    user_id: Optional[str] = None
    query: str
    status: str  # INITIATED, DISCOVERING, EXTRACTING, PROCESSING, COMPLETED, FAILED
    progress: int  # 0-100
    message: str
    created_at: datetime
    updated_at: datetime
    is_customization: bool = False
    original_path_id: Optional[str] = None
    learning_path_id: Optional[str] = None
    
    class Config:
        populate_by_name = True


class SearchStatusUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    message: Optional[str] = None
    learning_path_id: Optional[str] = None
    
    class Config:
        populate_by_name = True
