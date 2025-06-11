from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from ..database import get_db
from models.ai_tools import (
    FlashcardGenerationRequest,
    FlashcardGenerationResponse,
    GeneratedFlashcards,
    FlashcardData,
    DifficultyLevel
)
from utils.vertex_ai import VertexAIClient
from utils.intelligent_flashcard_generator import IntelligentFlashcardGenerator
# Removed User import - using simple test class instead

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai-tools"])

@router.get("/health")
async def health_check():
    """Health check endpoint for AI tools service"""
    try:
        # Get detailed health info from flashcard generator
        if flashcard_generator:
            generator_health = flashcard_generator.health_check()
            
            if generator_health["vertex_available"]:
                status = "healthy_with_ai"
                message = "AI tools service is running with Vertex AI"
            else:
                status = "healthy_fallback"
                message = "AI tools service is running with fallback generation"
        else:
            status = "degraded"
            message = "AI tools service is running but flashcard generator is not available"
            generator_health = {}
        
        return {
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "flashcard_generator": bool(flashcard_generator),
                "vertex_ai": bool(flashcard_generator and flashcard_generator.vertex_available),
                "vertex_client": bool(vertex_client)
            },
            "generator_details": generator_health
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "message": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

# Initialize VertexAI client and Intelligent Flashcard Generator
try:
    vertex_client = VertexAIClient()
    flashcard_generator = IntelligentFlashcardGenerator()
    logger.info("✅ AI clients initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize AI clients: {e}")
    vertex_client = None
    flashcard_generator = None

# Simple user class for testing
class TestUser:
    def __init__(self, user_id: str, email: str):
        self.id = user_id
        self.email = email

# Dependency for getting current user (placeholder - implement based on your auth system)
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> TestUser:
    """Get current authenticated user - implement based on your auth system"""
    # This is a placeholder - implement your actual authentication logic
    # For now, returning a dummy user for development (no authentication required)
    return TestUser("test_user", "test@example.com")

@router.post("/flashcards/generate", response_model=FlashcardGenerationResponse)
async def generate_flashcards(
    request: FlashcardGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: TestUser = Depends(get_current_user)
):
    """
    Generate flashcards from user-provided content using Vertex AI
    
    Request body:
    {
        "content": "Text content or topic to generate flashcards from",
        "options": {
            "num_cards": 10,
            "difficulty": "beginner|intermediate|advanced",
            "save": true|false
        },
        "user_id": "user_identifier"
    }
    """
    try:
        # Validate user authentication
        if not current_user or current_user.id != request.user_id:
            raise HTTPException(status_code=403, detail="Authentication required")
        
        # Extract options with defaults
        options = request.options or {}
        num_cards = options.get("num_cards", 10)
        difficulty = options.get("difficulty", "intermediate")
        save_to_db = options.get("save", True)
        
        # Validate options
        if num_cards < 3 or num_cards > 20:
            raise HTTPException(status_code=400, detail="Number of cards must be between 3 and 20")
        
        if difficulty not in ["beginner", "intermediate", "advanced"]:
            raise HTTPException(status_code=400, detail="Difficulty must be beginner, intermediate, or advanced")
        
        logger.info(f"Generating {num_cards} flashcards for user {request.user_id} with difficulty {difficulty}")
        
        # Check if flashcard generator is available
        if not flashcard_generator:
            logger.error("Flashcard generator not initialized")
            raise HTTPException(status_code=500, detail="Flashcard generation service unavailable")
        
        # Use the WORKING VertexAI client directly (same as learning path)
        logger.info("Using working VertexAI client for flashcard generation...")
        try:
            # Use the working VertexAI client that powers learning paths
            if vertex_client:
                raw_flashcards = await vertex_client.generate_flashcards(
                    content=request.content,
                    options={
                        "num_cards": num_cards,
                        "difficulty": difficulty
                    }
                )
                
                # Convert to proper format with front/back
                flashcards_data = []
                for i, card in enumerate(raw_flashcards):
                    flashcard_data = {
                        "id": str(i + 1),
                        "front": card.get("question", card.get("front", "No question available")),
                        "back": card.get("answer", card.get("back", "No answer available")),
                        "question": card.get("question", card.get("front", "No question available")),
                        "answer": card.get("answer", card.get("back", "No answer available")),
                        "difficulty": difficulty,
                        "created_at": datetime.utcnow().isoformat(),
                        "study_metadata": {
                            "times_reviewed": 0,
                            "correct_answers": 0,
                            "last_reviewed": None,
                            "confidence_level": "new"
                        },
                        "estimated_study_time": 45,
                        "tags": ["ai-generated", "real-gemini", difficulty]
                    }
                    flashcards_data.append(flashcard_data)
                
                generation_metadata = {
                    "generation_method": "ai",
                    "input_type": "topic" if len(request.content.split()) <= 10 else "content",
                    "ai_model": "gemini-2.0-flash-001"
                }
                
                logger.info(f"✅ REAL GEMINI AI Generated {len(flashcards_data)} flashcards!")
                logger.info(f"Generation method: {generation_metadata.get('generation_method', 'unknown')}")
                logger.info(f"Input type detected: {generation_metadata.get('input_type', 'unknown')}")
            else:
                raise Exception("VertexAI client not available")
            
        except Exception as gen_error:
            logger.error(f"Intelligent flashcard generation failed: {gen_error}")
            # Create fallback flashcards if AI generation fails
            flashcards_data = create_fallback_flashcards(request.content, num_cards, difficulty)
            generation_metadata = {
                "generation_method": "emergency_fallback",
                "input_type": "content"
            }
            logger.info(f"Created {len(flashcards_data)} emergency fallback flashcards")
        
        # Convert to FlashcardData objects
        flashcard_objects = [
            FlashcardData(**card_data) for card_data in flashcards_data
        ]
        
        # Generate session metadata
        session_id = f"flashcard_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{request.user_id}"
        
        # Create auto-generated title from content preview
        title = _generate_title_from_content(request.content)
        
        # Save to database if requested
        if save_to_db:
            background_tasks.add_task(
                save_flashcards_to_database,
                request.user_id,
                session_id,
                title,
                request.content,
                flashcard_objects,
                difficulty,
                options
            )
        
        # Track usage for monitoring
        background_tasks.add_task(
            log_tool_usage,
            "flashcard_generation",
            {
                "user_id": request.user_id,
                "content_length": len(request.content),
                "num_cards": len(flashcard_objects),
                "difficulty": difficulty,
                "saved": save_to_db
            }
        )
        
        # Prepare response metadata
        enhanced_metadata = {
            "generation_time": datetime.utcnow().isoformat(),
            "content_length": len(request.content),
            "difficulty": difficulty,
            "total_cards": len(flashcard_objects),
            "session_id": session_id,
            "generation_method": generation_metadata.get("generation_method", "unknown"),
            "input_type": generation_metadata.get("input_type", "unknown"),
            "ai_model": generation_metadata.get("ai_model", "unknown")
        }
        
        return FlashcardGenerationResponse(
            session_id=session_id,
            flashcards=flashcard_objects,
            metadata=enhanced_metadata,
            success=True
        )
        
    except ValueError as ve:
        logger.error(f"Validation error in flashcard generation: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating flashcards: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")

@router.get("/flashcards/saved")
async def get_saved_flashcards(
    current_user: TestUser = Depends(get_current_user),
    limit: int = 10,
    skip: int = 0,
    difficulty: Optional[str] = None
):
    """Get user's saved flashcard sets"""
    try:
        query_filter = {"user_id": current_user.id}
        
        if difficulty:
            query_filter["difficulty"] = difficulty
        
        # Get flashcard sets from database (handle potential database issues)
        try:
            flashcard_sets = await GeneratedFlashcards.find(
                query_filter
            ).sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
        except Exception as db_error:
            logger.warning(f"Database query failed: {db_error}, returning empty list")
            flashcard_sets = []
        
        return {
            "flashcard_sets": flashcard_sets,
            "total": await GeneratedFlashcards.find(query_filter).count(),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Error fetching saved flashcards: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch saved flashcards")

@router.get("/flashcards/{session_id}")
async def get_flashcard_set(
    session_id: str,
    current_user: TestUser = Depends(get_current_user)
):
    """Get a specific flashcard set by session ID"""
    try:
        flashcard_set = await GeneratedFlashcards.find_one({
            "session_id": session_id,
            "user_id": current_user.id
        })
        
        if not flashcard_set:
            raise HTTPException(status_code=404, detail="Flashcard set not found")
        
        return {
            "flashcard_set": flashcard_set,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching flashcard set: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch flashcard set")

@router.put("/flashcards/{session_id}/study")
async def update_study_progress(
    session_id: str,
    study_data: Dict[str, Any],
    current_user: TestUser = Depends(get_current_user)
):
    """Update study progress for a flashcard set"""
    try:
        flashcard_set = await GeneratedFlashcards.find_one({
            "session_id": session_id,
            "user_id": current_user.id
        })
        
        if not flashcard_set:
            raise HTTPException(status_code=404, detail="Flashcard set not found")
        
        # Update study metadata
        card_id = study_data.get("card_id")
        correct = study_data.get("correct", False)
        
        if card_id:
            for card in flashcard_set.flashcards:
                if card.id == card_id:
                    card.study_metadata.times_reviewed += 1
                    if correct:
                        card.study_metadata.correct_answers += 1
                    card.study_metadata.last_reviewed = datetime.utcnow()
                    
                    # Update confidence level based on performance
                    accuracy = card.study_metadata.correct_answers / card.study_metadata.times_reviewed
                    if accuracy >= 0.8:
                        card.study_metadata.confidence_level = "high"
                    elif accuracy >= 0.6:
                        card.study_metadata.confidence_level = "medium"
                    else:
                        card.study_metadata.confidence_level = "low"
                    break
        
        # Update session stats
        flashcard_set.last_studied = datetime.utcnow()
        flashcard_set.study_stats["total_study_sessions"] += 1
        
        # Save updates
        await flashcard_set.save()
        
        return {
            "message": "Study progress updated successfully",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating study progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update study progress")

@router.delete("/flashcards/{session_id}")
async def delete_flashcard_set(
    session_id: str,
    current_user: TestUser = Depends(get_current_user)
):
    """Delete a flashcard set"""
    try:
        result = await GeneratedFlashcards.find_one({
            "session_id": session_id,
            "user_id": current_user.id
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Flashcard set not found")
        
        await result.delete()
        
        return {
            "message": "Flashcard set deleted successfully",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flashcard set: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete flashcard set")

# Helper functions

async def save_flashcards_to_database(
    user_id: str,
    session_id: str,
    title: str,
    content: str,
    flashcards: List[FlashcardData],
    difficulty: str,
    options: Dict[str, Any]
):
    """Background task to save flashcards to database"""
    try:
        flashcard_doc = GeneratedFlashcards(
            user_id=user_id,
            session_id=session_id,
            title=title,
            source_content=content,
            content_type="user_input",
            generation_options=options,
            difficulty=DifficultyLevel(difficulty),
            flashcards=flashcards,
            total_cards=len(flashcards)
        )
        
        await flashcard_doc.insert()
        logger.info(f"Saved flashcard set {session_id} for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error saving flashcards to database: {str(e)}")

async def log_tool_usage(operation_type: str, details: Dict[str, Any]):
    """Background task to log tool usage for monitoring"""
    try:
        # Here you could send to analytics service, log to file, etc.
        logger.info(f"Tool usage: {operation_type} - {details}")
        
    except Exception as e:
        logger.error(f"Error logging tool usage: {str(e)}")

def create_fallback_flashcards(content: str, num_cards: int, difficulty: str) -> List[Dict[str, Any]]:
    """Create fallback flashcards when AI generation fails"""
    logger.warning("Creating fallback flashcards due to AI generation failure")
    
    # Split content into sentences
    sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 10]
    
    if not sentences:
        # If no good sentences, create basic flashcards from the content
        words = content.split()
        if len(words) < 3:
            sentences = [f"The topic is: {content}"]
        else:
            sentences = [content[:100] + "..." if len(content) > 100 else content]
    
    flashcards = []
    
    for i in range(min(num_cards, max(len(sentences), 3))):
        if i < len(sentences):
            sentence = sentences[i]
            words = sentence.split()
            
            if len(words) > 3:
                # Create fill-in-the-blank style questions
                key_word_idx = len(words) // 2
                key_word = words[key_word_idx]
                question_words = words.copy()
                question_words[key_word_idx] = "______"
                
                front = f"Fill in the blank: {' '.join(question_words)}"
                back = f"Answer: {key_word}\n\nFull text: {sentence}"
            else:
                # Create definition-style questions
                front = f"What does this refer to: '{sentence[:30]}...'" if len(sentence) > 30 else f"Explain: {sentence}"
                back = sentence
        else:
            # Generate additional cards based on content themes
            front = f"Review question {i+1}: What is an important concept from this content?"
            back = f"This relates to the main topics discussed in the provided content about: {content[:50]}..."
        
        flashcard = {
            "id": i + 1,
            "front": front,
            "back": back,
            "difficulty": difficulty,
            "created_at": datetime.utcnow().isoformat(),
            "study_metadata": {
                "times_reviewed": 0,
                "correct_answers": 0,
                "last_reviewed": None,
                "confidence_level": "new"
            },
            "estimated_study_time": 30,
            "tags": ["fallback", "auto-generated"]
        }
        flashcards.append(flashcard)
    
    return flashcards

def _generate_title_from_content(content: str, max_length: int = 50) -> str:
    """Generate a title from content preview"""
    # Clean content and take first meaningful words
    words = content.strip().split()[:8]
    title = " ".join(words)
    
    if len(title) > max_length:
        title = title[:max_length-3] + "..."
    
    return title if title else "Untitled Flashcard Set"
