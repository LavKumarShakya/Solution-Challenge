#!/usr/bin/env python3
"""
AetherLearn Google Cloud Authentication Setup
This script will help set up proper authentication for Vertex AI
"""

import os
import subprocess
import sys
from pathlib import Path

def check_gcloud_installed():
    """Check if gcloud CLI is installed"""
    try:
        result = subprocess.run(['gcloud', 'version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Google Cloud CLI is installed")
            return True
        else:
            print("❌ Google Cloud CLI is not installed")
            return False
    except FileNotFoundError:
        print("❌ Google Cloud CLI is not installed")
        return False

def setup_application_default_credentials():
    """Set up Application Default Credentials for local development"""
    print("\n🔐 Setting up Application Default Credentials...")
    print("This will open a browser window for authentication.")
    
    try:
        result = subprocess.run(['gcloud', 'auth', 'application-default', 'login'], 
                              check=True)
        print("✅ Application Default Credentials configured successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to set up credentials: {e}")
        return False

def check_project_access():
    """Check if we can access the configured project"""
    project_id = os.getenv('VERTEX_AI_PROJECT_ID', 'aetherlearn-460514')
    
    try:
        result = subprocess.run(['gcloud', 'projects', 'describe', project_id], 
                              capture_output=True, text=True, check=True)
        print(f"✅ Can access project: {project_id}")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ Cannot access project: {project_id}")
        print("Make sure you have permission to access this project")
        return False

def test_vertex_ai_access():
    """Test if we can access Vertex AI"""
    print("\n🤖 Testing Vertex AI access...")
    
    # Set environment variables
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / 'backend' / '.env'
    load_dotenv(env_path)
    
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        
        project_id = os.getenv('VERTEX_AI_PROJECT_ID')
        location = os.getenv('VERTEX_AI_LOCATION', 'us-central1')
        
        print(f"🔧 Initializing Vertex AI...")
        print(f"   Project: {project_id}")
        print(f"   Location: {location}")
        
        vertexai.init(project=project_id, location=location)
        
        model = GenerativeModel("gemini-1.5-flash-001")
        
        print("🚀 Testing model generation...")
        response = model.generate_content("Generate a simple test flashcard about Python programming.")
        
        if response and response.text:
            print("✅ Vertex AI is working perfectly!")
            print(f"📝 Test response: {response.text[:100]}...")
            return True
        else:
            print("❌ Vertex AI responded but with empty content")
            return False
            
    except Exception as e:
        print(f"❌ Vertex AI test failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 AetherLearn Google Cloud Authentication Setup")
    print("=" * 50)
    
    # Step 1: Check gcloud CLI
    if not check_gcloud_installed():
        print("\n📦 Please install Google Cloud CLI first:")
        print("   Visit: https://cloud.google.com/sdk/docs/install")
        return False
    
    # Step 2: Set up Application Default Credentials
    print("\n🔐 Setting up authentication...")
    if not setup_application_default_credentials():
        return False
    
    # Step 3: Check project access
    if not check_project_access():
        return False
    
    # Step 4: Test Vertex AI
    if not test_vertex_ai_access():
        print("\n💡 Troubleshooting tips:")
        print("   1. Make sure you have 'Vertex AI User' role in the project")
        print("   2. Check if Vertex AI API is enabled in your project")
        print("   3. Verify your project ID in the .env file")
        return False
    
    print("\n🎉 AUTHENTICATION SETUP COMPLETE!")
    print("\n📋 Summary:")
    print("   ✅ Google Cloud CLI installed")
    print("   ✅ Application Default Credentials configured")
    print("   ✅ Project access verified")
    print("   ✅ Vertex AI working")
    
    print("\n🚀 You can now run the flashcard system:")
    print("   1. cd backend && python main.py")
    print("   2. Test with the flashcard generator")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)