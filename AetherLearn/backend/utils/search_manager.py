import asyncio
from datetime import datetime
import os
import logging
from app.database import db
from models.learning_path import SearchStatusUpdate
from utils.vertex_ai import VertexAIClient

# Configure logging
logger = logging.getLogger(__name__)

class SearchManager:
    def __init__(self):
        self.vertex_ai = VertexAIClient()
        # Initialize cache for similar queries
        self.query_cache = {}
        # Set cache expiry time (24 hours)
        self.cache_expiry_hours = 24

    async def update_search_status(self, search_id: str, update: SearchStatusUpdate):
        """Update the search status in the database"""
        update_dict = update.dict(exclude_none=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        await db.search_status.update_one(
            {"search_id": search_id},
            {"$set": update_dict}
        )

    async def process_search(self, search_id: str, query: str, user_id: str = None, preferences: dict = None):
        """Process a search query to generate a learning path using Vertex AI Search"""
        try:
            # Update status to DISCOVERING
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="DISCOVERING",
                    progress=20,
                    message="Discovering relevant educational content"
                )
            )
            
            # Check if we have a cached result for a similar query
            cached_content = self._check_cache(query)
            
            # Discover content using Vertex AI Search
            content_items = cached_content if cached_content else await self.vertex_ai.discover_content(query, preferences)
            
            # Cache this result for future similar queries
            if not cached_content:
                self._cache_results(query, content_items)
            # Update status to PROCESSING
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="PROCESSING",
                    progress=50,
                    message=f"Processing {len(content_items)} content items and generating learning path"
                )
            )
            
            # Log content discovery statistics
            logger.info(f"Discovered {len(content_items)} content items for query: '{query}'")
            self._log_content_diversity(content_items)
            
            # Generate learning path from discovered content
            learning_path = await self.vertex_ai.generate_learning_path(
                query, content_items, preferences
            )
              # Enrich the learning path with metadata
            learning_path["user_id"] = user_id
            learning_path["query"] = query
            learning_path["created_at"] = datetime.utcnow()
            learning_path["updated_at"] = datetime.utcnow()
            learning_path["preferences"] = preferences or {}
            learning_path["content_stats"] = self._calculate_content_stats(content_items)
            learning_path["search_version"] = "vertex-ai-search-1.0"
            
            # Store the learning path in the database
            result = await db.learning_paths.insert_one(learning_path)
            learning_path_id = str(result.inserted_id)
            
            # Update status to COMPLETED
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="COMPLETED",
                    progress=100,
                    message="Learning path generation completed",
                    learning_path_id=learning_path_id
                )
            )
            
            logger.info(f"Learning path generated successfully with ID: {learning_path_id}")
            return learning_path_id
            
        except Exception as e:
            logger.error(f"Error processing search: {str(e)}")
            # Update status to FAILED
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="FAILED",
                    progress=0,
                    message=f"Error: {str(e)}"
                )
            )
            raise e
            
    def _check_cache(self, query: str):
        """Check if we have cached results for similar queries"""
        # Basic cache implementation - in production you'd use a more sophisticated approach
        query_lower = query.lower().strip()
        
        # Check for exact match
        now = datetime.utcnow()
        for cached_query, (timestamp, content) in list(self.query_cache.items()):
            # Remove expired items
            if (now - timestamp).total_seconds() / 3600 > self.cache_expiry_hours:
                del self.query_cache[cached_query]
                continue
                
            # Check for similarity (exact match for now, could be improved)
            if cached_query == query_lower:
                logger.info(f"Cache hit for query: {query}")
                return content
        
        return None
        
    def _cache_results(self, query: str, content_items):
        """Cache search results for future use"""
        query_lower = query.lower().strip()
        timestamp = datetime.utcnow()
        self.query_cache[query_lower] = (timestamp, content_items)
        logger.info(f"Cached results for query: {query}")
        
    def _log_content_diversity(self, content_items):
        """Log statistics about the discovered content types"""
        content_types = {}
        for item in content_items:
            content_type = item.get("resource_type", "unknown")
            if content_type not in content_types:
                content_types[content_type] = 0
            content_types[content_type] += 1
            
        logger.info(f"Content diversity stats: {content_types}")
        
    def _calculate_content_stats(self, content_items):
        """Calculate statistics about the content items for analytics"""
        stats = {
            "total_items": len(content_items),
            "content_types": {},
            "difficulty_levels": {},
            "avg_quality_score": 0,
            "avg_time_minutes": 0
        }
        
        total_quality = 0
        total_time = 0
        
        for item in content_items:
            # Count content types
            content_type = item.get("resource_type", "unknown")
            if content_type not in stats["content_types"]:
                stats["content_types"][content_type] = 0
            stats["content_types"][content_type] += 1
            
            # Count difficulty levels
            difficulty = item.get("difficulty", "intermediate")
            if difficulty not in stats["difficulty_levels"]:
                stats["difficulty_levels"][difficulty] = 0
            stats["difficulty_levels"][difficulty] += 1
            
            # Sum quality scores and times
            total_quality += item.get("quality_score", 0)
            total_time += item.get("estimated_time_minutes", 0)
            
        # Calculate averages
        if content_items:
            stats["avg_quality_score"] = round(total_quality / len(content_items), 2)
            stats["avg_time_minutes"] = round(total_time / len(content_items), 2)
            
        return stats

    async def customize_learning_path(self, learning_path_id: str, preferences: dict, user_id: str = None):
        """Customize an existing learning path based on user preferences"""
        try:
            # Retrieve the existing learning path
            learning_path_doc = await db.learning_paths.find_one({"_id": learning_path_id})
            
            if not learning_path_doc:
                raise ValueError(f"Learning path with ID {learning_path_id} not found")
            
            # Convert MongoDB document to dict
            learning_path = dict(learning_path_doc)
            
            # Customize the learning path using Vertex AI
            customized_path = await self.vertex_ai.customize_learning_path(learning_path, preferences)
            
            # Update metadata
            customized_path["updated_at"] = datetime.utcnow()
            customized_path["customized"] = True
            customized_path["customization_preferences"] = preferences
            
            if user_id:
                customized_path["user_id"] = user_id
                
            # Create a new learning path or update existing one based on preference
            if preferences.get("create_copy", False):
                # Remove the _id field to create a new document
                if "_id" in customized_path:
                    del customized_path["_id"]
                
                # Insert as a new learning path
                result = await db.learning_paths.insert_one(customized_path)
                return str(result.inserted_id)
            else:
                # Update existing learning path
                await db.learning_paths.replace_one(
                    {"_id": learning_path_id},
                    customized_path
                )
                return learning_path_id
                
        except Exception as e:
            logger.error(f"Error customizing learning path: {str(e)}")
            raise e

    async def customize_learning_path_with_status(
        self, search_id: str, learning_path_id: str, preferences: dict, user_id: str = None
    ):
        """Customize an existing learning path with status tracking"""
        try:
            # Update status to PROCESSING
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="PROCESSING",
                    progress=30,
                    message="Customizing learning path"
                )
            )
            
            # Use the main customization method
            new_learning_path_id = await self.customize_learning_path(learning_path_id, preferences, user_id)
            
            # Update status to COMPLETED
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="COMPLETED",
                    progress=100,
                    message="Learning path customization completed",
                    learning_path_id=new_learning_path_id
                )
            )
            
            return new_learning_path_id
            
        except Exception as e:
            # Update status to FAILED
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="FAILED",
                    progress=0,
                    message=f"Error: {str(e)}"
                )
            )
            raise e
