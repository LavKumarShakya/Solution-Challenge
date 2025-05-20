import os
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv
from google.cloud import aiplatform
from google.cloud.aiplatform.gapic.schema import predict
import json

load_dotenv()

class VertexAIClient:
    def __init__(self):
        # Initialize GCP AI Platform
        self.project_id = os.getenv("GCP_PROJECT_ID")
        self.location = os.getenv("GCP_LOCATION", "us-central1")
        self.model_id = os.getenv("VERTEX_AI_MODEL", "gemini-1.5-pro")
        
        # Set up credentials
        aiplatform.init(
            project=self.project_id,
            location=self.location,
        )
        
        # Initialize the model
        self.model = aiplatform.GenerativeModel(self.model_id)

    async def generate_learning_path(
        self, query: str, extracted_contents: List[Dict[str, Any]], preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate a learning path using Vertex AI
        
        Args:
            query: The user's search query
            extracted_contents: List of extracted content from various sources
            preferences: User preferences for customization
            
        Returns:
            Dict containing the learning path structure
        """
        # Convert extracted contents to a summary for context
        content_summary = self._create_content_summary(extracted_contents)
        
        # Create prompt for learning path generation
        prompt = self._create_learning_path_prompt(query, content_summary, preferences)
        
        # Execute the model
        response = await self._execute_model_async(prompt)
        
        # Parse and format the result
        learning_path = self._parse_learning_path_response(response, extracted_contents)
        
        return learning_path

    async def customize_learning_path(
        self, original_path: Dict[str, Any], preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Customize an existing learning path based on user preferences
        
        Args:
            original_path: The original learning path
            preferences: New user preferences
            
        Returns:
            Dict containing the customized learning path
        """
        # Create prompt for customization
        prompt = self._create_customization_prompt(original_path, preferences)
        
        # Execute the model
        response = await self._execute_model_async(prompt)
        
        # Parse and format the result
        customized_path = self._parse_customization_response(response, original_path)
        
        return customized_path

    def _create_content_summary(self, extracted_contents: List[Dict[str, Any]]) -> str:
        """Create a summary of extracted contents for context"""
        summaries = []
        for i, content in enumerate(extracted_contents[:20]):  # Limit to 20 items to avoid token limits
            summary = f"{i+1}. {content['title']} ({content['resource_type']} from {content['source']})"
            summary += f"\nDescription: {content['description'][:200]}..."
            summary += f"\nDifficulty: {content['difficulty']}, Time: {content['estimated_time_minutes']} min"
            summaries.append(summary)
        
        return "\n\n".join(summaries)

    def _create_learning_path_prompt(
        self, query: str, content_summary: str, preferences: Dict[str, Any] = None
    ) -> str:
        """Create the prompt for generating a learning path"""
        preferences_str = json.dumps(preferences) if preferences else "{}"
        
        prompt = f"""
        You are an expert educational content curator. Your task is to create a comprehensive learning path for the query:
        "{query}"
        
        I have extracted content from various sources, summarized below:
        
        {content_summary}
        
        User preferences: {preferences_str}
        
        Create a structured learning path with:
        1. A title for the learning path
        2. An overview description
        3. Modules organized in a logical progression
        4. Each module should have relevant resources from the provided content
        
        Format your response as a JSON object with the following structure:
        {{
            "title": "Learning Path Title",
            "description": "Overall description of the learning path",
            "difficulty": "beginner|intermediate|advanced",
            "estimated_hours": 10.5,
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "modules": [
                {{
                    "title": "Module 1 Title",
                    "description": "Module description",
                    "order": 1,
                    "resources": [
                        {{
                            "title": "Resource Title",
                            "url": "https://example.com",
                            "resource_type": "video|article|interactive",
                            "source": "website name",
                            "estimated_time_minutes": 30,
                            "difficulty": "beginner|intermediate|advanced",
                            "description": "Description of the resource",
                            "quality_score": 0.85,
                            "metadata": {{}}
                        }}
                    ]
                }}
            ]
        }}
        
        Ensure that the learning path flows logically from foundational concepts to more advanced topics.
        """
        
        return prompt

    def _create_customization_prompt(
        self, original_path: Dict[str, Any], preferences: Dict[str, Any]
    ) -> str:
        """Create the prompt for customizing a learning path"""
        original_path_json = json.dumps(original_path)
        preferences_json = json.dumps(preferences)
        
        prompt = f"""
        You are an expert educational content curator. Your task is to customize an existing learning path based on new user preferences.
        
        Original learning path:
        {original_path_json}
        
        New user preferences:
        {preferences_json}
        
        Modify the learning path to better match these preferences while maintaining the overall quality and coherence.
        Consider adjusting:
        1. Difficulty level
        2. Resource types (more videos, interactive content, etc.)
        3. Focus areas
        4. Time commitment
        
        Format your response as a complete JSON object with the same structure as the original learning path.
        """
        
        return prompt

    async def _execute_model_async(self, prompt: str) -> str:
        """Execute the Vertex AI model asynchronously"""
        # This would be replaced with actual async implementation
        # For now, we'll simulate with a sync call in an executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._execute_model_sync, prompt)
    
    def _execute_model_sync(self, prompt: str) -> str:
        """Execute the Vertex AI model synchronously"""
        # This is a placeholder for actual model execution
        # In a real implementation, you'd call the Vertex AI API
        
        response = self.model.generate_content(prompt)
        
        # Extract the text from the response
        return response.text
    
    def _parse_learning_path_response(
        self, response: str, extracted_contents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Parse the model response into a learning path structure"""
        try:
            # Clean the response to ensure valid JSON
            cleaned_response = self._clean_json_response(response)
            
            # Parse the JSON
            learning_path = json.loads(cleaned_response)
            
            # Ensure all required fields are present
            required_fields = ["title", "description", "modules"]
            for field in required_fields:
                if field not in learning_path:
                    learning_path[field] = f"Default {field}" if field != "modules" else []
            
            # Ensure each module has all required fields
            for module in learning_path.get("modules", []):
                if "resources" not in module:
                    module["resources"] = []
                    
                if "order" not in module:
                    module["order"] = learning_path["modules"].index(module) + 1
            
            # Calculate estimated_hours if not present
            if "estimated_hours" not in learning_path:
                total_minutes = 0
                for module in learning_path.get("modules", []):
                    for resource in module.get("resources", []):
                        total_minutes += resource.get("estimated_time_minutes", 30)
                learning_path["estimated_hours"] = round(total_minutes / 60, 1)
            
            # Set default difficulty if not present
            if "difficulty" not in learning_path:
                learning_path["difficulty"] = "intermediate"
                
            # Ensure prerequisites is a list
            if "prerequisites" not in learning_path:
                learning_path["prerequisites"] = []
            
            return learning_path
            
        except json.JSONDecodeError:
            # If JSON parsing fails, return a basic structure
            return {
                "title": f"Learning Path for: {extracted_contents[0]['title'] if extracted_contents else 'Query'}",
                "description": "Automatically generated learning path",
                "difficulty": "intermediate",
                "estimated_hours": 5.0,
                "prerequisites": [],
                "modules": []
            }
    
    def _parse_customization_response(
        self, response: str, original_path: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse the model response for customization"""
        try:
            # Clean the response to ensure valid JSON
            cleaned_response = self._clean_json_response(response)
            
            # Parse the JSON
            customized_path = json.loads(cleaned_response)
            
            # Use original path as fallback for missing fields
            required_fields = [
                "title", "description", "modules", "difficulty", 
                "estimated_hours", "prerequisites"
            ]
            
            for field in required_fields:
                if field not in customized_path and field in original_path:
                    customized_path[field] = original_path[field]
            
            return customized_path
            
        except json.JSONDecodeError:
            # If JSON parsing fails, return the original path
            return original_path
    
    def _clean_json_response(self, response: str) -> str:
        """Clean the model response to ensure valid JSON"""
        # Remove markdown code block indicators
        response = response.replace("```json", "").replace("```", "")
        
        # Trim whitespace
        response = response.strip()
        
        return response
