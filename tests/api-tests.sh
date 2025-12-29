#!/bin/bash
# TraderMind API Tests - Auth, Sessions, WebSocket
# Run: chmod +x tests/api-tests.sh && ./tests/api-tests.sh

BASE_URL="${API_URL:-http://localhost:4000}"
echo "Testing API at: $BASE_URL"
echo "================================"

# ============================================================================
# HEALTH CHECK
# ============================================================================
echo -e "\n[TEST] Health Check"
curl -s "$BASE_URL/health" | head -c 200
echo ""

# ============================================================================
# AUTH TESTS
# ============================================================================
echo -e "\n[TEST] Auth - Login (no credentials)"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" | head -c 200
echo ""

echo -e "\n[TEST] Auth - Get current user (no token)"
curl -s "$BASE_URL/auth/me" | head -c 200
echo ""

echo -e "\n[TEST] Auth - Deriv connect endpoint"
curl -s -X POST "$BASE_URL/auth/deriv/connect" | head -c 200
echo ""

# ============================================================================
# SESSION TESTS
# ============================================================================
echo -e "\n[TEST] Sessions - List all"
curl -s "$BASE_URL/sessions" | head -c 200
echo ""

echo -e "\n[TEST] Sessions - Create new"
curl -s -X POST "$BASE_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Session","config":{"max_participants":10}}' | head -c 300
echo ""

echo -e "\n[TEST] Sessions - Get by ID"
curl -s "$BASE_URL/sessions/sess_001" | head -c 200
echo ""

echo -e "\n[TEST] Sessions - Start session"
curl -s -X POST "$BASE_URL/sessions/sess_001/start" | head -c 200
echo ""

echo -e "\n[TEST] Sessions - Join session"
curl -s -X POST "$BASE_URL/sessions/sess_001/join" | head -c 200
echo ""

echo -e "\n[TEST] Sessions - Leave session"
curl -s -X POST "$BASE_URL/sessions/sess_001/leave" | head -c 200
echo ""

echo -e "\n[TEST] Sessions - Stop session"
curl -s -X POST "$BASE_URL/sessions/sess_001/stop" | head -c 200
echo ""

# ============================================================================
# USER TESTS
# ============================================================================
echo -e "\n[TEST] Users - List all"
curl -s "$BASE_URL/users" | head -c 200
echo ""

echo -e "\n[TEST] Users - Get by ID"
curl -s "$BASE_URL/users/user_001" | head -c 200
echo ""

# ============================================================================
# TRADE TESTS
# ============================================================================
echo -e "\n[TEST] Trades - List all"
curl -s "$BASE_URL/trades" | head -c 200
echo ""

echo -e "\n[TEST] Trades - Create new"
curl -s -X POST "$BASE_URL/trades" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"sess_001","type":"CALL","stake":10,"market":"R_100"}' | head -c 300
echo ""

echo -e "\n================================"
echo "API Tests Complete"
