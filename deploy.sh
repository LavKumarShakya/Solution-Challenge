#!/bin/bash

# ==============================================
# AetherLearn Backend - Cloud Run Deployment Script
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="aetherlearn-460514"
SERVICE_NAME="aetherlearn-backend"
REGION="us-central1"
SOURCE_DIR="./AetherLearn/backend"

echo -e "${BLUE}🚀 AetherLearn Backend Deployment Script${NC}"
echo "=============================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${GREEN}✅ Google Cloud CLI found${NC}"

# Set project
echo -e "${BLUE}🔧 Setting up Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com

# Navigate to backend directory
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

cd $SOURCE_DIR

# Check required files
echo -e "${BLUE}🔍 Checking required files...${NC}"
required_files=("main.py" "requirements.txt" "Dockerfile" ".env")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Required file not found: $file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found: $file${NC}"
done

# Deploy to Cloud Run
echo -e "${BLUE}🚀 Deploying to Cloud Run...${NC}"
echo "This may take 3-5 minutes..."

gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8000 \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 10 \
    --min-instances 0 \
    --timeout 900s \
    --concurrency 80 \
    --set-env-vars="ENVIRONMENT=production"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Failed to get service URL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}🌐 Service URL: $SERVICE_URL${NC}"

# Update environment variables
echo -e "${BLUE}🔧 Setting environment variables...${NC}"

# Read environment variables from .env file and set them
if [ -f ".env" ]; then
    # Extract key environment variables (be careful with sensitive data)
    SEARCH_API_KEY=$(grep "^SEARCH_API_KEY=" .env | cut -d '=' -f2)
    SEARCH_ENGINE_ID=$(grep "^SEARCH_ENGINE_ID=" .env | cut -d '=' -f2)
    GEMINI_API_KEY=$(grep "^GEMINI_API_KEY=" .env | cut -d '=' -f2)
    SECRET_KEY=$(grep "^SECRET_KEY=" .env | cut -d '=' -f2)
    MONGODB_URL=$(grep "^MONGODB_URL=" .env | cut -d '=' -f2)
    
    if [ ! -z "$SEARCH_API_KEY" ] && [ ! -z "$SEARCH_ENGINE_ID" ] && [ ! -z "$GEMINI_API_KEY" ]; then
        gcloud run services update $SERVICE_NAME \
            --region $REGION \
            --update-env-vars="SEARCH_API_KEY=$SEARCH_API_KEY" \
            --update-env-vars="SEARCH_ENGINE_ID=$SEARCH_ENGINE_ID" \
            --update-env-vars="GEMINI_API_KEY=$GEMINI_API_KEY" \
            --update-env-vars="SECRET_KEY=$SECRET_KEY" \
            --update-env-vars="MONGODB_URL=$MONGODB_URL" \
            --update-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
            --update-env-vars="VERTEX_AI_PROJECT_ID=$PROJECT_ID" \
            --update-env-vars="VERTEX_AI_LOCATION=$REGION" \
            --update-env-vars="ENVIRONMENT=production" \
            --quiet
        
        echo -e "${GREEN}✅ Environment variables set${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not read all required environment variables from .env file${NC}"
        echo "Please set them manually using:"
        echo "gcloud run services update $SERVICE_NAME --region $REGION --update-env-vars=\"KEY=value\""
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found. Please set environment variables manually.${NC}"
fi

# Test the deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"
if curl -f -s "$SERVICE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed, but service might still be starting...${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "=============================================="
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "   🌐 Service URL: $SERVICE_URL"
echo "   📊 Health Check: $SERVICE_URL/health"
echo "   📖 API Docs: $SERVICE_URL/docs"
echo "   🔍 Search API: $SERVICE_URL/api/v1/search-resources"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "   View logs: gcloud run services logs read $SERVICE_NAME --region $REGION"
echo "   Update service: gcloud run services update $SERVICE_NAME --region $REGION"
echo "   Delete service: gcloud run services delete $SERVICE_NAME --region $REGION"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "   1. Update your frontend to use the new backend URL"
echo "   2. Test all API endpoints"
echo "   3. Set up monitoring and alerts"
echo "   4. Configure custom domain (optional)"

cd - > /dev/null  # Return to original directory