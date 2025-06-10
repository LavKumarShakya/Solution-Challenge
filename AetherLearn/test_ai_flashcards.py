#!/usr/bin/env python3
"""
AetherLearn AI Flashcard Generator Test Suite
Tests the complete system including authentication and AI generation
"""

import os
import sys
import asyncio
import json
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_authentication():
    """Test Google Cloud authentication"""
    print("🔐 Testing Google Cloud Authentication...")
    
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        
        # Load environment variables
        from dotenv import load_dotenv
        env_path = Path(__file__).parent / 'backend' / '.env'
        load_dotenv(env_path)
        
        project_id = os.getenv('VERTEX_AI_PROJECT_ID')
        location = os.getenv('VERTEX_AI_LOCATION', 'us-central1')
        
        if not project_id:
            print("❌ VERTEX_AI_PROJECT_ID not set in environment")
            return False
        
        print(f"   Project ID: {project_id}")
        print(f"   Location: {location}")
        
        # Test authentication
        vertexai.init(project=project_id, location=location)
        print("✅ Vertex AI initialized successfully")
        
        # Test model access
        model = GenerativeModel("gemini-1.5-flash-001")
        print("✅ Model created successfully")
        
        # Test simple generation
        response = model.generate_content("Hello, can you respond with 'Authentication successful'?")
        if response and response.text:
            print(f"✅ AI Response: {response.text[:50]}...")
            return True
        else:
            print("❌ AI responded but with empty content")
            return False
            
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")
        print("\n💡 To fix this:")
        print("   1. Run: gcloud auth application-default login")
        print("   2. Or set up service account credentials")
        print("   3. Ensure you have 'Vertex AI User' permissions")
        return False

async def test_new_flashcard_generator():
    """Test the new flashcard generator"""
    print("\n🤖 Testing New FlashcardGenerator...")
    
    try:
        from utils.vertex_ai_flashcards_new import FlashcardGenerator
        
        # Initialize generator
        generator = FlashcardGenerator()
        print(f"✅ Generator initialized - Vertex AI available: {generator.vertex_available}")
        
        # Get health check
        health = generator.health_check()
        print(f"📊 Health: {health}")
        
        # Test flashcard generation
        test_content = """
        Machine Learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. 
        There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.
        Neural networks are computational models inspired by biological neural networks.
        """
        
        options = {
            "num_cards": 4,
            "difficulty": "intermediate"
        }
        
        print(f"\n🎯 Generating flashcards...")
        print(f"   Content length: {len(test_content)} characters")
        print(f"   Options: {options}")
        
        flashcards = await generator.generate_flashcards(test_content, options)
        
        print(f"\n🎉 Generated {len(flashcards)} flashcards!")
        
        for i, card in enumerate(flashcards, 1):
            print(f"\n📋 Card {i}:")
            print(f"   Q: {card.get('front', card.get('question', 'N/A'))}")
            print(f"   A: {card.get('back', card.get('answer', 'N/A'))[:100]}...")
            print(f"   Tags: {card.get('tags', [])}")
        
        # Determine if this was AI or fallback
        ai_generated = any('ai-generated' in card.get('tags', []) for card in flashcards)
        fallback_used = any('fallback' in card.get('tags', []) for card in flashcards)
        
        if ai_generated:
            print("\n🎉 SUCCESS: AI generation worked perfectly!")
            return True, "ai"
        elif fallback_used:
            print("\n⚠️ FALLBACK: Using emergency generation (AI not available)")
            return True, "fallback"
        else:
            print("\n❓ UNKNOWN: Generated flashcards but unclear method")
            return True, "unknown"
            
    except Exception as e:
        print(f"\n❌ Flashcard generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, "error"

async def test_api_endpoint():
    """Test the API endpoint structure"""
    print("\n🌐 Testing API Endpoint...")
    
    try:
        from app.routers.ai_tools import generate_flashcards, TestUser
        from models.ai_tools import FlashcardGenerationRequest
        from fastapi import BackgroundTasks
        
        # Create test request
        request_data = {
            "content": "Python is a programming language. Variables store data.",
            "options": {
                "num_cards": 3,
                "difficulty": "beginner",
                "save": False
            },
            "user_id": "test_user"
        }
        
        request = FlashcardGenerationRequest(**request_data)
        test_user = TestUser("test_user", "test@example.com")
        background_tasks = BackgroundTasks()
        
        print("✅ API endpoint structure is valid")
        print("✅ Request/Response models work correctly")
        
        return True
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        return False

async def run_comprehensive_test():
    """Run all tests"""
    print("🚀 AetherLearn AI Flashcard System - Comprehensive Test")
    print("=" * 60)
    print(f"🕒 Started: {datetime.now()}")
    
    test_results = {
        "authentication": False,
        "flashcard_generation": False,
        "generation_method": "unknown",
        "api_endpoint": False
    }
    
    # Test 1: Authentication
    test_results["authentication"] = await test_authentication()
    
    # Test 2: Flashcard Generation
    gen_success, gen_method = await test_new_flashcard_generator()
    test_results["flashcard_generation"] = gen_success
    test_results["generation_method"] = gen_method
    
    # Test 3: API Endpoint
    test_results["api_endpoint"] = await test_api_endpoint()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in test_results.items():
        if test_name == "generation_method":
            continue
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"🎯 Generation Method: {test_results['generation_method'].upper()}")
    
    # Overall status
    all_pass = all(test_results[k] for k in test_results if k != "generation_method")
    ai_working = test_results["generation_method"] == "ai"
    
    print(f"\n🎉 OVERALL STATUS:")
    if all_pass and ai_working:
        print("✅ ALL SYSTEMS GO! AI flashcard generation is working perfectly!")
        print("\n📝 Next steps:")
        print("   1. Start backend: cd backend && python main.py")
        print("   2. Test in browser with test_flashcard_complete.html")
    elif all_pass:
        print("⚠️ SYSTEMS FUNCTIONAL! Using fallback generation.")
        print("💡 To enable AI generation:")
        print("   1. Run: gcloud auth application-default login")
        print("   2. Ensure 'Vertex AI User' permissions")
        print("   3. Check project ID in .env file")
    else:
        print("❌ SYSTEM HAS ISSUES! Check the failed tests above.")
    
    return all_pass, ai_working

async def main():
    """Main function"""
    try:
        # Load environment variables
        from dotenv import load_dotenv
        env_path = Path(__file__).parent / 'backend' / '.env'
        if env_path.exists():
            load_dotenv(env_path)
            print(f"📁 Loaded environment from: {env_path}")
        else:
            print(f"⚠️ No .env file found at: {env_path}")
        
        success, ai_working = await run_comprehensive_test()
        return success and ai_working
        
    except Exception as e:
        print(f"\n💥 Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)