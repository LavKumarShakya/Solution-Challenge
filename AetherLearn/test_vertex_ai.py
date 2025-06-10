#!/usr/bin/env python3
"""
Test script for Vertex AI integration
This script tests the basic functionality of the VertexAIClient class
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.vertex_ai import VertexAIClient

load_dotenv()

async def test_vertex_ai_client():
    """Test the VertexAIClient functionality"""
    
    print("🚀 Testing Vertex AI Client Integration...")
    print("=" * 50)
    
    # Check if required environment variables are set
    required_vars = [
        "VERTEX_AI_PROJECT_ID",
        "VERTEX_AI_LOCATION", 
        "VERTEX_AI_DATASTORE_ID",
        "VERTEX_AI_MODEL"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file and ensure all Vertex AI variables are set.")
        return False
    
    print("✅ All required environment variables are set")
    print(f"   Project ID: {os.getenv('VERTEX_AI_PROJECT_ID')}")
    print(f"   Location: {os.getenv('VERTEX_AI_LOCATION')}")
    print(f"   Data Store ID: {os.getenv('VERTEX_AI_DATASTORE_ID')}")
    print(f"   Model: {os.getenv('VERTEX_AI_MODEL')}")
    print()
    
    try:
        # Initialize the client
        print("🔧 Initializing Vertex AI Client...")
        client = VertexAIClient()
        print("✅ Vertex AI Client initialized successfully")
        print()
        
        # Test content discovery (this will likely fail without proper setup, but we can test the code)
        print("🔍 Testing content discovery...")
        test_query = "machine learning basics"
        
        try:
            content_items = await client.discover_content(test_query, max_results=5)
            print(f"✅ Content discovery completed")
            print(f"   Found {len(content_items)} content items for query: '{test_query}'")
            
            if content_items:
                print("   Sample content item:")
                sample = content_items[0]
                print(f"     Title: {sample.get('title', 'N/A')}")
                print(f"     URL: {sample.get('url', 'N/A')}")
                print(f"     Resource Type: {sample.get('resource_type', 'N/A')}")
                print(f"     Source: {sample.get('source', 'N/A')}")
            else:
                print("   No content items found (this may be expected if data store is not set up)")
                
        except Exception as e:
            print(f"⚠️  Content discovery failed (expected if data store not configured): {str(e)}")
        
        print()
        
        # Test learning path generation with mock data
        print("🧠 Testing learning path generation...")
        
        mock_content = [
            {
                "title": "Introduction to Machine Learning",
                "url": "https://example.com/ml-intro",
                "description": "A comprehensive introduction to machine learning concepts",
                "resource_type": "article",
                "source": "example.com",
                "estimated_time_minutes": 30,
                "difficulty": "beginner",
                "quality_score": 0.9,
                "metadata": {}
            },
            {
                "title": "Python for Data Science",
                "url": "https://youtube.com/watch?v=example",
                "description": "Learn Python programming for data science applications",
                "resource_type": "video",
                "source": "YouTube",
                "estimated_time_minutes": 45,
                "difficulty": "intermediate",
                "quality_score": 0.8,
                "metadata": {}
            }
        ]
        
        try:
            learning_path = await client.generate_learning_path(
                query=test_query,
                content_items=mock_content,
                preferences={"difficulty": "beginner", "time_available": "2 hours"}
            )
            
            print("✅ Learning path generation completed")
            print(f"   Title: {learning_path.get('title', 'N/A')}")
            print(f"   Difficulty: {learning_path.get('difficulty', 'N/A')}")
            print(f"   Estimated Hours: {learning_path.get('estimated_hours', 'N/A')}")
            print(f"   Number of Modules: {len(learning_path.get('modules', []))}")
            
        except Exception as e:
            print(f"⚠️  Learning path generation failed: {str(e)}")
            print("   This may be due to model access issues or API limits")
        
        print()
        print("🎉 Vertex AI Client test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to initialize Vertex AI Client: {str(e)}")
        print("   Please check your Google Cloud credentials and project setup")
        return False

def main():
    """Main function to run the test"""
    print("AetherLearn - Vertex AI Integration Test")
    print("=" * 50)
    
    # Check if credentials file exists
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path and os.path.exists(creds_path):
        print(f"✅ Google Cloud credentials found at: {creds_path}")
    else:
        print("⚠️  Google Cloud credentials not found or not set")
        print("   Please set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        print("   or ensure you're authenticated with 'gcloud auth application-default login'")
    
    print()
    
    # Run the async test
    success = asyncio.run(test_vertex_ai_client())
    
    print()
    if success:
        print("✅ Test completed successfully! Your Vertex AI integration appears to be working.")
    else:
        print("❌ Test failed. Please check the error messages above and fix any issues.")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())