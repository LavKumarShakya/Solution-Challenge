import asyncio
import os
from typing import List, Dict, Any, Optional
import aiohttp
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import json
import re
import time

# Load environment variables
load_dotenv()

class ExtractorManager:
    """Manager class for extracting content from various sources"""
    
    def __init__(self):
        self.session = None
        self.extractors = {
            'video': VideoExtractor(),
            'article': ArticleExtractor(),
            'course': CourseExtractor(),
            'interactive': InteractiveExtractor(),
        }
    
    async def _get_session(self):
        """Get or create an aiohttp session"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def extract_content(self, content_sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Main method to extract content from various sources
        
        Args:
            content_sources: List of content source dictionaries from ScraperManager
            
        Returns:
            List of content dictionaries with extracted details
        """
        session = await self._get_session()
        
        # Process sources in batches to avoid overwhelming resources
        batch_size = 5
        results = []
        
        for i in range(0, len(content_sources), batch_size):
            batch = content_sources[i:i+batch_size]
            
            # Create tasks for each content source in the batch
            tasks = []
            for source in batch:
                resource_type = source.get('resource_type', '')
                extractor = self.extractors.get(resource_type)
                
                if extractor:
                    tasks.append(extractor.extract(session, source))
                else:
                    # Use default extractor for unknown types
                    tasks.append(self.extractors['article'].extract(session, source))
            
            # Extract content in parallel within the batch
            batch_results = await asyncio.gather(*tasks)
            results.extend([r for r in batch_results if r is not None])
            
            # Small delay between batches to be nice to servers
            await asyncio.sleep(1)
        
        return results
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session is not None:
            await self.session.close()
            self.session = None
            
            # Close extractors
            for extractor in self.extractors.values():
                await extractor.close()


class BaseExtractor:
    """Base class for all extractors"""
    
    async def extract(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from a source"""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def close(self):
        """Close any resources used by the extractor"""
        pass
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace"""
        if not text:
            return ""
        
        # Replace multiple whitespace with a single space
        text = re.sub(r'\s+', ' ', text)
        
        # Strip leading/trailing whitespace
        return text.strip()


class VideoExtractor(BaseExtractor):
    """Extractor for video content"""
    
    async def extract(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from a video source"""
        try:
            # In a real implementation, would use the YouTube/Vimeo/etc. API
            # For now, just return the source with some enhancements
            
            url = source.get('url', '')
            
            # Check if this is a YouTube video
            if 'youtube.com' in url or 'youtu.be' in url:
                return await self._extract_youtube(session, source)
            
            # For other video platforms or if unable to determine
            return source
            
        except Exception as e:
            print(f"Error extracting video content: {str(e)}")
            return None
    
    async def _extract_youtube(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from YouTube"""
        # In a real implementation, would use the YouTube API
        # For now, just return the source with some enhancements
        
        enhanced_source = source.copy()
        
        # Add metadata
        if 'metadata' not in enhanced_source:
            enhanced_source['metadata'] = {}
        
        enhanced_source['metadata']['platform'] = 'YouTube'
        enhanced_source['metadata']['transcript_available'] = True  # Simulate availability
        
        return enhanced_source


class ArticleExtractor(BaseExtractor):
    """Extractor for article content"""
    
    async def extract(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from an article source"""
        try:
            url = source.get('url', '')
            
            async with session.get(url) as response:
                if response.status != 200:
                    return source
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Try to extract more information
                enhanced_source = source.copy()
                
                # Try to extract more detailed content
                # These are simplified versions - in a real implementation, we'd use more robust methods
                
                # Extract title if not present
                if not enhanced_source.get('title'):
                    title_tag = soup.find('title')
                    if title_tag:
                        enhanced_source['title'] = self._clean_text(title_tag.text)
                
                # Extract description if not present or improve it
                if not enhanced_source.get('description') or len(enhanced_source['description']) < 50:
                    # Try meta description first
                    meta_desc = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
                    if meta_desc and meta_desc.get('content'):
                        enhanced_source['description'] = self._clean_text(meta_desc['content'])
                    else:
                        # Try to get first paragraph
                        first_p = soup.find('p')
                        if first_p:
                            enhanced_source['description'] = self._clean_text(first_p.text)[:300]
                
                # Add metadata
                if 'metadata' not in enhanced_source:
                    enhanced_source['metadata'] = {}
                
                # Try to extract author
                author_elem = soup.find('meta', attrs={'name': 'author'}) or soup.find('meta', attrs={'property': 'article:author'})
                if author_elem and author_elem.get('content'):
                    enhanced_source['metadata']['author'] = author_elem['content']
                
                # Try to extract published date
                date_elem = soup.find('meta', attrs={'name': 'date'}) or soup.find('meta', attrs={'property': 'article:published_time'})
                if date_elem and date_elem.get('content'):
                    enhanced_source['metadata']['published_date'] = date_elem['content']
                
                return enhanced_source
                
        except Exception as e:
            print(f"Error extracting article content: {str(e)}")
            return source  # Return original source if extraction fails


class CourseExtractor(BaseExtractor):
    """Extractor for course content"""
    
    async def extract(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from a course source"""
        try:
            url = source.get('url', '')
            
            # Determine platform
            platform = None
            if 'coursera.org' in url:
                platform = 'Coursera'
            elif 'udemy.com' in url:
                platform = 'Udemy'
            elif 'edx.org' in url:
                platform = 'edX'
            elif 'khanacademy.org' in url:
                platform = 'Khan Academy'
            
            # In a real implementation, would use platform-specific APIs
            # For now, just return the source with some enhancements
            
            enhanced_source = source.copy()
            
            # Add metadata
            if 'metadata' not in enhanced_source:
                enhanced_source['metadata'] = {}
            
            if platform:
                enhanced_source['metadata']['platform'] = platform
                
                # Add platform-specific metadata
                if platform == 'Coursera':
                    enhanced_source['metadata']['certification_available'] = True
                elif platform == 'Udemy':
                    enhanced_source['metadata']['has_exercises'] = True
                elif platform == 'edX':
                    enhanced_source['metadata']['university_backed'] = True
                elif platform == 'Khan Academy':
                    enhanced_source['metadata']['free_access'] = True
            
            return enhanced_source
            
        except Exception as e:
            print(f"Error extracting course content: {str(e)}")
            return source  # Return original source if extraction fails


class InteractiveExtractor(BaseExtractor):
    """Extractor for interactive content"""
    
    async def extract(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from an interactive source"""
        try:
            url = source.get('url', '')
            
            # Determine platform
            platform = None
            if 'github.com' in url:
                platform = 'GitHub'
                return await self._extract_github(session, source)
            elif 'codepen.io' in url:
                platform = 'CodePen'
            elif 'jsfiddle.net' in url:
                platform = 'JSFiddle'
            
            # In a real implementation, would use platform-specific APIs
            # For now, just return the source with some enhancements
            
            enhanced_source = source.copy()
            
            # Add metadata
            if 'metadata' not in enhanced_source:
                enhanced_source['metadata'] = {}
            
            if platform:
                enhanced_source['metadata']['platform'] = platform
            
            return enhanced_source
            
        except Exception as e:
            print(f"Error extracting interactive content: {str(e)}")
            return source  # Return original source if extraction fails
    
    async def _extract_github(self, session: aiohttp.ClientSession, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract content from GitHub"""
        # In a real implementation, would use the GitHub API
        # For now, just return the source with some enhancements
        
        enhanced_source = source.copy()
        
        # Add metadata
        if 'metadata' not in enhanced_source:
            enhanced_source['metadata'] = {}
        
        enhanced_source['metadata']['platform'] = 'GitHub'
        enhanced_source['metadata']['has_exercises'] = True
        enhanced_source['metadata']['code_examples'] = True
        
        return enhanced_source
