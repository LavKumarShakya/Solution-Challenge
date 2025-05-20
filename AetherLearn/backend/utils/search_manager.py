import asyncio
from datetime import datetime
import os
from app.database import db
from models.learning_path import SearchStatusUpdate
from utils.vertex_ai import VertexAIClient
from scrapers.scraper_manager import ScraperManager
from extractors.extractor_manager import ExtractorManager

class SearchManager:
    def __init__(self):
        self.vertex_ai = VertexAIClient()
        self.scraper_manager = ScraperManager()
        self.extractor_manager = ExtractorManager()

    async def update_search_status(self, search_id: str, update: SearchStatusUpdate):
        """Update the search status in the database"""
        update_dict = update.dict(exclude_none=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        await db.search_status.update_one(
            {"search_id": search_id},
            {"$set": update_dict}
        )

    async def process_search(self, search_id: str, query: str, user_id: str = None, preferences: dict = None):
        """Process a search query to generate a learning path"""
        try:
            # Update status to DISCOVERING
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="DISCOVERING",
                    progress=10,
                    message="Discovering relevant content sources"
                )
            )
            
            # Discover content sources using ScraperManager
            content_sources = await self.scraper_manager.discover_sources(query)
            
            # Update status to EXTRACTING
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="EXTRACTING",
                    progress=30,
                    message=f"Extracting content from {len(content_sources)} sources"
                )
            )
            
            # Extract content using ExtractorManager
            extracted_contents = await self.extractor_manager.extract_content(content_sources)
            
            # Update status to PROCESSING
            await self.update_search_status(
                search_id,
                SearchStatusUpdate(
                    status="PROCESSING",
                    progress=60,
                    message="Processing content and generating learning path"
                )
            )
            
            # Use Vertex AI to generate learning path
            learning_path = await self.vertex_ai.generate_learning_path(
                query, extracted_contents, preferences
            )
            
            # Store the learning path in the database
            learning_path["user_id"] = user_id
            learning_path["query"] = query
            learning_path["created_at"] = datetime.utcnow()
            learning_path["updated_at"] = datetime.utcnow()
            learning_path["preferences"] = preferences or {}
            
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
            
            return learning_path_id
            
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

    async def customize_learning_path(
        self, search_id: str, learning_path_id: str, preferences: dict, user_id: str = None
    ):
        """Customize an existing learning path with new preferences"""
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
            
            # Get the original learning path
            original_path = await db.learning_paths.find_one({"_id": learning_path_id})
            if not original_path:
                raise ValueError(f"Learning path with ID {learning_path_id} not found")
            
            # Use Vertex AI to customize the learning path
            customized_path = await self.vertex_ai.customize_learning_path(
                original_path, preferences
            )
            
            # Store the customized learning path in the database
            customized_path["user_id"] = user_id
            customized_path["query"] = original_path["query"]
            customized_path["created_at"] = datetime.utcnow()
            customized_path["updated_at"] = datetime.utcnow()
            customized_path["preferences"] = preferences
            customized_path["original_path_id"] = learning_path_id
            
            result = await db.learning_paths.insert_one(customized_path)
            new_learning_path_id = str(result.inserted_id)
            
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
