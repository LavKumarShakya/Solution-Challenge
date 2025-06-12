#!/usr/bin/env python3
"""
Test script to check if the original Vertex AI implementation works with the new service account path.
This is a temporary test and won't modify the actual vertex_ai.py file.
"""

import os
import asyncio
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_original_vertex_ai():
    """Test the original Vertex AI implementation with new service account"""
    print("🧪 Testing Original Vertex AI Implementation...")
    print("=" * 50)
    
    try:
        # Check for required environment variables for original Vertex AI
        required_vars = [
            'GCP_PROJECT_ID',
            'VERTEX_AI_PROJECT_ID', 
            'VERTEX_AI_LOCATION',
            'VERTEX_AI_MODEL',
            'GOOGLE_APPLICATION_CREDENTIALS'  # Service account path
        ]
        
        print("\n📋 Checking Environment Variables:")
        missing_vars = []
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                missing_vars.append(var)
                print(f"❌ {var}: Missing")
            else:
                # Mask file paths but show they exist
                if 'CREDENTIALS' in var:
                    display_value = f"...{value[-20:]}" if len(value) > 20 else value
                else:
                    display_value = value
                print(f"✅ {var}: {display_value}")
        
        if missing_vars:
            print(f"\n❌ Missing required variables: {', '.join(missing_vars)}")
            return False
        
        print("\n🔧 Testing Original Vertex AI Implementation:")
        
        # Try importing original Vertex AI modules
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel
            print("✅ Vertex AI modules imported successfully")
        except ImportError as e:
            print(f"❌ Failed to import Vertex AI modules: {e}")
            print("   Note: You may need to install google-cloud-aiplatform")
            return False
        
        # Initialize Vertex AI with new service account
        project_id = os.getenv('VERTEX_AI_PROJECT_ID')
        location = os.getenv('VERTEX_AI_LOCATION', 'us-central1')
        model_id = os.getenv('VERTEX_AI_MODEL', 'gemini-1.5-flash-001')
        
        print(f"   Project ID: {project_id}")
        print(f"   Location: {location}")
        print(f"   Model: {model_id}")
        
        # Initialize Vertex AI
        vertexai.init(project=project_id, location=location)
        print("✅ Vertex AI initialized successfully")
        
        # Create model instance
        model = GenerativeModel(model_id)
        print("✅ Generative Model created successfully")
        
        # Test with a simple prompt
        test_prompt = "What is machine learning? Please provide a brief 2-sentence explanation."
        print(f"\n🎯 Testing with prompt: '{test_prompt}'")
        
        response = model.generate_content(test_prompt)
        
        if response and response.text:
            print("✅ Original Vertex AI test SUCCESSFUL!")
            print(f"   Response length: {len(response.text)} characters")
            print(f"   Sample response: '{response.text[:150]}...'")
            return True
        else:
            print("❌ Original Vertex AI returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ Original Vertex AI test FAILED: {e}")
        print(f"   Error type: {type(e).__name__}")
        
        # Check if it's an authentication error
        if "authentication" in str(e).lower() or "credentials" in str(e).lower():
            print("   🔍 This appears to be an authentication issue.")
            print("   📝 Check your service account file path and permissions.")
        elif "permission" in str(e).lower() or "denied" in str(e).lower():
            print("   🔍 This appears to be a permissions issue.")
            print("   📝 Check if your service account has Vertex AI access.")
        
        return False

def test_current_gemini_implementation():
    """Test the current Direct Gemini implementation for comparison"""
    print("\n🌟 Testing Current Direct Gemini Implementation (for comparison):")
    print("-" * 50)
    
    try:
        import google.generativeai as genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-001')
        
        if not api_key:
            print("❌ GEMINI_API_KEY not configured")
            return False
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        
        test_prompt = "What is machine learning? Please provide a brief 2-sentence explanation."
        response = model.generate_content(test_prompt)
        
        if response and response.text:
            print("✅ Current Direct Gemini implementation works fine")
            print(f"   Response length: {len(response.text)} characters")
            return True
        else:
            print("❌ Current implementation failed")
            return False
            
    except Exception as e:
        print(f"❌ Current implementation error: {e}")
        return False

def main():
    """Run the test comparison"""
    print("🔬 Vertex AI vs Direct Gemini API Test")
    print("=" * 60)
    
    # Test original Vertex AI implementation
    vertex_ai_works = test_original_vertex_ai()
    
    # Test current Direct Gemini implementation
    gemini_works = test_current_gemini_implementation()
    
    # Summary and recommendation
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    print(f"Original Vertex AI:     {'✅ PASS' if vertex_ai_works else '❌ FAIL'}")
    print(f"Direct Gemini API:      {'✅ PASS' if gemini_works else '❌ FAIL'}")
    
    print("\n💡 RECOMMENDATION:")
    if vertex_ai_works and gemini_works:
        print("✅ Both implementations work! You can choose either:")
        print("   • Vertex AI: More enterprise features, better for large-scale deployment")
        print("   • Direct Gemini: Simpler setup, fewer dependencies")
        print("\n🔄 Would you like to revert to Vertex AI? (You'll need to update the vertex_ai.py file)")
    elif vertex_ai_works and not gemini_works:
        print("✅ Original Vertex AI works with your new service account!")
        print("🔄 You should revert to the Vertex AI implementation")
    elif not vertex_ai_works and gemini_works:
        print("✅ Keep using the current Direct Gemini implementation")
        print("❌ Original Vertex AI still has issues with the service account")
    else:
        print("❌ Both implementations have issues - check your credentials")
    
    return vertex_ai_works

if __name__ == "__main__":
    try:
        result = main()
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)