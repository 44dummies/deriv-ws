#!/bin/bash

# TraderMind Railway Redis Setup Script
# Run this locally to prepare for Railway Redis integration

set -e

echo "🚂 TraderMind Railway Redis Setup"
echo "=================================="
echo ""

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI detected"
    RAILWAY_CLI=true
else
    echo "⚠️  Railway CLI not found (optional)"
    echo "   Install: npm i -g @railway/cli"
    RAILWAY_CLI=false
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo ""
echo "1. Have you pushed the rate limiter fixes to your repository?"
read -p "   (y/n): " pushed
if [ "$pushed" != "y" ]; then
    echo ""
    echo "❌ Please commit and push your changes first:"
    echo "   git add ."
    echo "   git commit -m 'fix(rate-limiter): add Redis support with graceful fallback'"
    echo "   git push origin main"
    exit 1
fi

echo ""
echo "2. Do you have access to Railway Dashboard?"
read -p "   (y/n): " access
if [ "$access" != "y" ]; then
    echo ""
    echo "❌ You need Railway Dashboard access. Go to: https://railway.app"
    exit 1
fi

echo ""
echo "✅ Prerequisites met!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Next Steps (Railway Dashboard):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "STEP 1: Add Redis Database"
echo "  1. Go to https://railway.app/dashboard"
echo "  2. Select your TraderMind project"
echo "  3. Click 'New' button (top right)"
echo "  4. Select 'Database' → 'Add Redis'"
echo "  5. Wait for Redis to deploy (~30 seconds)"
echo ""
echo "STEP 2: Verify Environment Variable"
echo "  1. Click on 'api-gateway' service"
echo "  2. Go to 'Variables' tab"
echo "  3. Confirm REDIS_URL is present"
echo "     Format: redis://default:***@redis.railway.internal:6379"
echo ""
echo "STEP 3: Redeploy API Gateway"
echo "  1. Stay in 'api-gateway' service"
echo "  2. Go to 'Deployments' tab"
echo "  3. Click 'Redeploy' on latest deployment"
echo "  4. Wait for deployment to complete"
echo ""
echo "STEP 4: Verify Connection"
echo "  1. Go to 'Deployments' → View logs"
echo "  2. Look for: [inf] RateLimiter Redis connected"
echo "  3. Should NOT see: [err] RateLimiter Redis error (continuous)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$RAILWAY_CLI" = true ]; then
    echo "💡 You have Railway CLI installed!"
    echo ""
    read -p "Would you like to open Railway Dashboard now? (y/n): " open_dash
    if [ "$open_dash" = "y" ]; then
        railway open
    fi
    echo ""
    echo "📊 To check service status:"
    echo "   railway status"
    echo ""
    echo "📝 To view logs:"
    echo "   railway logs"
fi

echo ""
echo "📚 Documentation:"
echo "   • Full guide: RAILWAY_REDIS_SETUP.md"
echo "   • Fix details: docs/REDIS_FIX.md"
echo "   • Redis setup options: docs/REDIS_SETUP.md"
echo ""
echo "💰 Cost Estimate:"
echo "   • Railway Redis: \$5/month (512MB)"
echo "   • Alternative: Upstash free tier (10K commands/day)"
echo ""
echo "✅ Ready to proceed! Follow the steps above in Railway Dashboard."
echo ""
