#!/bin/bash
# TraderMind Development Test Suite

set -e

echo "==================================================================="
echo "TraderMind Development Environment Test"
echo "==================================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing $name... "
    
    response=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1 || echo "TIMEOUT")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test compilation
echo "==================================================================="
echo "1. BUILD VERIFICATION"
echo "==================================================================="

if [ -d "dist" ] && [ -f "backend/api-gateway/dist/index.js" ]; then
    echo -e "${GREEN}✓${NC} Backend compiled successfully"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Backend build missing"
    ((TESTS_FAILED++))
fi

if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo -e "${GREEN}✓${NC} Frontend compiled successfully"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Frontend build missing"
    ((TESTS_FAILED++))
fi

echo ""

# Test API Gateway endpoints
echo "==================================================================="
echo "2. API GATEWAY ENDPOINTS (localhost:3000)"
echo "==================================================================="

# Check if server is running
if netstat -tln 2>/dev/null | grep -q ':3000' || ss -tln | grep -q ':3000'; then
    echo -e "${GREEN}✓${NC} API Gateway process is listening on port 3000"
    ((TESTS_PASSED++))
    
    # Test endpoints
    test_endpoint "Health Check" "http://localhost:3000/health" "200"
    test_endpoint "API Status" "http://localhost:3000/api/v1/status" "200"
    test_endpoint "CSRF Token" "http://localhost:3000/api/v1/csrf-token" "200"
    
    # Test 404
    test_endpoint "404 Handler" "http://localhost:3000/nonexistent" "404"
else
    echo -e "${RED}✗${NC} API Gateway is not running on port 3000"
    echo "   Please start it with: cd backend/api-gateway && pnpm run dev"
    ((TESTS_FAILED++))
fi

echo ""

# Test Database Connection
echo "==================================================================="
echo "3. DATABASE CONNECTION"
echo "==================================================================="

if [ -n "$SUPABASE_URL" ]; then
    echo -e "${GREEN}✓${NC} SUPABASE_URL configured: $SUPABASE_URL"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} SUPABASE_URL not set in environment"
    ((TESTS_FAILED++))
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY configured"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} SUPABASE_SERVICE_ROLE_KEY not set"
    ((TESTS_FAILED++))
fi

echo ""

# Test Required Environment Variables
echo "==================================================================="
echo "4. ENVIRONMENT VARIABLES"
echo "==================================================================="

check_env() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✓${NC} $1 is set"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $1 is not set"
    fi
}

check_env "SESSION_SECRET"
check_env "DERIV_TOKEN_KEY"
check_env "DERIV_APP_ID"

echo ""

# Summary
echo "==================================================================="
echo "TEST SUMMARY"
echo "==================================================================="
echo -e "Tests Passed:  ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:  ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! System is ready for development.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Review the errors above.${NC}"
    exit 1
fi
