import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dotenv import load_dotenv
import json
import logging
import re
from urllib.parse import urlparse

# Google Cloud imports
from google.cloud import discoveryengine_v1
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VertexAIClient:
    """
    Enhanced Vertex AI Client for educational content discovery and learning path generation.
    Integrates with Vertex AI Search (Discovery Engine) and Generative Models.
    """
    def __init__(self):
        # Initialize GCP AI Platform
        self.project_id = os.getenv("VERTEX_AI_PROJECT_ID")
        self.location = os.getenv("VERTEX_AI_LOCATION", "global")
        self.model_id = os.getenv("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
        self.data_store_id = os.getenv("VERTEX_AI_DATASTORE_ID")
        
        # Enhanced Content Filtering and Ranking Configuration
        self.content_filters = {
            "quality_threshold": float(os.getenv("CONTENT_QUALITY_THRESHOLD", "0.7")),
            "max_content_age_days": int(os.getenv("MAX_CONTENT_AGE_DAYS", "365")),
            "max_content_items": int(os.getenv("MAX_CONTENT_ITEMS", "30")),
            "max_content_sources": int(os.getenv("MAX_CONTENT_SOURCES", "15")),
            "enable_content_caching": os.getenv("ENABLE_CONTENT_CACHING", "true").lower() == "true",
            "cache_expiry_hours": int(os.getenv("CACHE_EXPIRY_HOURS", "24"))
        }
        
        # Content Source Credibility Scoring
        self.source_credibility_scores = {
            # Educational Institutions
            "edu": 0.95, "mit.edu": 0.98, "stanford.edu": 0.98, "harvard.edu": 0.98,
            "coursera.org": 0.92, "edx.org": 0.92, "udacity.com": 0.88, "khanacademy.org": 0.90,
            
            # Professional Platforms
            "linkedin.com/learning": 0.85, "pluralsight.com": 0.87, "udemy.com": 0.75,
            "skillshare.com": 0.70, "masterclass.com": 0.80,
            
            # Technical Documentation
            "docs.python.org": 0.95, "developer.mozilla.org": 0.93, "docs.microsoft.com": 0.90,
            "cloud.google.com": 0.92, "aws.amazon.com": 0.90, "azure.microsoft.com": 0.90,
            
            # Academic and Research
            "arxiv.org": 0.88, "ieee.org": 0.92, "acm.org": 0.90, "researchgate.net": 0.80,
            "scholar.google.com": 0.85,
            
            # Video Platforms (filtered)
            "youtube.com/c/": 0.75, "youtube.com/user/": 0.70, "vimeo.com": 0.72,
            "ted.com": 0.88, "youtube.com/channel/UC": 0.65,
            
            # Coding Platforms
            "github.com": 0.85, "stackoverflow.com": 0.80, "medium.com": 0.70,
            "dev.to": 0.65, "hashnode.com": 0.65,
            
            # Default scores
            "unknown": 0.50, "default": 0.60
        }
        
        # Content Type Priority Weights
        self.content_type_weights = {
            "course": 1.0,      # Highest priority for structured courses
            "documentation": 0.95,  # Official docs are very valuable
            "academic": 0.90,   # Academic papers and research
            "interactive": 0.85, # Hands-on learning
            "video": 0.80,      # Educational videos
            "article": 0.75,    # Written tutorials and articles
            "tutorial": 0.80,   # Step-by-step guides
            "reference": 0.70,  # Reference materials
            "blog": 0.60,       # Blog posts
            "forum": 0.50,      # Forum discussions
            "unknown": 0.40     # Unknown content types
        }
        
        # Learning Style Preferences
        self.learning_style_mappings = {
            "visual": ["video", "interactive", "infographic"],
            "auditory": ["video", "podcast", "audio"],
            "reading": ["article", "documentation", "academic", "blog"],
            "kinesthetic": ["interactive", "tutorial", "hands-on"],
            "structured": ["course", "documentation", "academic"],
            "practical": ["tutorial", "interactive", "project"]
        }
        
        # Difficulty Progression Rules
        self.difficulty_progression = {
            "beginner": {"weights": {"beginner": 0.7, "intermediate": 0.3, "advanced": 0.0}},
            "intermediate": {"weights": {"beginner": 0.2, "intermediate": 0.6, "advanced": 0.2}},
            "advanced": {"weights": {"beginner": 0.1, "intermediate": 0.3, "advanced": 0.6}}
        }
        
        # Set up credentials
        try:
            # Validate required environment variables
            if not self.project_id:
                raise ValueError("VERTEX_AI_PROJECT_ID environment variable is required")
            if not self.data_store_id:
                raise ValueError("VERTEX_AI_DATASTORE_ID environment variable is required")
            
            # Initialize Vertex AI
            vertexai.init(project=self.project_id, location=self.location)
            
            # Initialize the generative model
            self.model = GenerativeModel(self.model_id)
            
            # Initialize Discovery Engine client for search
            try:
                self.search_client = discoveryengine_v1.SearchServiceClient()
                logger.info("Discovery Engine client initialized successfully")
            except Exception as discovery_error:
                logger.warning(f"Discovery Engine client initialization failed: {discovery_error}")
                # Continue without Discovery Engine - will use fallback content
                self.search_client = None
            
            logger.info(f"Successfully initialized Vertex AI with project {self.project_id} and model {self.model_id}")
        except Exception as e:
            logger.error(f"Error initializing Vertex AI: {e}")
            raise
            
        # Initialize usage tracking and caching
        self.usage_tracking = []
        self.content_cache = {}

    async def discover_content(self, query: str, preferences: Dict[str, Any] = None, max_results: int = 20) -> List[Dict[str, Any]]:
        """
        Discover educational content using Vertex AI Search with enhanced filtering
        
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
            
            # Check cache first if enabled
            if self.content_filters["enable_content_caching"]:
                cached_content = self._check_cache(query)
                if cached_content:
                    logger.info(f"Cache hit for query: {query}")
                    return self._apply_preference_filtering(cached_content, preferences)
            
            # Run the search operation in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            search_results = await loop.run_in_executor(None, self._execute_search, query, max_results)
            
            # Process and enhance the search results
            processed_results = self._process_search_results(search_results)
            
            # Apply enhanced content filtering and ranking
            filtered_results = self._apply_content_filtering(processed_results, preferences)
            
            # Apply credibility scoring
            scored_results = self._apply_credibility_scoring(filtered_results)
            
            # Apply diversity algorithm to ensure varied content types
            diverse_results = self._ensure_content_diversity(scored_results, preferences)
            
            # Apply final ranking based on all criteria
            ranked_results = self._apply_final_ranking(diverse_results, preferences)
            
            # Cache the results if caching is enabled
            if self.content_filters["enable_content_caching"]:
                self._cache_results(query, ranked_results)
            
            logger.info(f"Discovered {len(ranked_results)} content items for query: {query}")
            return ranked_results
            
        except Exception as e:
            logger.error(f"Error in discover_content: {str(e)}")
            # Return empty results in case of error
            return []

    def _apply_content_filtering(self, content_items: List[Dict[str, Any]], preferences: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Apply enhanced content filtering based on quality, age, and other criteria"""
        filtered_items = []
        preferences = preferences or {}
        
        # Track filtered out items for logging
        filtered_stats = {"quality": 0, "age": 0, "source_limit": 0, "total": len(content_items)}
        source_counts = {}
        
        for item in content_items:
            # Quality threshold filtering
            quality_score = item.get("quality_score", 0)
            if quality_score < self.content_filters["quality_threshold"]:
                filtered_stats["quality"] += 1
                continue
            
            # Source diversity filtering
            source = item.get("source", "unknown")
            if source not in source_counts:
                source_counts[source] = 0
            
            if source_counts[source] >= (self.content_filters["max_content_sources"] // 5):  # Max 5 items per source
                filtered_stats["source_limit"] += 1
                continue
            
            source_counts[source] += 1
            
            # Apply user preference filters if specified
            if self._matches_user_preferences(item, preferences):
                filtered_items.append(item)
        
        # Log filtering statistics
        logger.info(f"Content filtering stats: {filtered_stats}")
        
        return filtered_items[:self.content_filters["max_content_items"]]
    
    def _matches_user_preferences(self, item: Dict[str, Any], preferences: Dict[str, Any]) -> bool:
        """Check if an item matches user preferences"""
        if not preferences:
            return True
        
        # Check difficulty preference
        if "difficulty" in preferences:
            preferred_difficulty = preferences["difficulty"]
            item_difficulty = item.get("difficulty", "intermediate")
            
            # Allow some flexibility in difficulty matching
            difficulty_map = {"beginner": 0, "intermediate": 1, "advanced": 2}
            pref_level = difficulty_map.get(preferred_difficulty, 1)
            item_level = difficulty_map.get(item_difficulty, 1)
            
            # Allow one level difference
            if abs(pref_level - item_level) > 1:
                return False
        
        # Check content type preferences
        if "formats" in preferences and preferences["formats"]:
            item_type = item.get("resource_type", "unknown")
            if item_type not in preferences["formats"]:
                return False
        
        # Check learning style preferences
        if "learning_style" in preferences:
            preferred_styles = preferences["learning_style"]
            item_styles = item.get("learning_styles", [])
            
            # Check if there's any overlap
            if not any(style in item_styles for style in preferred_styles):
                return False
        
        # Check time commitment preferences
        if "max_time_minutes" in preferences:
            max_time = preferences["max_time_minutes"]
            item_time = item.get("estimated_time_minutes", 30)
            if item_time > max_time:
                return False
        
        return True

    def _apply_credibility_scoring(self, content_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply credibility scoring based on source reputation"""
        for item in content_items:
            source = item.get("source", "unknown").lower()
            
            # Check for exact matches first
            credibility_score = self.source_credibility_scores.get(source)
            
            if credibility_score is None:
                # Check for partial matches
                for pattern, score in self.source_credibility_scores.items():
                    if pattern in source or source in pattern:
                        credibility_score = score
                        break
                
                # Default score if no match
                if credibility_score is None:
                    credibility_score = self.source_credibility_scores["default"]
            
            # Apply credibility score to overall quality
            original_quality = item.get("quality_score", 0.5)
            adjusted_quality = (original_quality * 0.7) + (credibility_score * 0.3)
            item["quality_score"] = min(1.0, adjusted_quality)
            item["credibility_score"] = credibility_score
        
        return content_items

    def _apply_preference_filtering(self, content_items: List[Dict[str, Any]], preferences: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Apply user preference filtering to cached content"""
        if not preferences:
            return content_items
        
        filtered_items = []
        for item in content_items:
            if self._matches_user_preferences(item, preferences):
                filtered_items.append(item)
        
        return filtered_items

    def _ensure_content_diversity(self, content_items: List[Dict[str, Any]], preferences: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Enhanced diversity algorithm with preference consideration"""
        if len(content_items) <= 10:
            return content_items
        
        preferences = preferences or {}
        
        # Group resources by content type
        resources_by_type = {}
        for item in content_items:
            resource_type = item.get("resource_type", "article")
            if resource_type not in resources_by_type:
                resources_by_type[resource_type] = []
            resources_by_type[resource_type].append(item)
        
        # Adjust target percentages based on user preferences
        base_targets = {
            "video": 0.3,       # 30% videos
            "article": 0.25,    # 25% articles
            "course": 0.2,      # 20% courses
            "interactive": 0.15,# 15% interactive content
            "documentation": 0.1 # 10% documentation
        }
        
        # Modify targets based on preferences
        if "formats" in preferences and preferences["formats"]:
            preferred_formats = preferences["formats"]
            adjusted_targets = {}
            
            # Boost preferred formats
            for fmt in preferred_formats:
                if fmt in base_targets:
                    adjusted_targets[fmt] = base_targets[fmt] * 1.5
            
            # Normalize to ensure total doesn't exceed 1.0
            total_weight = sum(adjusted_targets.values())
            if total_weight > 1.0:
                for fmt in adjusted_targets:
                    adjusted_targets[fmt] = adjusted_targets[fmt] / total_weight
            
            type_targets = adjusted_targets
        else:
            type_targets = base_targets
        
        max_items = min(self.content_filters["max_content_items"], len(content_items))
        diverse_items = []
        
        # First pass: add items based on adjusted targets
        for content_type, target_pct in type_targets.items():
            if content_type in resources_by_type:
                target_count = max(1, int(max_items * target_pct))
                items = resources_by_type[content_type]
                
                # Sort items by combined score (quality + credibility + type weight)
                items.sort(key=lambda x: self._calculate_item_score(x), reverse=True)
                
                # Add up to target count items
                to_add = items[:target_count]
                diverse_items.extend(to_add)
                
                # Remove added items from the resource pool
                resources_by_type[content_type] = items[target_count:]
        
        # Second pass: fill remaining slots with highest scoring items
        remaining_slots = max_items - len(diverse_items)
        if remaining_slots > 0:
            remaining_items = []
            for items in resources_by_type.values():
                remaining_items.extend(items)
            
            # Sort by combined score
            remaining_items.sort(key=lambda x: self._calculate_item_score(x), reverse=True)
            diverse_items.extend(remaining_items[:remaining_slots])
        
        return diverse_items[:max_items]

    def _calculate_item_score(self, item: Dict[str, Any]) -> float:
        """Calculate a comprehensive score for ranking items"""
        quality_score = item.get("quality_score", 0.5)
        credibility_score = item.get("credibility_score", 0.5)
        content_type = item.get("resource_type", "unknown")
        type_weight = self.content_type_weights.get(content_type, 0.5)
        
        # Weighted combination of all factors
        combined_score = (quality_score * 0.4) + (credibility_score * 0.3) + (type_weight * 0.3)
        
        return combined_score

    def _apply_final_ranking(self, content_items: List[Dict[str, Any]], preferences: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Apply final ranking based on all criteria"""
        preferences = preferences or {}
        
        # Calculate final scores for each item
        for item in content_items:
            base_score = self._calculate_item_score(item)
            
            # Apply preference bonuses
            preference_bonus = 0.0
            
            # Learning style bonus
            if "learning_style" in preferences:
                item_styles = item.get("learning_styles", [])
                preferred_styles = preferences["learning_style"]
                style_matches = len(set(item_styles) & set(preferred_styles))
                preference_bonus += (style_matches * 0.1)
            
            # Difficulty match bonus
            if "difficulty" in preferences:
                if item.get("difficulty") == preferences["difficulty"]:
                    preference_bonus += 0.15
            
            # Time preference bonus
            if "preferred_time_range" in preferences:
                item_time = item.get("estimated_time_minutes", 30)
                time_range = preferences["preferred_time_range"]
                if time_range == "short" and item_time <= 30:
                    preference_bonus += 0.1
                elif time_range == "medium" and 30 < item_time <= 90:
                    preference_bonus += 0.1
                elif time_range == "long" and item_time > 90:
                    preference_bonus += 0.1
            
            item["final_score"] = min(1.0, base_score + preference_bonus)
        
        # Sort by final score
        return sorted(content_items, key=lambda x: x.get("final_score", 0), reverse=True)

    def _check_cache(self, query: str) -> List[Dict[str, Any]]:
        """Check if we have cached results for the query"""
        query_key = query.lower().strip()
        
        if query_key in self.content_cache:
            cache_entry = self.content_cache[query_key]
            cache_time = cache_entry["timestamp"]
            cache_expiry = timedelta(hours=self.content_filters["cache_expiry_hours"])
            
            if datetime.utcnow() - cache_time < cache_expiry:
                return cache_entry["content"]
            else:
                # Remove expired cache entry
                del self.content_cache[query_key]
        
        return None

    def _cache_results(self, query: str, content_items: List[Dict[str, Any]]):
        """Cache search results for future use"""
        query_key = query.lower().strip()
        self.content_cache[query_key] = {
            "timestamp": datetime.utcnow(),
            "content": content_items
        }
        
        # Cleanup old cache entries to prevent memory issues
        if len(self.content_cache) > 100:  # Keep max 100 cached queries
            oldest_key = min(self.content_cache.keys(), 
                           key=lambda k: self.content_cache[k]["timestamp"])
            del self.content_cache[oldest_key]

    def _execute_search(self, query: str, max_results: int) -> Any:
        """Execute the search query using Vertex AI Search (Discovery Engine)"""
        try:
            # Check if search client is available
            if not self.search_client:
                logger.warning("Discovery Engine client not available, returning empty results")
                return None
            
            # Build the serving config path
            serving_config = self.search_client.serving_config_path(
                project=self.project_id,
                location=self.location,
                data_store=self.data_store_id,
                serving_config="default_config",
            )
            
            # Validate serving config
            if not serving_config:
                raise ValueError("Failed to build serving config path")
            
            logger.info(f"Using serving config: {serving_config}")
            
            # Build search request with enhanced parameters
            request = discoveryengine_v1.SearchRequest(
                serving_config=serving_config,
                query=query,
                page_size=min(max_results * 2, 50),  # Request more to allow for filtering
                # Add content search spec for better results
                content_search_spec=discoveryengine_v1.SearchRequest.ContentSearchSpec(
                    snippet_spec=discoveryengine_v1.SearchRequest.ContentSearchSpec.SnippetSpec(
                        return_snippet=True,
                        max_snippet_count=3,
                    ),
                    summary_spec=discoveryengine_v1.SearchRequest.ContentSearchSpec.SummarySpec(
                        summary_result_count=5,
                        include_citations=True,
                    ),
                ),
            )
            
            # Execute the search
            logger.info(f"Executing Enhanced Vertex AI Search with query: {query}")
            response = self.search_client.search(request=request)
            
            return response
            
        except Exception as e:
            logger.error(f"Error executing search: {str(e)}")
            logger.info("Falling back to mock data for testing")
            return None

    def _process_search_results(self, search_results: Any) -> List[Dict[str, Any]]:
        """Process and standardize the search results with enhanced metadata"""
        processed_results = []
        
        if not search_results:
            logger.warning("No search results returned")
            return processed_results
            
        try:
            for result in search_results:
                try:
                    document = result.document
                    doc_data = document.struct_data if hasattr(document, "struct_data") else {}
                    
                    # Extract enhanced metadata
                    title = doc_data.get("title", "Unknown Title")
                    uri = doc_data.get("link", "") or doc_data.get("uri", "")
                    
                    # Get description from multiple sources
                    description = self._extract_description(result, doc_data)
                    
                    # Enhanced resource type detection
                    resource_type = self._determine_resource_type_enhanced(uri, title, description)
                    
                    # Create enhanced content item
                    content_item = {
                        "title": title,
                        "url": uri,
                        "description": description,
                        "source": self._extract_domain(uri) if uri else "Unknown Source",
                        "resource_type": resource_type,
                        "estimated_time_minutes": self._estimate_content_time_enhanced(resource_type, description),
                        "difficulty": self._estimate_difficulty_enhanced(title, description),
                        "quality_score": self._calculate_initial_quality_score(result, doc_data),
                        "learning_styles": self._determine_learning_styles_enhanced(resource_type),
                        "metadata": doc_data,
                        "search_relevance": getattr(result, 'relevance_score', 0.5)
                    }
                    
                    processed_results.append(content_item)
                    
                except Exception as e:
                    logger.error(f"Error processing individual search result: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error iterating through search results: {str(e)}")
            
        return processed_results

    def _extract_description(self, result: Any, doc_data: Dict[str, Any]) -> str:
        """Extract description from multiple sources with fallbacks"""
        description = ""
        
        # Try derived struct data first
        if hasattr(result, "document") and hasattr(result.document, "derived_struct_data"):
            snippets = result.document.derived_struct_data.get("snippets", [])
            if snippets:
                description = snippets[0].get("snippet", "")
        
        # Fallback to doc_data
        if not description:
            description = doc_data.get("snippet", "") or doc_data.get("description", "")
        
        # Further fallbacks
        if not description:
            description = doc_data.get("content", "")[:200] + "..."
        
        return description or "No description available"

    def _determine_resource_type_enhanced(self, url: str, title: str, description: str) -> str:
        """Enhanced resource type detection using multiple signals"""
        if not url:
            return "article"
            
        url_lower = url.lower()
        title_lower = title.lower()
        desc_lower = description.lower()
        
        # Video content detection
        video_indicators = ["youtube.com", "vimeo.com", "video", "watch"]
        if any(indicator in url_lower for indicator in video_indicators):
            return "video"
        
        # Course detection
        course_indicators = ["course", "coursera.org/learn", "udemy.com/course", "edx.org/course", "class", "curriculum"]
        if any(indicator in url_lower for indicator in course_indicators) or \
           any(indicator in title_lower for indicator in course_indicators):
            return "course"
        
        # Interactive content detection
        interactive_indicators = ["github.com", "codepen.io", "repl.it", "interactive", "playground", "tutorial"]
        if any(indicator in url_lower for indicator in interactive_indicators):
            return "interactive"
        
        # Documentation detection
        doc_indicators = ["docs.", "/docs", "documentation", "reference", "api"]
        if any(indicator in url_lower for indicator in doc_indicators):
            return "documentation"
        
        # Academic content detection
        academic_indicators = [".edu", "arxiv.org", "research", "paper", "journal", "academic"]
        if any(indicator in url_lower for indicator in academic_indicators):
            return "academic"
        
        # Tutorial detection
        tutorial_indicators = ["tutorial", "how-to", "guide", "step-by-step"]
        if any(indicator in title_lower or indicator in desc_lower for indicator in tutorial_indicators):
            return "tutorial"
        
        return "article"  # Default fallback

    def _estimate_content_time_enhanced(self, resource_type: str, description: str) -> int:
        """Enhanced time estimation using multiple factors"""
        # Extract time from description if mentioned
        time_pattern = r'(\d+)\s*(hour|hr|minute|min|h|m)s?'
        matches = re.findall(time_pattern, description.lower())
        
        if matches:
            for time_val, unit in matches:
                time_val = int(time_val)
                if unit in ['hour', 'hr', 'h']:
                    return time_val * 60
                elif unit in ['minute', 'min', 'm']:
                    return time_val
        
        # Type-based estimation with refined values
        type_estimates = {
            "video": 25,
            "course": 180,
            "interactive": 45,
            "tutorial": 35,
            "documentation": 20,
            "academic": 45,
            "article": 15
        }
        
        base_estimate = type_estimates.get(resource_type, 20)
        
        # Adjust based on description length
        desc_length = len(description.split())
        if desc_length > 100:
            base_estimate += 10
        elif desc_length < 30:
            base_estimate -= 5
        
        return max(5, base_estimate)

    def _estimate_difficulty_enhanced(self, title: str, description: str) -> str:
        """Enhanced difficulty estimation using multiple signals"""
        text = f"{title} {description}".lower()
        
        # Enhanced keyword lists
        beginner_indicators = [
            'beginner', 'introduction', 'intro', 'basic', 'basics', 'start', 'starting',
            'fundamental', 'fundamentals', '101', 'starter', 'novice', 'first steps',
            'getting started', 'learn', 'learning', 'simple', 'easy'
        ]
        
        advanced_indicators = [
            'advanced', 'expert', 'complex', 'deep dive', 'mastering', 'master',
            'professional', 'comprehensive', 'in-depth', 'optimization', 'architecture',
            'enterprise', 'production', 'scaling', 'performance'
        ]
        
        # Count occurrences with weights
        beginner_score = sum(2 if word in title.lower() else 1 for word in beginner_indicators if word in text)
        advanced_score = sum(2 if word in title.lower() else 1 for word in advanced_indicators if word in text)
        
        # Consider intermediate indicators
        intermediate_indicators = ['intermediate', 'practical', 'application', 'implement']
        intermediate_score = sum(1 for word in intermediate_indicators if word in text)
        
        if advanced_score > beginner_score and advanced_score > intermediate_score:
            return "advanced"
        elif beginner_score > 0:
            return "beginner"
        else:
            return "intermediate"

    def _determine_learning_styles_enhanced(self, resource_type: str) -> List[str]:
        """Enhanced learning style determination"""
        style_mapping = {
            "video": ["visual", "auditory"],
            "interactive": ["kinesthetic", "practical", "visual"],
            "course": ["structured", "visual", "reading"],
            "tutorial": ["practical", "kinesthetic", "reading"],
            "documentation": ["reading", "reference"],
            "academic": ["reading", "analytical", "theoretical"],
            "article": ["reading", "visual"]
        }
        
        return style_mapping.get(resource_type, ["reading"])

    def _calculate_initial_quality_score(self, result: Any, doc_data: Dict[str, Any]) -> float:
        """Calculate initial quality score based on search relevance and metadata"""
        base_score = 0.5
        
        # Search relevance boost
        if hasattr(result, 'relevance_score'):
            base_score += (result.relevance_score * 0.3)
        
        # Metadata completeness boost
        metadata_fields = ['title', 'description', 'url']
        completeness = sum(1 for field in metadata_fields if doc_data.get(field))
        base_score += (completeness / len(metadata_fields)) * 0.2
        
        return min(1.0, base_score)

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL with enhanced parsing"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            # Remove www. prefix if present
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except:
            return "unknown"

    def _track_usage(self, operation_type: str, details: Dict[str, Any]):
        """Enhanced usage tracking for monitoring"""
        usage_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "operation_type": operation_type,
            "details": details,
            "session_id": getattr(self, 'session_id', 'unknown')
        }
        self.usage_tracking.append(usage_entry)
        
        # Keep only last 1000 entries to prevent memory issues
        if len(self.usage_tracking) > 1000:
            self.usage_tracking = self.usage_tracking[-1000:]
        
        logger.info(f"Enhanced Vertex AI usage: {operation_type} - {details.get('query', 'N/A')}")

    # Include all the existing methods from the original class
    async def generate_learning_path(self, query: str, content_items: List[Dict[str, Any]], preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate a learning path using Enhanced Vertex AI"""
        try:
            self._track_usage("generation", {"query": query, "content_count": len(content_items), "operation": "generate_learning_path"})
            
            content_summary = self._create_content_summary(content_items)
            prompt = self._create_learning_path_prompt(query, content_summary, preferences)
            
            response = await self._execute_model_async(
                prompt,
                temperature=0.2,
                max_tokens=8192,
                top_p=0.95,
                top_k=40
            )
            
            learning_path = self._parse_learning_path_response(response, content_items)
            
            logger.info(f"Generated enhanced learning path for query: {query} with {len(learning_path.get('modules', []))} modules")
            return learning_path
            
        except Exception as e:
            logger.error(f"Error generating learning path: {str(e)}")
            return self._create_fallback_learning_path(query, content_items)

    async def customize_learning_path(self, learning_path: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Customize an existing learning path based on user preferences"""
        try:
            self._track_usage("customization", {"preferences": preferences, "operation": "customize_learning_path"})
            
            # Extract existing content from the learning path
            existing_modules = learning_path.get("modules", [])
            existing_content = []
            
            for module in existing_modules:
                existing_content.extend(module.get("resources", []))
            
            # Create customization prompt
            customization_prompt = self._create_customization_prompt(learning_path, preferences)
            
            response = await self._execute_model_async(
                customization_prompt,
                temperature=0.3,
                max_tokens=8192,
                top_p=0.95,
                top_k=40
            )
            
            # Parse the customized learning path
            customized_path = self._parse_learning_path_response(response, existing_content)
            
            # Preserve original metadata but update customization info
            customized_path["_id"] = learning_path.get("_id")
            customized_path["original_query"] = learning_path.get("query", learning_path.get("original_query"))
            customized_path["customized"] = True
            customized_path["customization_preferences"] = preferences
            
            logger.info(f"Successfully customized learning path with {len(customized_path.get('modules', []))} modules")
            return customized_path
            
        except Exception as e:
            logger.error(f"Error customizing learning path: {str(e)}")
            # Return original path with minimal changes if customization fails
            learning_path["customization_error"] = str(e)
            return learning_path

    def _create_content_summary(self, extracted_contents: List[Dict[str, Any]]) -> str:
        """Create enhanced content summary with quality indicators"""
        summaries = []
        for i, content in enumerate(extracted_contents[:20]):
            quality_indicator = "⭐" * int(content.get('quality_score', 0.5) * 5)
            summary = f"{i+1}. {content['title']} ({content['resource_type']} from {content['source']}) {quality_indicator}"
            summary += f"\nDescription: {content['description'][:200]}..."
            summary += f"\nDifficulty: {content['difficulty']}, Time: {content['estimated_time_minutes']} min"
            summary += f"\nLearning Styles: {', '.join(content.get('learning_styles', []))}"
            summaries.append(summary)
        
        return "\n\n".join(summaries)

    def _create_learning_path_prompt(self, query: str, content_summary: str, preferences: Dict[str, Any] = None) -> str:
        """Enhanced prompt creation with better context"""
        preferences_str = json.dumps(preferences) if preferences else "{}"
        
        prompt = f"""
        You are an expert educational content curator with deep knowledge of learning science and pedagogy. 
        Your task is to create a comprehensive, pedagogically sound learning path for: "{query}"
        
        Available educational resources:
        {content_summary}
        
        User preferences and constraints: {preferences_str}
        
        Create a structured learning path that follows these principles:
        1. Logical progression from foundational to advanced concepts
        2. Balanced mix of content types for different learning styles
        3. Appropriate pacing and time management
        4. Clear learning objectives for each module
        5. Practical application opportunities
        
        Format your response as a JSON object with this enhanced structure:
        {{
            "title": "Comprehensive Learning Path Title",
            "description": "Detailed overview explaining the learning journey",
            "difficulty": "beginner|intermediate|advanced",
            "estimated_hours": 10.5,
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "learning_objectives": ["objective1", "objective2"],
            "modules": [
                {{
                    "title": "Module Title",
                    "description": "Module description with learning goals",
                    "order": 1,
                    "learning_objectives": ["module objective1"],
                    "estimated_hours": 2.5,
                    "resources": [
                        {{
                            "title": "Resource Title",
                            "url": "https://example.com",
                            "resource_type": "video|article|interactive|course|tutorial",
                            "source": "website name",
                            "estimated_time_minutes": 30,
                            "difficulty": "beginner|intermediate|advanced",
                            "description": "Why this resource is valuable",
                            "quality_score": 0.85,
                            "learning_styles": ["visual", "practical"],
                            "completion_criteria": "What defines completion",
                            "metadata": {{}}
                        }}
                    ]
                }}
            ]
        }}
        
        Ensure pedagogical soundness and optimal learning progression.
        """
        
        return prompt

    def _create_customization_prompt(self, learning_path: Dict[str, Any], preferences: Dict[str, Any]) -> str:
        """Create a prompt for customizing an existing learning path"""
        preferences_str = json.dumps(preferences) if preferences else "{}"
        
        # Extract current path structure for context
        current_modules = learning_path.get("modules", [])
        current_structure = []
        
        for module in current_modules:
            module_info = {
                "title": module.get("title", ""),
                "description": module.get("description", ""),
                "resources_count": len(module.get("resources", [])),
                "estimated_hours": module.get("estimated_hours", 0)
            }
            current_structure.append(module_info)
        
        current_structure_str = json.dumps(current_structure, indent=2)
        
        prompt = f"""
        You are an expert educational content curator. Your task is to customize an existing learning path based on new user preferences.
        
        CURRENT LEARNING PATH:
        Title: {learning_path.get("title", "Unknown")}
        Description: {learning_path.get("description", "")}
        Difficulty: {learning_path.get("difficulty", "intermediate")}
        Estimated Hours: {learning_path.get("estimated_hours", 0)}
        
        CURRENT MODULE STRUCTURE:
        {current_structure_str}
        
        NEW USER PREFERENCES: {preferences_str}
        
        Based on the new preferences, customize this learning path by:
        1. Adjusting difficulty level if requested
        2. Modifying time estimates based on available time
        3. Reordering or restructuring modules if needed
        4. Adding or removing content types based on learning style preferences
        5. Adjusting pacing and depth based on user goals
        
        Provide the customized learning path in the same JSON format as the original, maintaining the same resource structure but adapting it to the new preferences.
        
        Format your response as a JSON object with this structure:
        {{
            "title": "Customized Learning Path Title",
            "description": "Updated description reflecting customizations",
            "difficulty": "beginner|intermediate|advanced",
            "estimated_hours": 10.5,
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "learning_objectives": ["objective1", "objective2"],
            "modules": [
                {{
                    "title": "Module Title",
                    "description": "Module description with learning goals",
                    "order": 1,
                    "learning_objectives": ["module objective1"],
                    "estimated_hours": 2.5,
                    "resources": [...]
                }}
            ]
        }}
        
        Ensure the customization maintains educational quality while meeting the user's new preferences.
        """
        
        return prompt

    async def _execute_model_async(self, prompt: str, temperature: float = 0.2, max_tokens: int = 4096,
                                   top_p: float = 0.95, top_k: int = 40) -> str:
        """Enhanced model execution with better error handling"""
        try:
            token_estimate = len(prompt.split()) * 1.3
            self._track_usage("model_call", {
                "prompt_tokens": int(token_estimate),
                "temperature": temperature,
                "max_tokens": max_tokens
            })
            
            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "top_p": top_p,
                "top_k": top_k
            }
            
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, 
                lambda: self._execute_model_sync(prompt, generation_config)
            )
            
        except Exception as e:
            logger.error(f"Error executing enhanced model: {str(e)}")
            return f'{{"error": "{str(e)}"}}'

    def _execute_model_sync(self, prompt: str, generation_config: Dict[str, Any]) -> str:
        """Enhanced synchronous model execution"""
        try:
            config = GenerationConfig(
                temperature=generation_config.get("temperature", 0.2),
                max_output_tokens=generation_config.get("max_output_tokens", 4096),
                top_p=generation_config.get("top_p", 0.95),
                top_k=generation_config.get("top_k", 40)
            )
            
            response = self.model.generate_content(prompt, generation_config=config)
            
            if hasattr(response, "text"):
                return response.text
            else:
                return str(response)
                
        except Exception as e:
            logger.error(f"Enhanced model execution error: {str(e)}")
            return f'{{"error": "{str(e)}"}}'

    def _parse_learning_path_response(self, response: str, extracted_contents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Enhanced response parsing with better validation"""
        try:
            cleaned_response = self._clean_json_response(response)
            learning_path = json.loads(cleaned_response)
            
            # Enhanced validation and enrichment
            self._validate_and_enrich_learning_path(learning_path, extracted_contents)
            
            return learning_path
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            return self._create_fallback_learning_path("Unknown Query", extracted_contents)

    def _validate_and_enrich_learning_path(self, learning_path: Dict[str, Any], content_items: List[Dict[str, Any]]):
        """Validate and enrich the learning path structure"""
        # Ensure required fields
        required_fields = ["title", "description", "modules", "difficulty", "estimated_hours"]
        for field in required_fields:
            if field not in learning_path:
                learning_path[field] = self._get_default_value(field, content_items)
        
        # Validate and enrich modules
        for i, module in enumerate(learning_path.get("modules", [])):
            if "order" not in module:
                module["order"] = i + 1
            if "resources" not in module:
                module["resources"] = []
            if "estimated_hours" not in module:
                total_minutes = sum(r.get("estimated_time_minutes", 30) for r in module.get("resources", []))
                module["estimated_hours"] = round(total_minutes / 60, 1)

    def _get_default_value(self, field: str, content_items: List[Dict[str, Any]]) -> Any:
        """Get default values for missing fields"""
        defaults = {
            "title": f"Learning Path for {content_items[0].get('title', 'Unknown Topic') if content_items else 'Unknown Topic'}",
            "description": "Automatically generated learning path",
            "modules": [],
            "difficulty": "intermediate",
            "estimated_hours": 5.0,
            "prerequisites": [],
            "learning_objectives": []
        }
        return defaults.get(field, None)

    def _create_fallback_learning_path(self, query: str, content_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Enhanced fallback learning path creation"""
        sorted_content = sorted(content_items, key=lambda x: x.get("final_score", x.get("quality_score", 0)), reverse=True)
        
        # Group by resource type and difficulty
        content_by_type = {}
        for item in sorted_content:
            res_type = item.get("resource_type", "unknown")
            if res_type not in content_by_type:
                content_by_type[res_type] = []
            content_by_type[res_type].append(item)
        
        modules = []
        module_order = 1
        
        # Create pedagogically ordered modules
        type_order = ["course", "documentation", "tutorial", "video", "article", "interactive"]
        
        for content_type in type_order:
            if content_type in content_by_type and content_by_type[content_type]:
                items = content_by_type[content_type][:3]  # Top 3 per type
                
                module = {
                    "title": f"{content_type.title()} Resources: {query}",
                    "description": f"High-quality {content_type} resources covering {query}",
                    "order": module_order,
                    "estimated_hours": round(sum(item.get("estimated_time_minutes", 30) for item in items) / 60, 1),
                    "resources": items
                }
                modules.append(module)
                module_order += 1
        
        total_hours = sum(module.get("estimated_hours", 0) for module in modules)
        
        return {
            "title": f"Enhanced Learning Path: {query}",
            "description": f"A comprehensive learning path covering {query} with {len(sorted_content)} carefully selected resources.",
            "difficulty": self._determine_overall_difficulty(sorted_content),
            "estimated_hours": round(total_hours, 1),
            "prerequisites": [],
            "learning_objectives": [f"Master the fundamentals of {query}", f"Apply {query} in practical scenarios"],
            "modules": modules
        }

    def _determine_overall_difficulty(self, content_items: List[Dict[str, Any]]) -> str:
        """Determine overall difficulty based on content analysis"""
        difficulties = [item.get("difficulty", "intermediate") for item in content_items]
        difficulty_counts = {"beginner": 0, "intermediate": 0, "advanced": 0}
        
        for diff in difficulties:
            if diff in difficulty_counts:
                difficulty_counts[diff] += 1
        
        return max(difficulty_counts, key=difficulty_counts.get)

    def _clean_json_response(self, response: str) -> str:
        """Enhanced JSON cleaning with multiple fallback strategies"""
        # Remove markdown indicators
        response = response.replace("```json", "").replace("```", "")
        
        # Remove potential prefixes/suffixes
        response = response.strip()
        
        # Find JSON object boundaries
        start_idx = response.find('{')
        end_idx = response.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            response = response[start_idx:end_idx + 1]
        
        return response
