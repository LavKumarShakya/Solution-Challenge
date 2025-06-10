"""
AetherLearn Vertex AI Flashcard Generator - Production Ready
Following Google Cloud best practices for authentication and API usage
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Any
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

logger = logging.getLogger(__name__)

class FlashcardGenerator:
    """
    Production-ready Flashcard Generator using Google Vertex AI
    Implements proper authentication and robust error handling
    """
    
    def __init__(self):
        self.project_id = os.getenv("VERTEX_AI_PROJECT_ID")
        self.location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
        self.model_name = "gemini-1.5-flash-001"  # Using the stable model from guidance
        self.model = None
        self.vertex_available = False
        
        self._initialize_vertex_ai()
    
    def _initialize_vertex_ai(self):
        """Initialize Vertex AI with proper error handling"""
        try:
            if not self.project_id:
                raise ValueError("VERTEX_AI_PROJECT_ID environment variable not set")
            
            logger.info(f"🔧 Initializing Vertex AI...")
            logger.info(f"   Project: {self.project_id}")
            logger.info(f"   Location: {self.location}")
            logger.info(f"   Model: {self.model_name}")
            
            # Initialize Vertex AI SDK - it will automatically use ADC or service account
            vertexai.init(project=self.project_id, location=self.location)
            
            # Initialize the model
            self.model = GenerativeModel(self.model_name)
            
            self.vertex_available = True
            logger.info("✅ Vertex AI initialized successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Vertex AI: {e}")
            logger.warning("🔄 Will use fallback generation if needed")
            self.vertex_available = False
    
    async def generate_flashcards(self, content: str, options: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Generate flashcards using Vertex AI
        
        Args:
            content: Text content to generate flashcards from
            options: Generation options (num_cards, difficulty)
            
        Returns:
            List of flashcard dictionaries
        """
        options = options or {}
        num_cards = options.get("num_cards", 5)
        difficulty = options.get("difficulty", "intermediate")
        
        if not self.vertex_available or not self.model:
            logger.warning("🔄 Vertex AI not available, using fallback")
            return self._create_fallback_flashcards(content, num_cards, difficulty)
        
        try:
            logger.info(f"🚀 Generating {num_cards} {difficulty} flashcards using Vertex AI...")
            
            # Create the prompt following the guidance pattern
            prompt = self._create_expert_prompt(content, num_cards, difficulty)
            
            # Generate content using async method
            response = await self._generate_content_async(prompt)
            
            if not response or not response.text:
                logger.warning("⚠️ Empty response from Vertex AI, using fallback")
                return self._create_fallback_flashcards(content, num_cards, difficulty)
            
            # Parse the response
            flashcards = self._parse_ai_response(response.text, num_cards)
            
            if not flashcards:
                logger.warning("⚠️ Failed to parse AI response, using fallback")
                return self._create_fallback_flashcards(content, num_cards, difficulty)
            
            logger.info(f"✅ Successfully generated {len(flashcards)} flashcards with AI!")
            return flashcards
            
        except Exception as e:
            logger.error(f"❌ AI generation failed: {e}")
            logger.info("🔄 Falling back to emergency generation...")
            return self._create_fallback_flashcards(content, num_cards, difficulty)
    
    async def _generate_content_async(self, prompt: str):
        """Generate content asynchronously"""
        try:
            # Run the synchronous generate_content in a thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content(
                    prompt,
                    generation_config=GenerationConfig(
                        temperature=0.3,  # Lower temperature for more consistent results
                        top_k=40,
                        top_p=0.95,
                        max_output_tokens=2048
                    )
                )
            )
            return response
        except Exception as e:
            logger.error(f"Error in async generation: {e}")
            return None
    
    def _create_expert_prompt(self, content: str, num_cards: int, difficulty: str) -> str:
        """Create an expert-level prompt for flashcard generation"""
        
        difficulty_instructions = {
            "beginner": "Create simple, straightforward questions focusing on basic facts and definitions.",
            "intermediate": "Create questions that require understanding and application of concepts.",
            "advanced": "Create complex questions that require analysis, synthesis, and critical thinking."
        }
        
        difficulty_instruction = difficulty_instructions.get(difficulty, difficulty_instructions["intermediate"])
        
        prompt = f"""
You are an expert tutor and educational content creator. Your task is to generate {num_cards} high-quality flashcards based on the following content.

CONTENT TO ANALYZE:
"{content}"

INSTRUCTIONS:
- {difficulty_instruction}
- Generate exactly {num_cards} flashcards
- Each flashcard should test important concepts from the content
- Questions should be clear, specific, and educational
- Answers should be comprehensive but concise
- Focus on the most important and testable information

OUTPUT FORMAT:
Return the output as a valid JSON object with this exact structure:
{{
  "flashcards": [
    {{
      "question": "Clear, specific question here",
      "answer": "Comprehensive but concise answer here"
    }},
    {{
      "question": "Another clear question",
      "answer": "Another comprehensive answer"
    }}
  ]
}}

EXAMPLE FORMAT:
{{
  "flashcards": [
    {{
      "question": "What is the primary function of a variable in programming?",
      "answer": "A variable stores data values that can be referenced and manipulated throughout a program. It acts as a container with a name that holds information."
    }},
    {{
      "question": "What are the three main types of JavaScript variables?",
      "answer": "The three main types are: var (function-scoped), let (block-scoped), and const (block-scoped and immutable)."
    }}
  ]
}}

Generate the flashcards now:
        """
        
        return prompt.strip()
    
    def _parse_ai_response(self, response_text: str, expected_count: int) -> List[Dict[str, Any]]:
        """Parse AI response into flashcard format"""
        try:
            # Clean up the response (remove markdown code blocks if present)
            cleaned_response = response_text.strip()
            if "```json" in cleaned_response:
                cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned_response:
                cleaned_response = cleaned_response.split("```")[1].strip()
            
            # Parse JSON
            data = json.loads(cleaned_response)
            
            if "flashcards" not in data:
                logger.error("Response missing 'flashcards' key")
                return []
            
            flashcards = []
            for i, card in enumerate(data["flashcards"]):
                if "question" in card and "answer" in card:
                    flashcard = {
                        "id": i + 1,
                        "front": card["question"],
                        "back": card["answer"],
                        "question": card["question"],  # For compatibility
                        "answer": card["answer"],      # For compatibility
                        "difficulty": "intermediate",
                        "created_at": datetime.utcnow().isoformat(),
                        "study_metadata": {
                            "times_reviewed": 0,
                            "correct_answers": 0,
                            "last_reviewed": None,
                            "confidence_level": "new"
                        },
                        "estimated_study_time": 45,
                        "tags": ["ai-generated", "vertex-ai"]
                    }
                    flashcards.append(flashcard)
            
            logger.info(f"📚 Parsed {len(flashcards)} flashcards from AI response")
            return flashcards
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            logger.error(f"Raw response: {response_text[:200]}...")
            return []
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return []
    
    def _create_fallback_flashcards(self, content: str, num_cards: int, difficulty: str) -> List[Dict[str, Any]]:
        """Create fallback flashcards when AI is not available"""
        logger.info(f"🛡️ Creating {num_cards} fallback flashcards...")
        
        # Clean and prepare content
        sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 10]
        words = content.split()
        
        flashcards = []
        
        # Strategy 1: Fill-in-the-blank questions
        for i, sentence in enumerate(sentences[:num_cards]):
            if len(flashcards) >= num_cards:
                break
                
            sentence_words = sentence.split()
            if len(sentence_words) > 5:
                # Find a good word to blank out
                meaningful_words = [w for w in sentence_words if len(w) > 3 and w.isalpha()]
                if meaningful_words:
                    key_word = meaningful_words[len(meaningful_words) // 2]
                    question_words = [w if w.lower() != key_word.lower() else "______" for w in sentence_words]
                    
                    flashcard = {
                        "id": len(flashcards) + 1,
                        "front": f"Fill in the blank: {' '.join(question_words)}",
                        "back": f"Answer: {key_word}\n\nComplete context: {sentence}",
                        "question": f"Fill in the blank: {' '.join(question_words)}",
                        "answer": f"Answer: {key_word}\n\nComplete context: {sentence}",
                        "difficulty": difficulty,
                        "created_at": datetime.utcnow().isoformat(),
                        "study_metadata": {
                            "times_reviewed": 0,
                            "correct_answers": 0,
                            "last_reviewed": None,
                            "confidence_level": "new"
                        },
                        "estimated_study_time": 30,
                        "tags": ["fallback", "fill-in-blank"]
                    }
                    flashcards.append(flashcard)
        
        # Strategy 2: Add comprehension questions if we need more
        while len(flashcards) < num_cards:
            remaining = num_cards - len(flashcards)
            questions = [
                ("What is the main topic of this content?", f"The main topic is: {content[:100]}..."),
                ("What are the key points mentioned?", f"Key points include: {'. '.join(sentences[:2])}"),
                ("Summarize the important information.", f"Summary: {content[:150]}..."),
                ("What should you remember from this content?", f"Important to remember: {sentences[0] if sentences else content[:100]}")
            ]
            
            for i in range(min(remaining, len(questions))):
                question, answer = questions[i]
                flashcard = {
                    "id": len(flashcards) + 1,
                    "front": question,
                    "back": answer,
                    "question": question,
                    "answer": answer,
                    "difficulty": difficulty,
                    "created_at": datetime.utcnow().isoformat(),
                    "study_metadata": {
                        "times_reviewed": 0,
                        "correct_answers": 0,
                        "last_reviewed": None,
                        "confidence_level": "new"
                    },
                    "estimated_study_time": 45,
                    "tags": ["fallback", "comprehension"]
                }
                flashcards.append(flashcard)
                
                if len(flashcards) >= num_cards:
                    break
            
            break  # Prevent infinite loop
        
        logger.info(f"✅ Created {len(flashcards)} fallback flashcards")
        return flashcards[:num_cards]
    
    def health_check(self) -> Dict[str, Any]:
        """Check the health of the flashcard generator"""
        return {
            "vertex_available": self.vertex_available,
            "project_id": self.project_id,
            "location": self.location,
            "model_name": self.model_name,
            "status": "healthy" if self.vertex_available else "fallback_mode"
        }