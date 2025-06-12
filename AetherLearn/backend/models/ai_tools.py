from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class StudyMetadata(BaseModel):
    """Metadata for tracking flashcard study progress"""
    times_reviewed: int = 0
    correct_answers: int = 0
    last_reviewed: Optional[datetime] = None
    confidence_level: str = "not_reviewed"  # not_reviewed, low, medium, high

class FlashcardData(BaseModel):
    """Individual flashcard structure"""
    id: str
    question: str
    answer: str
    hint: Optional[str] = ""
    topic: str = "General"
    difficulty: DifficultyLevel
    created_at: datetime = Field(default_factory=datetime.utcnow)
    study_metadata: StudyMetadata = Field(default_factory=StudyMetadata)
    is_fallback: bool = False

class GeneratedFlashcards(Document):
    """Document model for storing generated flashcard sets"""
    
    # User and session info
    user_id: Indexed(str)
    session_id: str = Field(default_factory=lambda: f"flashcard_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    
    # Content metadata
    title: str  # Auto-generated from content preview
    source_content: str  # Original user input
    content_type: str = "user_input"  # user_input, topic, url
    
    # Generation settings
    generation_options: Dict[str, Any] = Field(default_factory=dict)
    difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    
    # Flashcard data
    flashcards: List[FlashcardData]
    total_cards: int
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_studied: Optional[datetime] = None
    last_modified: datetime = Field(default_factory=datetime.utcnow)
    
    # Study statistics
    study_stats: Dict[str, Any] = Field(default_factory=lambda: {
        "total_study_sessions": 0,
        "total_time_studied": 0,  # in minutes
        "average_score": 0.0,
        "mastered_cards": 0
    })
    
    # Metadata
    is_favorite: bool = False
    tags: List[str] = Field(default_factory=list)
    
    class Settings:
        name = "generated_flashcards"
        indexes = [
            "user_id",
            "created_at",
            "difficulty",
            [("user_id", 1), ("created_at", -1)]
        ]

class QuizQuestion(BaseModel):
    """Individual quiz question structure"""
    id: str
    type: str  # multiple_choice, true_false, short_answer
    question: str
    options: Optional[List[str]] = None  # For multiple choice
    answer: str
    explanation: str
    difficulty: DifficultyLevel
    topic: str = "General"

class GeneratedQuiz(Document):
    """Document model for storing generated quizzes"""
    
    # User and session info
    user_id: Indexed(str)
    session_id: str = Field(default_factory=lambda: f"quiz_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    
    # Quiz metadata
    title: str
    description: str
    source_content: str
    content_type: str = "user_input"
    
    # Generation settings
    generation_options: Dict[str, Any] = Field(default_factory=dict)
    difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    
    # Quiz data
    questions: List[QuizQuestion]
    total_questions: int
    time_limit: Optional[int] = None  # in minutes
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_taken: Optional[datetime] = None
    
    # Quiz statistics
    quiz_stats: Dict[str, Any] = Field(default_factory=lambda: {
        "times_taken": 0,
        "best_score": 0.0,
        "average_score": 0.0,
        "completion_rate": 0.0
    })
    
    # Metadata
    is_favorite: bool = False
    tags: List[str] = Field(default_factory=list)
    
    class Settings:
        name = "generated_quizzes"
        indexes = [
            "user_id",
            "created_at",
            "difficulty",
            [("user_id", 1), ("created_at", -1)]
        ]

class ProjectMentorSession(Document):
    """Document model for storing project mentor chat sessions"""
    
    # User and session info
    user_id: Indexed(str)
    session_id: str = Field(default_factory=lambda: f"mentor_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    
    # Project context
    project_title: str
    project_description: str
    project_type: str = "general"  # web_dev, mobile, data_science, etc.
    experience_level: str = "intermediate"
    
    # Chat history
    messages: List[Dict[str, Any]] = Field(default_factory=list)  # [{role: user/assistant, content: str, timestamp: datetime}]
    
    # Session metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    # Session statistics
    session_stats: Dict[str, Any] = Field(default_factory=lambda: {
        "total_messages": 0,
        "user_messages": 0,
        "assistant_messages": 0,
        "session_duration": 0  # in minutes
    })
    
    # Metadata
    tags: List[str] = Field(default_factory=list)
    is_archived: bool = False
    
    class Settings:
        name = "project_mentor_sessions"
        indexes = [
            "user_id",
            "created_at",
            "last_active",
            "is_active",
            [("user_id", 1), ("last_active", -1)]
        ]

# Request/Response models for API
class FlashcardGenerationRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=10000)
    options: Dict[str, Any] = Field(default_factory=dict)
    user_id: str

class FlashcardGenerationResponse(BaseModel):
    session_id: str
    flashcards: List[FlashcardData]
    metadata: Dict[str, Any]
    success: bool = True

class QuizGenerationRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=10000)
    options: Dict[str, Any] = Field(default_factory=dict)
    user_id: str

class QuizGenerationResponse(BaseModel):
    session_id: str
    title: str
    description: str
    questions: List[QuizQuestion]
    metadata: Dict[str, Any]
    success: bool = True

class ProjectMentorRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    project_context: Optional[Dict[str, Any]] = None
    user_id: str

class ProjectMentorResponse(BaseModel):
    session_id: str
    response: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    success: bool = True