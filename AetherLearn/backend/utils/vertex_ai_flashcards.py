import os
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import json
import logging
import re

# Google Cloud imports
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FlashcardGenerator:
    """
    Professional Flashcard Generator for AetherLearn - Expert AI system specializing in 
    creating high-quality educational flashcards from any content or topic.
    """
    
    def __init__(self):
        # Initialize Vertex AI
        self.project_id = os.getenv("VERTEX_AI_PROJECT_ID")
        self.location = os.getenv("VERTEX_AI_LOCATION", "global")
        self.model_id = os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
        self.model = None
        self.vertex_available = False
        
        # Set up Google Cloud credentials
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path and os.path.exists(credentials_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
            logger.info(f"Using Google Cloud credentials from: {credentials_path}")
        
        try:
            if not self.project_id:
                raise ValueError("VERTEX_AI_PROJECT_ID not set")
                
            vertexai.init(project=self.project_id, location=self.location)
            self.model = GenerativeModel(self.model_id)
            self.vertex_available = True
            logger.info(f"✅ Flashcard Generator initialized with Vertex AI model: {self.model_id}")
        except Exception as e:
            logger.warning(f"⚠️ Vertex AI not available, will use fallback generation: {e}")
            self.vertex_available = False

    async def generate_flashcards(self, content: str, options: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Generate high-quality flashcards from content using advanced AI
        
        Args:
            content: Text content to generate flashcards from
            options: Generation options (num_cards, difficulty)
            
        Returns:
            List of flashcard dictionaries with front/back content
        """
        options = options or {}
        num_cards = options.get("num_cards", 10)
        difficulty = options.get("difficulty", "intermediate")
        
        logger.info(f"🎯 AetherLearn Flashcard Generator: Creating {num_cards} {difficulty} flashcards")
        
        # Check if Vertex AI is available
        if not self.vertex_available or not self.model:
            logger.warning("🔄 Vertex AI not available, using enhanced fallback generation")
            return self._create_emergency_flashcards(content, num_cards, difficulty)
        
        try:
            # Create the expert-level prompt
            prompt = self._create_expert_flashcard_prompt(content, num_cards, difficulty)
            
            # Execute with optimal parameters for flashcard generation
            generation_config = GenerationConfig(
                temperature=0.4,  # Balanced creativity and accuracy
                top_k=40,
                top_p=0.9,
                max_output_tokens=4096
            )
            
            logger.info("🚀 Calling Vertex AI for flashcard generation...")
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            response_text = response.text
            logger.info(f"✅ Received AI response ({len(response_text)} chars)")
            
            # Parse and validate the response
            flashcards = self._parse_and_validate_response(response_text, num_cards)
            
            if not flashcards or len(flashcards) == 0:
                logger.warning("⚠️ AI returned no valid flashcards, using fallback")
                return self._create_emergency_flashcards(content, num_cards, difficulty)
            
            # Enhance with metadata
            enhanced_flashcards = self._enhance_flashcards(flashcards, difficulty)
            
            logger.info(f"🎉 Successfully generated {len(enhanced_flashcards)} high-quality AI flashcards")
            return enhanced_flashcards
            
        except Exception as e:
            logger.error(f"❌ Error in AI flashcard generation: {str(e)}")
            logger.info("🔄 Falling back to emergency generation...")
            return self._create_emergency_flashcards(content, num_cards, difficulty)

    def _create_expert_flashcard_prompt(self, content: str, num_cards: int, difficulty: str) -> str:
        """Create an expert-level prompt for the AI model"""
        
        difficulty_guidelines = {
            "beginner": {
                "style": "simple, direct questions focusing on basic facts and definitions",
                "complexity": "Use simple language, avoid jargon, focus on fundamental concepts",
                "examples": "What is X? Define Y. True/False questions about basic facts."
            },
            "intermediate": {
                "style": "analytical questions requiring understanding and application",
                "complexity": "Use standard terminology, focus on relationships and processes",
                "examples": "How does X relate to Y? Explain the process of Z. What happens when..."
            },
            "advanced": {
                "style": "complex scenarios requiring synthesis, analysis, and critical thinking",
                "complexity": "Use technical language, focus on implications and advanced applications", 
                "examples": "Analyze the implications of X. Compare and contrast Y and Z. Evaluate..."
            }
        }
        
        guidelines = difficulty_guidelines.get(difficulty, difficulty_guidelines["intermediate"])
        
        prompt = f"""🎓 You are AetherLearn's Expert Flashcard Generator - a world-class AI system specialized in creating exceptional educational flashcards. You have mastered the art of transforming any content into engaging, effective study materials.

📋 MISSION: Create {num_cards} high-quality flashcards at {difficulty.upper()} level from the provided content.

🎯 EXPERTISE GUIDELINES:
• Difficulty Level: {difficulty.upper()}
• Question Style: {guidelines['style']}
• Complexity: {guidelines['complexity']}
• Examples: {guidelines['examples']}

📚 SOURCE CONTENT:
{content}

🔥 FLASHCARD CREATION RULES:
1. Each flashcard MUST have a clear, engaging FRONT (question/prompt) and comprehensive BACK (answer/explanation)
2. Questions should test understanding, not just memorization
3. Answers should be complete but concise (2-4 sentences ideal)
4. Use the exact difficulty level specified
5. Cover the most important concepts from the content
6. Make questions specific and actionable
7. Ensure answers are accurate and educational

💎 OUTPUT FORMAT - Return EXACTLY this JSON structure:
```json
{{
  "flashcards": [
    {{
      "id": 1,
      "front": "Engaging question or prompt here",
      "back": "Complete, accurate answer with brief explanation"
    }},
    {{
      "id": 2,
      "front": "Next question here",
      "back": "Next answer here"
    }}
  ]
}}
```

🚀 BEGIN FLASHCARD GENERATION:
Create {num_cards} exceptional flashcards that will help students master this content. Make each card a valuable learning tool!"""

        return prompt

    def _parse_and_validate_response(self, response: str, expected_count: int) -> List[Dict[str, Any]]:
        """Parse and validate the AI response into flashcard data"""
        try:
            # Clean the response
            cleaned_response = self._clean_json_response(response)
            
            # Try to parse JSON
            try:
                data = json.loads(cleaned_response)
                flashcards = data.get("flashcards", [])
            except json.JSONDecodeError:
                # Fallback: try to extract flashcards using regex
                flashcards = self._extract_flashcards_with_regex(response)
            
            # Validate and clean flashcards
            valid_flashcards = []
            for i, card in enumerate(flashcards[:expected_count]):
                if isinstance(card, dict) and "front" in card and "back" in card:
                    valid_card = {
                        "id": card.get("id", i + 1),
                        "front": str(card["front"]).strip(),
                        "back": str(card["back"]).strip()
                    }
                    
                    # Ensure content is not empty or just placeholder
                    if (len(valid_card["front"]) > 10 and 
                        len(valid_card["back"]) > 10 and
                        not self._is_placeholder_content(valid_card["front"]) and
                        not self._is_placeholder_content(valid_card["back"])):
                        valid_flashcards.append(valid_card)
            
            logger.info(f"✅ Parsed {len(valid_flashcards)} valid flashcards from AI response")
            return valid_flashcards
            
        except Exception as e:
            logger.error(f"❌ Error parsing flashcard response: {str(e)}")
            return []

    def _clean_json_response(self, response: str) -> str:
        """Clean the response to extract valid JSON"""
        # Remove markdown code blocks
        response = re.sub(r'```json\s*', '', response)
        response = re.sub(r'```\s*', '', response)
        
        # Find JSON content between braces
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json_match.group(0)
        
        return response.strip()

    def _extract_flashcards_with_regex(self, response: str) -> List[Dict[str, Any]]:
        """Fallback method to extract flashcards using regex patterns"""
        flashcards = []
        
        # Pattern to match various flashcard formats
        patterns = [
            r'"front":\s*"([^"]+)"[^}]*"back":\s*"([^"]+)"',
            r'Front:\s*([^\n]+)\s*Back:\s*([^\n]+)',
            r'Q:\s*([^\n]+)\s*A:\s*([^\n]+)',
            r'Question:\s*([^\n]+)\s*Answer:\s*([^\n]+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response, re.IGNORECASE | re.DOTALL)
            for i, (front, back) in enumerate(matches):
                flashcards.append({
                    "id": i + 1,
                    "front": front.strip(),
                    "back": back.strip()
                })
            
            if flashcards:
                break
        
        return flashcards

    def _is_placeholder_content(self, content: str) -> bool:
        """Check if content is just a placeholder"""
        placeholders = [
            "please review", "provided content", "key concepts", 
            "understand the", "content to", "review the"
        ]
        content_lower = content.lower()
        return any(placeholder in content_lower for placeholder in placeholders)

    def _enhance_flashcards(self, flashcards: List[Dict[str, Any]], difficulty: str) -> List[Dict[str, Any]]:
        """Add metadata and enhancements to flashcards"""
        for card in flashcards:
            card.update({
                "difficulty": difficulty,
                "created_at": datetime.utcnow().isoformat(),
                "study_metadata": {
                    "times_reviewed": 0,
                    "correct_answers": 0,
                    "last_reviewed": None,
                    "confidence_level": "new"
                },
                "estimated_study_time": self._estimate_study_time(card["front"], card["back"]),
                "tags": self._generate_tags(card["front"], card["back"])
            })
        
        return flashcards

    def _estimate_study_time(self, front: str, back: str) -> int:
        """Estimate study time in seconds based on content complexity"""
        word_count = len(front.split()) + len(back.split())
        base_time = max(15, word_count * 2)  # Minimum 15 seconds
        return min(base_time, 120)  # Maximum 2 minutes

    def _generate_tags(self, front: str, back: str) -> List[str]:
        """Generate relevant tags for the flashcard"""
        combined_text = f"{front} {back}".lower()
        
        # Common educational tags
        tag_keywords = {
            "definition": ["what is", "define", "meaning", "definition"],
            "process": ["how to", "process", "steps", "method"],
            "comparison": ["compare", "contrast", "difference", "versus"],
            "analysis": ["analyze", "why", "explain", "because"],
            "factual": ["when", "where", "who", "date", "year"],
            "concept": ["concept", "theory", "principle", "idea"]
        }
        
        tags = []
        for tag, keywords in tag_keywords.items():
            if any(keyword in combined_text for keyword in keywords):
                tags.append(tag)
        
        return tags or ["general"]

    def _create_emergency_flashcards(self, content: str, num_cards: int, difficulty: str) -> List[Dict[str, Any]]:
        """Create high-quality fallback flashcards when AI generation fails"""
        logger.warning("🚨 Creating enhanced emergency flashcards")
        
        # Clean and prepare content
        content = content.strip()
        sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 15]
        
        # Extract key terms and concepts
        words = content.lower().split()
        # Simple keyword extraction - look for longer words and repeated terms
        keywords = [w for w in set(words) if len(w) > 4 and w.isalpha()][:10]
        
        flashcards = []
        card_id = 1
        
        # Strategy 1: Fill-in-the-blank from sentences
        for i, sentence in enumerate(sentences[:max(1, num_cards//2)]):
            words = sentence.split()
            if len(words) > 5:
                # Choose a meaningful word to blank out
                meaningful_words = [w for w in words if len(w) > 3 and w.isalpha()]
                if meaningful_words:
                    key_word = meaningful_words[len(meaningful_words)//2]
                    question_words = [w if w != key_word else "______" for w in words]
                    
                    flashcard = {
                        "id": card_id,
                        "front": f"Fill in the blank: {' '.join(question_words)}",
                        "back": f"Answer: {key_word}\n\nComplete sentence: {sentence}",
                        "difficulty": difficulty,
                        "created_at": datetime.utcnow().isoformat(),
                        "study_metadata": {
                            "times_reviewed": 0,
                            "correct_answers": 0,
                            "last_reviewed": None,
                            "confidence_level": "new"
                        },
                        "estimated_study_time": 30,
                        "tags": ["auto-generated", "fill-in-blank"]
                    }
                    flashcards.append(flashcard)
                    card_id += 1
        
        # Strategy 2: Definition-style questions from keywords
        for keyword in keywords[:max(1, num_cards - len(flashcards))]:
            if card_id > num_cards:
                break
                
            # Find context for the keyword
            context_sentences = [s for s in sentences if keyword.lower() in s.lower()]
            context = context_sentences[0] if context_sentences else f"This term appears in the provided content about: {content[:100]}..."
            
            if difficulty == "beginner":
                front = f"What is '{keyword}'?"
                back = f"Based on the content: {context}"
            elif difficulty == "intermediate":
                front = f"Explain the significance of '{keyword}' in this context."
                back = f"'{keyword}' is important because: {context}"
            else:  # advanced
                front = f"Analyze the role and implications of '{keyword}'."
                back = f"'{keyword}' represents: {context}\n\nThis concept is significant because it relates to the broader themes in the content."
            
            flashcard = {
                "id": card_id,
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
                "estimated_study_time": 45,
                "tags": ["auto-generated", "definition"]
            }
            flashcards.append(flashcard)
            card_id += 1
        
        # Strategy 3: Comprehensive questions if we need more cards
        while len(flashcards) < num_cards:
            comprehensive_questions = [
                ("What are the main points covered in this content?", f"The key points include: {content[:200]}..."),
                ("Summarize the most important information.", f"Summary: {content[:150]}..."),
                ("What should you remember from this content?", f"Remember: {content[:180]}..."),
                ("What are the key takeaways?", f"Key takeaways: {'. '.join(sentences[:2])}"),
            ]
            
            if card_id - 1 < len(comprehensive_questions):
                question, answer = comprehensive_questions[card_id - len(flashcards) - 1]
                flashcard = {
                    "id": card_id,
                    "front": question,
                    "back": answer,
                    "difficulty": difficulty,
                    "created_at": datetime.utcnow().isoformat(),
                    "study_metadata": {
                        "times_reviewed": 0,
                        "correct_answers": 0,
                        "last_reviewed": None,
                        "confidence_level": "new"
                    },
                    "estimated_study_time": 60,
                    "tags": ["auto-generated", "comprehensive"]
                }
                flashcards.append(flashcard)
                card_id += 1
            else:
                break
        
        logger.info(f"✅ Created {len(flashcards)} enhanced emergency flashcards")
        return flashcards[:num_cards]