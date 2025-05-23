import os
import asyncio
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from google.cloud import aiplatform
try:
    from google.cloud.aiplatform.gapic.schema import predict
except ImportError:
    print("Warning: google.cloud.aiplatform.gapic.schema.predict could not be imported")
try:
    from vertexai.preview import VertexAISearch
    from vertexai.preview.generative_models import GenerativeModel
except ImportError:
    print("Warning: vertexai packages could not be imported. Please install the Vertex AI SDK")
import json
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VertexAIClient:
    def __init__(self):
        # Initialize GCP AI Platform
        self.project_id = os.getenv("VERTEX_AI_PROJECT_ID")
        self.location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
        self.model_id = os.getenv("VERTEX_AI_MODEL", "gemini-1.5-pro")
        self.data_store_id = os.getenv("VERTEX_AI_DATASTORE_ID")
        
        # Set up credentials
        try:
            aiplatform.init(
                project=self.project_id,
                location=self.location,
            )
            
            # Initialize the model
            self.model = GenerativeModel(self.model_id)
            logger.info(f"Successfully initialized Vertex AI with project {self.project_id} and model {self.model_id}")
        except Exception as e:
            logger.error(f"Error initializing Vertex AI: {e}")
            raise
              # Initialize usage tracking
        self.usage_tracking = []
        
    async def discover_content(self, query: str, preferences: Dict[str, Any] = None, max_results: int = 20) -> List[Dict[str, Any]]:
        """
        Discover educational content using Vertex AI Search
        
        Args:
            query: The search query
            preferences: User preferences for content filtering
            max_results: Maximum number of results to return
            
        Returns:
            List of discovered content items with metadata
        """
        try:
            # Log search request for usage monitoring
            self._track_usage("search", {"query": query, "max_results": max_results})
            
            # Run the search operation in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            search_results = await loop.run_in_executor(None, self._execute_search, query, max_results)
            
            # Process and enhance the search results
            processed_results = self._process_search_results(search_results)
            
            # Apply diversity algorithm to ensure varied content types
            diverse_results = self._ensure_content_diversity(processed_results)
            
            # Apply content enhancement
            enhanced_results = self._enhance_content_metadata(diverse_results)
            
            logger.info(f"Discovered {len(enhanced_results)} content items for query: {query}")
            return enhanced_results
            
        except Exception as e:
            logger.error(f"Error in discover_content: {str(e)}")
            # Return empty results in case of error
            return []

    def _execute_search(self, query: str, max_results: int) -> Any:
        """Execute the search query using Vertex AI Search"""
        try:
            # Create the search client
            search_client = VertexAISearch(
                project=self.project_id,
                location=self.location,
                data_store_id=self.data_store_id,
            )
            
            # Build search parameters
            search_params = {
                "query": query, 
                "page_size": max_results * 2  # Request more to allow for filtering
            }
            
            # Add educational content filter if possible
            if hasattr(search_client, "filter_options"):
                search_params["filter"] = "contentCategory:educational"
                
            # Execute the search
            logger.info(f"Executing Vertex AI Search with query: {query}")
            response = search_client.search(**search_params)
            
            return response
            
        except Exception as e:
            logger.error(f"Error executing search: {str(e)}")
            # Return empty results in case of error
            return []
    
    def _process_search_results(self, search_results: Any) -> List[Dict[str, Any]]:
        """Process and standardize the search results with basic metadata"""
        processed_results = []
        
        # Check if we have valid search results
        if not search_results or not hasattr(search_results, "results"):
            logger.warning("No valid search results returned")
            return processed_results
            
        for result in search_results.results:
            try:
                # Extract metadata from the search result
                document = result.document
                metadata = document.derived_struct_data if hasattr(document, "derived_struct_data") else {}
                
                # Create a standardized content item
                content_item = {
                    "title": document.title if hasattr(document, "title") else "Unknown Title",
                    "url": document.uri if hasattr(document, "uri") else "",
                    "description": document.snippets[0].snippet if hasattr(document, "snippets") and document.snippets else "",
                    "source": self._extract_domain(document.uri) if hasattr(document, "uri") else "Unknown Source",
                    "resource_type": self._determine_resource_type(document),
                    "estimated_time_minutes": metadata.get("estimated_time_minutes", 20),
                    "difficulty": metadata.get("difficulty", "intermediate"),
                    "quality_score": result.relevance_score if hasattr(result, "relevance_score") else 0.5,
                    "metadata": metadata
                }
                
                processed_results.append(content_item)
            except Exception as e:
                logger.error(f"Error processing search result: {str(e)}")
                continue
            
        return processed_results
        
    def _ensure_content_diversity(self, content_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply diversity algorithm to ensure varied content types"""
        # If we have few items, return all of them
        if len(content_items) <= 10:
            return content_items
            
        # Group resources by content type
        resources_by_type = {}
        for item in content_items:
            resource_type = item.get("resource_type", "article")
            if resource_type not in resources_by_type:
                resources_by_type[resource_type] = []
            resources_by_type[resource_type].append(item)
        
        # Set target percentages for different content types
        # This ensures we have a good mix of content formats
        type_targets = {
            "video": 0.3,       # 30% videos
            "article": 0.3,     # 30% articles
            "course": 0.15,     # 15% courses
            "interactive": 0.15,# 15% interactive content
            "other": 0.1       # 10% other formats
        }
        
        max_items = min(20, len(content_items))  # Limit to 20 items
        diverse_items = []
        
        # First pass: add minimum number of items from each type
        for content_type, target_pct in type_targets.items():
            if content_type in resources_by_type:
                target_count = max(1, int(max_items * target_pct))
                items = resources_by_type[content_type]
                
                # Sort items by quality score before adding
                items.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
                
                # Add up to target count items
                to_add = items[:target_count]
                diverse_items.extend(to_add)
                
                # Remove added items from the resource pool
                resources_by_type[content_type] = items[target_count:]
        
        # Second pass: fill remaining slots with highest quality items from any type
        remaining_slots = max_items - len(diverse_items)
        if remaining_slots > 0:
            # Collect all remaining items
            remaining_items = []
            for items in resources_by_type.values():
                remaining_items.extend(items)
                
            # Sort by quality score
            remaining_items.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
            
            # Add up to remaining slots
            diverse_items.extend(remaining_items[:remaining_slots])
        
        # Sort final list by quality score
        diverse_items.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
        
        return diverse_items[:max_items]
    
    def _enhance_content_metadata(self, content_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance content items with additional metadata"""
        enhanced_items = []
        
        for item in content_items:
            try:
                # Clone the item to avoid modifying the original
                enhanced = dict(item)
                
                # Estimate time if not provided in metadata
                if "estimated_time_minutes" not in enhanced or enhanced["estimated_time_minutes"] == 20:
                    enhanced["estimated_time_minutes"] = self._estimate_content_time(item)
                
                # Improve difficulty estimation if default value
                if enhanced["difficulty"] == "intermediate":
                    enhanced["difficulty"] = self._estimate_difficulty(item)
                
                # Determine suitable learning styles
                enhanced["learning_styles"] = self._determine_learning_styles(item)
                
                # Add structured metadata for API consumption
                enhanced["metadata"]["api_friendly"] = {
                    "time_commitment": "low" if enhanced["estimated_time_minutes"] < 30 else "medium" if enhanced["estimated_time_minutes"] < 90 else "high",
                    "content_format": enhanced["resource_type"],
                    "source_domain": enhanced["source"],
                    "difficulty_level": enhanced["difficulty"]
                }
                
                enhanced_items.append(enhanced)
            except Exception as e:
                logger.error(f"Error enhancing content item: {str(e)}")
                enhanced_items.append(item)  # Add original item as fallback
        
        return enhanced_items
    def _extract_domain(self, url: str) -> str:
        """Extract the domain from a URL"""
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            # Remove www. prefix if present
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except:
            return "Unknown Source"
    
    def _determine_resource_type(self, document: Any) -> str:
        """Determine the resource type based on the document metadata"""
        # Default resource type
        resource_type = "article"
        
        if not hasattr(document, "uri"):
            return resource_type
            
        url = document.uri.lower()
        
        # Check for video content
        if "youtube.com" in url or "vimeo.com" in url or "coursera.org/lecture" in url:
            resource_type = "video"
        # Check for interactive content
        elif "github.com" in url or "codepen.io" in url or "jsfiddle.net" in url or "replit.com" in url:
            resource_type = "interactive"
        # Check for course content
        elif "coursera.org/learn" in url or "udemy.com/course" in url or "edx.org/course" in url or "khanacademy.org" in url:
            resource_type = "course"
        # Check for documentation
        elif "docs." in url or ".io/docs" in url or ".org/docs" in url or "documentation" in url:
            resource_type = "documentation"
        # Check for academic content
        elif ".edu" in url or "arxiv.org" in url or "researchgate.net" in url or "academia.edu" in url:
            resource_type = "academic"
            
        return resource_type

    def _estimate_content_time(self, content_item: Dict[str, Any]) -> int:
        """Estimate the time needed to consume the content in minutes"""
        content_type = content_item.get("resource_type")
        
        # Default estimates based on content type
        if content_type == "video":
            # YouTube videos often have time in the description
            description = content_item.get("description", "").lower()
            time_indicators = ["min", "minute", "minutes", "hr", "hour", "hours"]
            for indicator in time_indicators:
                if indicator in description:
                    # Find the number before the time indicator
                    parts = description.split(indicator)
                    if len(parts) > 1:
                        try:
                            # Extract numbers from the text before the indicator
                            import re
                            number_matches = re.findall(r'\d+', parts[0].split()[-1])
                            if number_matches:
                                number = int(number_matches[0])
                                # Convert to minutes
                                if indicator in ["hr", "hour", "hours"]:
                                    return number * 60
                                return number
                        except:
                            pass
            # Default estimate for videos
            return 15
            
        elif content_type == "article":
            # Estimate based on description length
            description = content_item.get("description", "")
            word_count = len(description.split())
            # Average reading speed ~200 words per minute
            # Description is usually a snippet, so multiply for full article
            return max(5, min(60, int(word_count * 3 / 200)))
            
        elif content_type == "course":
            # Courses typically require more time
            return 120
            
        elif content_type == "documentation":
            return 30
            
        elif content_type == "interactive" or content_type == "github":
            return 45
            
        elif content_type == "academic":
            # Academic content typically takes longer to digest
            return 60
            
        # Default fallback
        return 20
    
    def _estimate_difficulty(self, content_item: Dict[str, Any]) -> str:
        """Estimate difficulty level of the content"""
        # Get full text for analysis
        text = f"{content_item.get('title', '')} {content_item.get('description', '')}".lower()
        
        # Keywords indicating difficulty
        beginner_keywords = ['beginner', 'introduction', 'basic', 'start', 'fundamental', '101', 'starter', 'novice', 'first steps']
        advanced_keywords = ['advanced', 'expert', 'complex', 'deep dive', 'mastering', 'professional', 'comprehensive', 'in-depth']
        
        # Check for keyword matches
        beginner_score = sum(1 for word in beginner_keywords if word in text)
        advanced_score = sum(1 for word in advanced_keywords if word in text)
        
        if advanced_score > beginner_score:
            return "advanced"
        elif beginner_score > 0:
            return "beginner"
        else:
            return "intermediate"
    
    def _determine_learning_styles(self, content_item: Dict[str, Any]) -> List[str]:
        """Determine which learning styles the content is suitable for"""
        content_type = content_item.get("resource_type")
        learning_styles = []
        
        if content_type == "video":
            learning_styles.extend(["visual", "auditory"])
        elif content_type == "article" or content_type == "documentation":
            learning_styles.append("reading")
        elif content_type == "interactive" or content_type == "github":
            learning_styles.extend(["kinesthetic", "practical"])
        elif content_type == "course":
            learning_styles.extend(["visual", "reading", "structured"])
        elif content_type == "academic":
            learning_styles.extend(["reading", "analytical"])
        
        return learning_styles
    
    def _track_usage(self, operation_type: str, details: Dict[str, Any]):
        """Track Vertex AI API usage for monitoring"""
        usage_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "operation_type": operation_type,
            "details": details
        }
        self.usage_tracking.append(usage_entry)
          # Log the usage
        logger.info(f"Vertex AI usage: {operation_type} - {details.get('query', 'N/A')}")
    async def generate_learning_path(
        self, query: str, content_items: List[Dict[str, Any]], preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate a learning path using Vertex AI
        
        Args:
            query: The user's search query
            content_items: List of content items from Vertex AI Search
            preferences: User preferences for customization
            
        Returns:
            Dict containing the learning path structure
        """
        try:
            # Track usage for monitoring
            self._track_usage("generation", {"query": query, "content_count": len(content_items), "operation": "generate_learning_path"})
            
            # Create content summary for context
            content_summary = self._create_content_summary(content_items)
            
            # Create prompt for learning path generation with content grounding
            prompt = self._create_learning_path_prompt(query, content_summary, preferences)
            
            # Execute the model with optimized parameters
            response = await self._execute_model_async(
                prompt, 
                temperature=0.2,  # Lower temperature for more focused, predictable output
                max_tokens=8192,   # Allow sufficient space for detailed response
                top_p=0.95,        # Slightly constrained sampling for better quality
                top_k=40           # Limit the token selection for more focused output
            )
            
            # Parse and format the result
            learning_path = self._parse_learning_path_response(response, content_items)
            
            logger.info(f"Generated learning path for query: {query} with {len(learning_path.get('modules', []))} modules")
            return learning_path
            
        except Exception as e:
            logger.error(f"Error generating learning path: {str(e)}")
            # Create a minimal fallback learning path
            return self._create_fallback_learning_path(query, content_items)
    
    async def customize_learning_path(
        self, original_path: Dict[str, Any], preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Customize an existing learning path based on user preferences
        
        Args:
            original_path: The original learning path
            preferences: User preferences for customization
            
        Returns:
            Dict containing the customized learning path
        """
        try:
            # Track usage
            self._track_usage("generation", {
                "operation": "customize_learning_path",
                "path_id": original_path.get("_id", "unknown")
            })
            
            # Create prompt for customization with specific instructions
            prompt = self._create_customization_prompt(original_path, preferences)
            
            # Execute the model with slightly different parameters
            # Higher temperature allows for more creative customizations
            response = await self._execute_model_async(
                prompt,
                temperature=0.3,
                max_tokens=8192,
                top_p=0.92,
                top_k=50
            )
            
            # Parse and format the result
            customized_path = self._parse_customization_response(response, original_path)
            
            logger.info(f"Customized learning path with preferences: {preferences}")
            return customized_path
            
        except Exception as e:
            logger.error(f"Error customizing learning path: {str(e)}")
            # If customization fails, return the original path with minimal modifications
            return self._apply_basic_customization(original_path, preferences)

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
            
        async def _execute_model_async(self, prompt: str, temperature: float = 0.2, max_tokens: int = 4096, 
                                   top_p: float = 0.95, top_k: int = 40) -> str:
                """
                Execute the Vertex AI model asynchronously with configurable parameters
            
            Args:
                prompt: The prompt to send to the model
                temperature: Controls randomness (lower = more deterministic)
                max_tokens: Maximum number of tokens to generate
                top_p: Nucleus sampling parameter (higher = more diverse)
                top_k: Top-k sampling parameter (higher = more diverse)
            """
        try:
            # Track model usage
            token_estimate = len(prompt.split()) * 1.3  # Rough estimate
            self._track_usage("model_call", {
                "prompt_tokens": int(token_estimate),
                "temperature": temperature,
                "max_tokens": max_tokens
            })
            
            # Create generation config
            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "top_p": top_p,
                "top_k": top_k
            }
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, 
                lambda: self._execute_model_sync(prompt, generation_config)
            )
            
        except Exception as e:
            logger.error(f"Error executing model: {str(e)}")
            return f"Error: {str(e)}"
    
    def _execute_model_sync(self, prompt: str, generation_config: Dict[str, Any]) -> str:
        """Execute the Vertex AI model synchronously with specific configuration"""
        try:
            # Log the request (without the full prompt for privacy/security)
            prompt_preview = prompt[:100] + "..." if len(prompt) > 100 else prompt
            logger.debug(f"Sending prompt to Vertex AI: {prompt_preview}")
            
            # Execute the model with the provided configuration
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            # Extract and return the text
            if hasattr(response, "text"):
                return response.text
            else:
                # Handle different response formats
                return str(response)
                
        except Exception as e:
            logger.error(f"Model execution error: {str(e)}")
            # Return a simple error message that can be handled by the calling code
            return f"{{\"error\": \"{str(e)}\"}}"
    
    def _create_fallback_learning_path(self, query: str, content_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a minimal fallback learning path when generation fails"""
        # Sort content by quality score
        sorted_content = sorted(content_items, key=lambda x: x.get("quality_score", 0), reverse=True)
        
        # Group by resource type
        content_by_type = {}
        for item in sorted_content:
            res_type = item.get("resource_type", "unknown")
            if res_type not in content_by_type:
                content_by_type[res_type] = []
            content_by_type[res_type].append(item)
        
        # Create basic modules based on content types
        modules = []
        module_order = 1
        
        # Add module for each major content type
        for content_type, items in content_by_type.items():
            if not items:  # Skip empty categories
                continue
                
            # Create module with top 3 resources for this type
            module = {
                "title": f"{content_type.title()} Resources for {query}",
                "description": f"A collection of {content_type} resources related to {query}",
                "order": module_order,
                "resources": items[:3]  # Top 3 resources by quality
            }
            modules.append(module)
            module_order += 1
        
        # Create fallback path
        return {
            "title": f"Learning Path for: {query}",
            "description": f"This learning path contains resources about {query}, organized by content type.",
            "difficulty": "intermediate",
            "estimated_hours": sum(item.get("estimated_time_minutes", 30) for item in sorted_content[:10]) / 60,
            "prerequisites": [],
            "modules": modules
        }
    
    def _apply_basic_customization(self, original_path: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Apply basic customizations when AI customization fails"""
        # Create a deep copy to avoid modifying the original
        customized = json.loads(json.dumps(original_path))
        
        # Apply difficulty preference if specified
        if "difficulty" in preferences:
            customized["difficulty"] = preferences["difficulty"]
        
        # Apply format preferences if specified
        if "formats" in preferences and isinstance(preferences["formats"], list):
            preferred_formats = preferences["formats"]
            
            # For each module, prioritize resources matching preferred formats
            for module in customized.get("modules", []):
                resources = module.get("resources", [])
                
                # Sort resources by whether they match preferred formats
                resources.sort(
                    key=lambda r: 1 if r.get("resource_type") in preferred_formats else 0,
                    reverse=True  # True means preferred formats first
                )
                
                # Update the module with sorted resources
                module["resources"] = resources
        
        # Add customization note
        customized["customization_note"] = f"Basic customization applied with preferences: {json.dumps(preferences)}"
        
        return customized
    
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
