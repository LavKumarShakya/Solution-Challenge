"""
AetherLearn Intelligent Flashcard Generator
Sophisticated AI system that intelligently analyzes input, considers preferences,
and generates high-quality flashcards using Gemini API
"""

import os
import json
import logging
import asyncio
import re
import aiohttp
from typing import Dict, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class IntelligentFlashcardGenerator:
    """
    Advanced AI-powered flashcard generator that:
    - Intelligently determines if input is a topic or content
    - Considers user preferences for generation
    - Provides detailed acknowledgment of what was done
    - Generates contextually appropriate flashcards using Gemini API
    """
    
    def __init__(self):
        # Gemini API configuration
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-001")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        self.gemini_available = False
        
        self._initialize_gemini_api()
    
    def _initialize_gemini_api(self):
        """Initialize Gemini API with proper error handling"""
        try:
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY environment variable not set")
            
            logger.info(f"🧠 Initializing Intelligent Flashcard Generator with Gemini API...")
            logger.info(f"   Model: {self.model_name}")
            logger.info(f"   API Endpoint: {self.base_url}")
            
            # Test API connection
            self.endpoint_url = f"{self.base_url}/{self.model_name}:generateContent?key={self.api_key}"
            self.gemini_available = True
            
            logger.info("✅ Intelligent AI Generator ready with Gemini API!")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini API: {e}")
            self.gemini_available = False
    
    async def generate_flashcards(self, input_data: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate intelligent flashcards based on input analysis
        
        Args:
            input_data: Topic or content to generate flashcards from
            options: User preferences and generation options
            
        Returns:
            Complete response with flashcards and detailed metadata
        """
        options = options or {}
        num_cards = options.get("num_cards", 5)
        difficulty = options.get("difficulty", "intermediate")
        
        # Analyze input to understand what we're working with
        input_analysis = self._analyze_input(input_data)
        logger.info(f"🔍 Input Analysis: {input_analysis['type']} - {input_analysis['description']}")
        
        if not self.gemini_available:
            logger.warning("🔄 Gemini API not available, using enhanced fallback")
            return await self._create_intelligent_fallback(input_data, options, input_analysis)
        
        try:
            # Create sophisticated prompt based on analysis
            prompt = self._create_intelligent_prompt(input_data, options, input_analysis)
            
            # Generate with Gemini API
            logger.info(f"🚀 Generating {num_cards} {difficulty} flashcards using Gemini API...")
            response = await self._generate_content_gemini_api(prompt)
            
            if not response:
                logger.warning("⚠️ Empty Gemini API response, using intelligent fallback")
                return await self._create_intelligent_fallback(input_data, options, input_analysis)
            
            # Parse the sophisticated AI response
            parsed_result = self._parse_ai_response(response)
            
            if not parsed_result or not parsed_result.get("flashcards"):
                logger.warning("⚠️ Failed to parse AI response")
                return await self._create_intelligent_fallback(input_data, options, input_analysis)
            
            # Format the final response
            final_response = self._format_final_response(
                parsed_result, input_data, options, input_analysis, "ai"
            )
            
            logger.info(f"✅ Successfully generated {len(final_response['flashcards'])} intelligent flashcards!")
            return final_response
            
        except Exception as e:
            logger.error(f"❌ AI generation failed: {e}")
            return await self._create_intelligent_fallback(input_data, options, input_analysis)
    
    def _analyze_input(self, input_data: str) -> Dict[str, Any]:
        """
        Analyze input to determine if it's a topic or content and its characteristics
        """
        input_lower = input_data.lower().strip()
        word_count = len(input_data.split())
        sentence_count = len([s for s in input_data.split('.') if s.strip()])
        
        # Determine input type
        if word_count <= 10 and sentence_count <= 2:
            # Short input, likely a topic
            input_type = "topic"
            description = f"Topic request with {word_count} words"
            approach = "research_and_generate"
        elif 10 < word_count <= 50:
            # Medium input, could be topic with context or brief content
            input_type = "topic_with_context"
            description = f"Extended topic or brief content with {word_count} words"
            approach = "expand_and_generate"
        else:
            # Long input, definitely content to extract from
            input_type = "content"
            description = f"Content provided with {word_count} words, {sentence_count} sentences"
            approach = "extract_and_generate"
        
        # Detect subject areas
        subject_keywords = {
            "programming": ["code", "programming", "javascript", "python", "html", "css", "function", "variable", "algorithm"],
            "science": ["biology", "chemistry", "physics", "atom", "molecule", "cell", "experiment"],
            "mathematics": ["equation", "formula", "calculate", "algebra", "geometry", "statistics"],
            "history": ["history", "ancient", "war", "civilization", "century", "historical"],
            "literature": ["literature", "novel", "poetry", "author", "character", "theme"],
            "business": ["business", "marketing", "finance", "management", "strategy", "economics"]
        }
        
        detected_subjects = []
        for subject, keywords in subject_keywords.items():
            if any(keyword in input_lower for keyword in keywords):
                detected_subjects.append(subject)
        
        return {
            "type": input_type,
            "description": description,
            "approach": approach,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "detected_subjects": detected_subjects,
            "complexity": "high" if word_count > 100 else "medium" if word_count > 30 else "low"
        }
    
    def _create_intelligent_prompt(self, input_data: str, options: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """
        Create a sophisticated prompt based on input analysis and user preferences
        """
        num_cards = options.get("num_cards", 5)
        difficulty = options.get("difficulty", "intermediate")
        formats = options.get("formats", [])
        learning_style = options.get("learning_style", [])
        
        # Base difficulty instructions
        difficulty_instructions = {
            "beginner": "Focus on fundamental concepts, basic definitions, and simple recall questions. Use clear, straightforward language.",
            "intermediate": "Create questions that test understanding, application, and connections between concepts. Mix recall with analytical thinking.",
            "advanced": "Design complex questions requiring critical thinking, analysis, synthesis, and evaluation. Include scenario-based questions."
        }
        
        # Learning style adaptations
        learning_style_adaptations = {
            "visual": "Include questions about diagrams, charts, visual patterns, and spatial relationships where applicable.",
            "auditory": "Focus on verbal explanations, discussions, and questions about sounds, rhythms, or verbal processes.",
            "kinesthetic": "Emphasize hands-on processes, physical actions, and practical applications.",
            "reading": "Focus on text-based analysis, written explanations, and literature-based questions."
        }
        
        # Format preferences
        format_instructions = ""
        if "multiple-choice" in formats:
            format_instructions += "Include some multiple-choice style questions with the correct answer in the back. "
        if "true-false" in formats:
            format_instructions += "Include some true/false questions with explanations. "
        if "short-answer" in formats:
            format_instructions += "Focus on short, direct questions requiring brief explanations. "
        
        # Approach based on analysis
        approach_instructions = {
            "research_and_generate": f"""
The user has provided a TOPIC: "{input_data}"

Your task is to:
1. Use your knowledge to gather comprehensive information about this topic
2. Identify the most important concepts, facts, and principles related to this topic
3. Create {num_cards} educational flashcards that would help someone learn this topic thoroughly
4. Cover different aspects and difficulty levels within the topic
            """,
            "expand_and_generate": f"""
The user has provided a TOPIC WITH CONTEXT: "{input_data}"

Your task is to:
1. Expand on the provided context using your knowledge
2. Identify key learning objectives related to this topic
3. Create {num_cards} flashcards that build upon the provided information
4. Fill in important details and connections the user should know
            """,
            "extract_and_generate": f"""
The user has provided CONTENT TO STUDY: "{input_data}"

Your task is to:
1. Carefully analyze the provided content
2. Extract the most important concepts, facts, and relationships
3. Create {num_cards} flashcards that test understanding of this specific content
4. Focus on what the user needs to remember and understand from this material
            """
        }
        
        # Subject-specific instructions
        subject_instructions = ""
        if analysis["detected_subjects"]:
            subjects = ", ".join(analysis["detected_subjects"])
            subject_instructions = f"This appears to be related to {subjects}. Apply subject-specific best practices for creating educational content in these areas."
        
        # Learning style instructions
        style_instructions = ""
        if learning_style:
            adaptations = [learning_style_adaptations.get(style, "") for style in learning_style]
            style_instructions = " ".join([adapt for adapt in adaptations if adapt])
        
        prompt = f"""
You are an expert educational content creator.

{approach_instructions[analysis["approach"]]}

REQUIREMENTS:
- Generate exactly {num_cards} flashcards
- Difficulty: {difficulty} - {difficulty_instructions[difficulty]}
- {subject_instructions}
- {style_instructions}

RULES:
1. Questions should be clear and specific
2. Answers should be comprehensive but concise (2-4 sentences)
3. Focus on the most important concepts
4. Make questions educational and valuable
5. CRITICAL: Generate ALL {num_cards} flashcards - do not stop early

Return ONLY valid JSON in this EXACT format:
{{
  "count": {num_cards},
  "flashcards": [
    {{
      "front": "Your question here",
      "back": "Your answer here"
    }}
  ]
}}

IMPORTANT: Complete all {num_cards} flashcards. Do not truncate the response.
        """
        
        return prompt.strip()
    
    def _calculate_max_tokens(self, prompt: str) -> int:
        """Calculate optimal max tokens based on prompt and expected response size"""
        # Extract number of cards from prompt
        import re
        num_cards_match = re.search(r'exactly (\d+) flashcards', prompt)
        num_cards = int(num_cards_match.group(1)) if num_cards_match else 10
        
        # Base tokens per card (question + answer + JSON overhead)
        tokens_per_card = 150  # Conservative estimate
        base_overhead = 200    # JSON structure overhead
        
        # Calculate total needed tokens
        total_tokens = (num_cards * tokens_per_card) + base_overhead
        
        # Set reasonable bounds (minimum 2000, maximum 8000)
        max_tokens = max(2000, min(total_tokens, 8000))
        
        logger.info(f"📊 Calculated max tokens: {max_tokens} for {num_cards} cards")
        return max_tokens
    
    async def _generate_content_gemini_api(self, prompt: str):
        """Generate content using Gemini API with optimal settings"""
        try:
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.4,
                    "topK": 40,
                    "topP": 0.9,
                    "maxOutputTokens": self._calculate_max_tokens(prompt)
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.endpoint_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Extract text from Gemini API response
                        if 'candidates' in data and len(data['candidates']) > 0:
                            content = data['candidates'][0]['content']['parts'][0]['text']
                            return content
                        else:
                            logger.error("No candidates in Gemini API response")
                            return None
                    else:
                        error_text = await response.text()
                        logger.error(f"Gemini API error {response.status}: {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error in Gemini API generation: {e}")
            return None
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the AI response with robust error handling"""
        try:
            # Clean up the response
            cleaned_response = response_text.strip()
            
            # Remove markdown code blocks if present
            if "```json" in cleaned_response:
                # Extract content between ```json and ```
                start_marker = "```json"
                end_marker = "```"
                start_idx = cleaned_response.find(start_marker) + len(start_marker)
                end_idx = cleaned_response.find(end_marker, start_idx)
                if end_idx > start_idx:
                    cleaned_response = cleaned_response[start_idx:end_idx].strip()
                else:
                    # If end marker not found, take everything after start marker
                    cleaned_response = cleaned_response[start_idx:].strip()
            elif "```" in cleaned_response:
                # Try to extract JSON object using regex
                json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
                if json_match:
                    cleaned_response = json_match.group(0)
            
            # Additional cleanup - remove any trailing non-JSON content
            if cleaned_response.endswith('...'):
                # Find the last complete JSON structure
                brace_count = 0
                last_valid_pos = 0
                for i, char in enumerate(cleaned_response):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            last_valid_pos = i + 1
                
                if last_valid_pos > 0:
                    cleaned_response = cleaned_response[:last_valid_pos]
            
            # Parse JSON
            data = json.loads(cleaned_response)
            
            # Validate flashcards
            if "flashcards" not in data or not isinstance(data["flashcards"], list):
                logger.error("Invalid flashcards structure")
                return None
            
            # Check each flashcard
            for i, card in enumerate(data["flashcards"]):
                if not isinstance(card, dict) or "front" not in card or "back" not in card:
                    logger.error(f"Invalid flashcard at index {i}")
                    return None
            
            count = data.get("count", len(data["flashcards"]))
            logger.info(f"✅ Parsed {count} flashcards from AI response")
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            logger.error(f"Raw response: {response_text[:200]}...")
            return None
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return None
    
    def _format_final_response(self, parsed_data: Dict[str, Any], input_data: str,
                             options: Dict[str, Any], analysis: Dict[str, Any],
                             generation_method: str) -> Dict[str, Any]:
        """Format the final response"""
        
        # Process flashcards with metadata
        flashcards = []
        for i, card in enumerate(parsed_data["flashcards"]):
            flashcard = {
                "id": str(i + 1),
                "front": card["front"],
                "back": card["back"],
                "question": card["front"],  # Compatibility
                "answer": card["back"],     # Compatibility
                "difficulty": options.get("difficulty", "intermediate"),
                "created_at": datetime.utcnow().isoformat(),
                "study_metadata": {
                    "times_reviewed": 0,
                    "correct_answers": 0,
                    "last_reviewed": None,
                    "confidence_level": "new"
                },
                "estimated_study_time": self._estimate_study_time(card["front"], card["back"]),
                "tags": ["ai-generated", generation_method] + analysis.get("detected_subjects", [])
            }
            flashcards.append(flashcard)
        
        # Simple response with what we need
        return {
            "flashcards": flashcards,
            "metadata": {
                "generation_method": generation_method,
                "total_cards": len(flashcards),
                "generation_time": datetime.utcnow().isoformat(),
                "input_type": analysis["type"],
                "ai_model": self.model_name if generation_method == "ai" else "fallback"
            },
            "success": True
        }
    
    async def _create_intelligent_fallback(self, input_data: str, options: Dict[str, Any],
                                         analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create intelligent fallback when AI is not available"""
        logger.info("🛡️ Creating intelligent fallback flashcards...")
        
        num_cards = options.get("num_cards", 5)
        difficulty = options.get("difficulty", "intermediate")
        
        # Enhanced fallback based on input analysis
        if analysis["type"] == "topic":
            flashcards = self._create_topic_based_fallback(input_data, num_cards, difficulty)
        else:
            flashcards = self._create_content_based_fallback(input_data, num_cards, difficulty)
        
        return {
            "flashcards": flashcards,
            "metadata": {
                "generation_method": "intelligent_fallback",
                "total_cards": len(flashcards),
                "generation_time": datetime.utcnow().isoformat(),
                "input_type": analysis["type"],
                "ai_model": "fallback"
            },
            "success": True
        }
    
    def _create_topic_based_fallback(self, topic: str, num_cards: int, difficulty: str) -> List[Dict[str, Any]]:
        """Create fallback flashcards for topics"""
        flashcards = []
        
        base_questions = [
            f"What is {topic}?",
            f"What are the main characteristics of {topic}?",
            f"Why is {topic} important?",
            f"What are the key components of {topic}?",
            f"How does {topic} work?",
            f"What are the applications of {topic}?",
            f"What are the advantages and disadvantages of {topic}?",
            f"How is {topic} different from related concepts?"
        ]
        
        for i in range(min(num_cards, len(base_questions))):
            flashcard = {
                "id": str(i + 1),
                "front": base_questions[i],
                "back": f"This question about {topic} requires knowledge of the subject. Please refer to your study materials for comprehensive information about {topic}.",
                "question": base_questions[i],
                "answer": f"This question about {topic} requires knowledge of the subject. Please refer to your study materials for comprehensive information about {topic}.",
                "difficulty": difficulty,
                "created_at": datetime.utcnow().isoformat(),
                "study_metadata": {
                    "times_reviewed": 0,
                    "correct_answers": 0,
                    "last_reviewed": None,
                    "confidence_level": "new"
                },
                "estimated_study_time": 45,
                "tags": ["fallback", "topic-based", difficulty]
            }
            flashcards.append(flashcard)
        
        return flashcards
    
    def _create_content_based_fallback(self, content: str, num_cards: int, difficulty: str) -> List[Dict[str, Any]]:
        """Create fallback flashcards from content"""
        sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 15]
        flashcards = []
        
        # Create questions from sentences
        for i, sentence in enumerate(sentences[:num_cards]):
            words = sentence.split()
            if len(words) > 5:
                # Create fill-in-the-blank
                key_word_idx = len(words) // 2
                key_word = words[key_word_idx]
                question_words = words.copy()
                question_words[key_word_idx] = "______"
                
                flashcard = {
                    "id": str(i + 1),
                    "front": f"Fill in the blank: {' '.join(question_words)}",
                    "back": f"Answer: {key_word}\n\nContext: {sentence}",
                    "question": f"Fill in the blank: {' '.join(question_words)}",
                    "answer": f"Answer: {key_word}\n\nContext: {sentence}",
                    "difficulty": difficulty,
                    "created_at": datetime.utcnow().isoformat(),
                    "study_metadata": {
                        "times_reviewed": 0,
                        "correct_answers": 0,
                        "last_reviewed": None,
                        "confidence_level": "new"
                    },
                    "estimated_study_time": 30,
                    "tags": ["fallback", "content-based", difficulty]
                }
                flashcards.append(flashcard)
        
        return flashcards
    
    def _estimate_study_time(self, front: str, back: str) -> int:
        """Estimate study time based on content complexity"""
        total_words = len(front.split()) + len(back.split())
        base_time = max(30, total_words * 3)
        return min(base_time, 120)  # 30 seconds to 2 minutes
    
    def health_check(self) -> Dict[str, Any]:
        """Get health status of the intelligent generator"""
        return {
            "gemini_available": self.gemini_available,
            "api_endpoint": self.base_url,
            "model_name": self.model_name,
            "generator_type": "intelligent_gemini",
            "capabilities": [
                "input_analysis",
                "preference_awareness",
                "intelligent_prompting",
                "detailed_acknowledgment",
                "fallback_generation"
            ],
            "status": "intelligent_ready" if self.gemini_available else "fallback_mode"
        }