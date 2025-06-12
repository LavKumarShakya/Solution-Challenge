#!/usr/bin/env python3
"""
AetherLearn Backend Integration Testing Script
Tests Google Custom Search API and Vertex AI integrations
"""

import os
import asyncio
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("AetherLearn Backend Integration Testing")
print("=" * 50)

def test_environment():
    """Test if all required environment variables are set"""
    print("\nTesting Testing Environment Configuration...")
    
    required_vars = [
        'SEARCH_API_KEY',
        'SEARCH_ENGINE_ID', 
        'GCP_PROJECT_ID',
        'VERTEX_AI_PROJECT_ID',
        'VERTEX_AI_LOCATION',
        'VERTEX_AI_MODEL',
        'GEMINI_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
            print(f"❌ {var}: Missing")
        else:
            # Mask sensitive values
            if 'KEY' in var:
                display_value = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
    
    if missing_vars:
        print(f"\n❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ All environment variables configured")
    return True

def test_google_search():
    """Test Google Custom Search API"""
    print("\nTesting Testing Google Custom Search API...")
    
    try:
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        
        api_key = os.getenv('SEARCH_API_KEY')
        engine_id = os.getenv('SEARCH_ENGINE_ID')
        
        if not api_key or not engine_id:
            print("❌ Search API credentials not configured")
            return False
        
        # Build the service
        service = build("customsearch", "v1", developerKey=api_key)
        
        # Test search
        test_query = "python programming tutorial"
        print(f"   Searching for: '{test_query}'")
        
        result = service.cse().list(
            q=test_query,
            cx=engine_id,
            num=3  # Small number for testing
        ).execute()
        
        items = result.get('items', [])
        search_info = result.get('searchInformation', {})
        
        if items:
            print(f"✅ Search successful! Found {len(items)} results")
            print(f"   Total results available: {search_info.get('totalResults', 'N/A')}")
            print(f"   Search time: {search_info.get('searchTime', 'N/A')} seconds")
            
            # Show first result
            first_result = items[0]
            print(f"   Sample result: '{first_result.get('title', 'N/A')[:50]}...'")
            return True
        else:
            print("❌ Search returned no results")
            return False
            
    except Exception as e:
        if "HttpError" in str(type(e)):
            print(f"❌ Google API HttpError: {e}")
        else:
            print(f"❌ Search API Error: {e}")
        return False

def test_vertex_ai():
    """Test Vertex AI integration using updated VertexAIClient"""
    print("\n🤖 Testing Vertex AI Integration...")
    
    try:
        # Import the updated VertexAIClient
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))
        from vertex_ai import VertexAIClient
        
        # Initialize client
        client = VertexAIClient()
        
        # Test prompt
        test_prompt = "What is machine learning? Please provide a brief 2-sentence explanation."
        print(f"   Test prompt: '{test_prompt}'")
        
        # Generate response
        response = client.model.generate_content(test_prompt)
        
        if response and response.text:
            print("✅ Vertex AI Integration successful!")
            print(f"   Response length: {len(response.text)} characters")
            print(f"   Sample response: '{response.text[:100]}...'")
            return True
        else:
            print("❌ Vertex AI Integration returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ Vertex AI Integration Error: {e}")
        return False

def test_gemini_api():
    """Test direct Gemini API integration"""
    print("\n✨ Testing Direct Gemini API...")
    
    try:
        # Try importing google-generativeai
        try:
            import google.generativeai as genai
        except ImportError:
            print("❌ google-generativeai package not installed")
            return False
        
        api_key = os.getenv('GEMINI_API_KEY')
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-001')
        
        if not api_key:
            print("❌ Gemini API key not configured")
            return False
        
        # Configure API (if method exists)
        if hasattr(genai, 'configure'):
            genai.configure(api_key=api_key)
        
        # Create model (if class exists)
        if hasattr(genai, 'GenerativeModel'):
            model = genai.GenerativeModel(model_name)
        else:
            print("❌ GenerativeModel class not available")
            return False
        
        # Test prompt
        test_prompt = "List 3 benefits of online learning."
        print(f"   Test prompt: '{test_prompt}'")
        
        # Generate response
        response = model.generate_content(test_prompt)
        
        if response and response.text:
            print("✅ Gemini API response successful!")
            print(f"   Response length: {len(response.text)} characters")
            print(f"   Sample response: '{response.text[:100]}...'")
            return True
        else:
            print("❌ Gemini API returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ Gemini API Error: {e}")
        return False

async def test_mongodb():
    """Test MongoDB connection"""
    print("\n🗄️  Testing MongoDB Connection...")
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        mongodb_url = os.getenv('MONGODB_URL')
        db_name = os.getenv('MONGODB_DB', 'aetherlearn')
        
        if not mongodb_url:
            print("❌ MONGODB_URL not configured")
            return False
        
        # Create client
        client = AsyncIOMotorClient(mongodb_url)
        
        # Test connection
        await client.admin.command('ping')
        
        # Test database access
        db = client[db_name]
        collections = await db.list_collection_names()
        
        print("✅ MongoDB connection successful!")
        print(f"   Database: {db_name}")
        print(f"   Collections: {len(collections)} found")
        
        # Close connection
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB Error: {e}")
        return False

async def main():
    """Run all integration tests"""
    print("Starting integration tests...\n")
    
    results = {}
    
    # Test environment
    results['environment'] = test_environment()
    
    if not results['environment']:
        print("\n❌ Environment setup failed. Please check your .env file.")
        return False
    
    # Test each integration
    results['search'] = test_google_search()
    results['vertex_ai'] = test_vertex_ai()
    results['gemini'] = test_gemini_api()
    results['mongodb'] = await test_mongodb()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.upper():<15}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests PASSED! Backend is ready for deployment.")
        return True
    else:
        print("⚠️  Some tests failed. Please fix issues before deployment.")
        return False

if __name__ == "__main__":
    try:
        # Run async main
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)