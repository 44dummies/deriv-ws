#!/bin/bash

# Quick Setup Script for GitHub Repository
# Run this first if you don't have a GitHub repo set up yet

set -e

echo "🔧 GitHub Repository Setup"
echo ""

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    echo "❌ GitHub username is required!"
    exit 1
fi

echo ""
echo "Setting up repository..."

# Check if remote already exists
if git remote get-url origin &> /dev/null; then
    echo "⚠️  Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Add new remote
git remote add origin "https://github.com/$GITHUB_USER/deriv-auth-app.git"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Renaming branch to 'main'..."
    git branch -M main
fi

echo ""
echo "✅ Repository configured!"
echo ""
echo "Now you need to:"
echo "1. Create the repository on GitHub:"
echo "   https://github.com/new"
echo "   Repository name: deriv-auth-app"
echo ""
echo "2. Then push your code:"
echo "   git push -u origin main"
echo ""
echo "3. Run the deployment script:"
echo "   ./deploy.sh"
echo ""
