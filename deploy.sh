#!/bin/bash

# Automated Deployment Script for Deriv Auth App
# This script handles the complete deployment to Vercel

set -e  # Exit on error

echo "🚀 Starting automated deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build the production version
echo -e "${BLUE}📦 Building production version...${NC}"
npm run build

# Step 2: Check if we have a GitHub remote
echo -e "${BLUE}🔍 Checking GitHub repository...${NC}"
if ! git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}⚠️  No GitHub remote found.${NC}"
    echo -e "${YELLOW}Please create a GitHub repository and run:${NC}"
    echo ""
    echo "  git remote add origin https://github.com/YOUR_USERNAME/deriv-auth-app.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
    echo ""
    echo -e "${YELLOW}Then, go to https://vercel.com/new and import your repository.${NC}"
    exit 1
fi

# Step 3: Commit and push changes
echo -e "${BLUE}💾 Committing changes...${NC}"
git add .
if git diff --staged --quiet; then
    echo -e "${GREEN}✓ No changes to commit${NC}"
else
    git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${GREEN}✓ Changes committed${NC}"
fi

# Step 4: Push to GitHub
echo -e "${BLUE}⬆️  Pushing to GitHub...${NC}"
BRANCH=$(git branch --show-current)
git push origin "$BRANCH" || {
    echo -e "${YELLOW}⚠️  Failed to push. You may need to set upstream:${NC}"
    echo "  git push -u origin $BRANCH"
    exit 1
}

echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"

# Step 5: Deployment instructions
echo ""
echo -e "${GREEN}🎉 Build complete and code pushed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Go to https://vercel.com/new"
echo "2. Import your repository"
echo "3. Add these environment variables in Vercel:"
echo ""
echo "   REACT_APP_DERIV_APP_ID=114042"
echo "   REACT_APP_REDIRECT_URL=https://deriv-ws.vercel.app/callback"
echo "   REACT_APP_DERIV_OAUTH_URL=https://oauth.deriv.com/oauth2/authorize"
echo "   REACT_APP_DERIV_WS_URL=wss://ws.derivws.com/websockets/v3"
echo ""
echo "4. Deploy!"
echo ""
echo -e "${YELLOW}📝 Don't forget to register the callback URL at:${NC}"
echo "   https://app.deriv.com/account/api-token"
echo ""
echo "   Redirect URLs:"
echo "   - http://localhost:3000/callback"
echo "   - https://deriv-ws.vercel.app/callback"
echo ""
