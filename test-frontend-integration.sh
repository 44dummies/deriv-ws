#!/bin/bash
# Frontend Integration Test with Production API
# Tests TraderMind frontend against Railway production backend

API_URL="https://awake-reflection-production-f31e.up.railway.app"
FRONTEND_URL="http://localhost:5173"

echo "======================================================================"
echo "TraderMind Frontend Integration Test"
echo "======================================================================"
echo ""
echo "API Endpoint: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: API Health Check
echo "[1/6] Testing API Health Check..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ PASS - API is healthy"
else
    echo "❌ FAIL - API health check failed"
    echo "Response: $HEALTH"
fi
echo ""

# Test 2: API Status
echo "[2/6] Testing API Status Endpoint..."
STATUS=$(curl -s "$API_URL/api/v1/status")
if echo "$STATUS" | grep -q '"status":"ok"'; then
    echo "✅ PASS - API status endpoint working"
else
    echo "❌ FAIL - API status check failed"
fi
echo ""

# Test 3: CORS Headers
echo "[3/6] Testing CORS Configuration..."
CORS=$(curl -s -I "$API_URL/health" | grep -i "access-control")
if [ ! -z "$CORS" ]; then
    echo "✅ PASS - CORS headers present"
    echo "$CORS"
else
    echo "⚠️  WARN - No CORS headers detected"
fi
echo ""

# Test 4: WebSocket Stats
echo "[4/6] Testing WebSocket Stats Endpoint..."
WS_STATS=$(curl -s "$API_URL/api/v1/ws/stats")
if echo "$WS_STATS" | grep -q "connections"; then
    echo "✅ PASS - WebSocket stats available"
    echo "Stats: $WS_STATS"
else
    echo "❌ FAIL - WebSocket stats unavailable"
fi
echo ""

# Test 5: CSRF Token Generation
echo "[5/6] Testing CSRF Token Generation..."
CSRF=$(curl -s "$API_URL/api/v1/csrf-token")
if [ ! -z "$CSRF" ]; then
    echo "✅ PASS - CSRF token generated"
else
    echo "❌ FAIL - CSRF token not generated"
fi
echo ""

# Test 6: Detailed Health Check
echo "[6/6] Testing Detailed Health Check..."
DETAILED=$(curl -s "$API_URL/health/detailed")
if echo "$DETAILED" | grep -q "supabase"; then
    echo "✅ PASS - Detailed health check working"
    echo "Database: $(echo $DETAILED | grep -o '"supabase":{[^}]*}' || echo 'N/A')"
else
    echo "⚠️  WARN - Detailed health check incomplete"
fi
echo ""

echo "======================================================================"
echo "Frontend Build Test"
echo "======================================================================"
echo ""

# Check if frontend is built
if [ -d "frontend/dist" ]; then
    echo "✅ Frontend build exists"
    echo "   Files: $(ls -1 frontend/dist | wc -l) files"
    echo "   Size: $(du -sh frontend/dist 2>/dev/null | cut -f1)"
else
    echo "⚠️  Frontend not built - run: cd frontend && pnpm run build"
fi
echo ""

echo "======================================================================"
echo "Environment Variables Check"
echo "======================================================================"
echo ""

if [ -f "frontend/.env" ]; then
    echo "✅ Frontend .env file exists"
    echo ""
    echo "Configured variables:"
    grep -E "^VITE_" frontend/.env | sed 's/=.*/=***/' || echo "No VITE_ variables found"
else
    echo "❌ Frontend .env file missing"
fi
echo ""

echo "======================================================================"
echo "Integration Test Summary"
echo "======================================================================"
echo ""
echo "To start frontend development server:"
echo "  cd frontend && pnpm run dev"
echo ""
echo "To access frontend:"
echo "  http://localhost:5173"
echo ""
echo "To view production API:"
echo "  $API_URL"
echo ""
echo "======================================================================"
