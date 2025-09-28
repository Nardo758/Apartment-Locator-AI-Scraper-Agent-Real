#!/bin/bash

# 🧪 Command Station Test Suite
# 
# This script tests all endpoints of the Command Station to ensure
# everything is working correctly after deployment.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${SUPABASE_URL:-}"
FUNCTION_NAME="command-station"

if [ -z "$BASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL environment variable not set${NC}"
    exit 1
fi

FUNCTION_URL="$BASE_URL/functions/v1/$FUNCTION_NAME"

echo -e "${BLUE}🧪 Command Station Test Suite${NC}"
echo -e "${BLUE}============================${NC}"
echo -e "Testing: $FUNCTION_URL\n"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    echo -e "${YELLOW}🔍 Testing: $description${NC}"
    
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json' -d '$data'"
    elif [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi
    
    curl_cmd="$curl_cmd '$FUNCTION_URL$endpoint'"
    
    local status_code
    status_code=$(eval $curl_cmd)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ $description - Status: $status_code${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Show response for key endpoints
        if [ "$endpoint" = "/help" ] || [ "$endpoint" = "/status" ]; then
            echo -e "${BLUE}   Response preview:${NC}"
            cat /tmp/response.json | jq -r '.title // .system.status // "Response received"' 2>/dev/null || echo "   Response received"
        fi
    else
        echo -e "${RED}❌ $description - Expected: $expected_status, Got: $status_code${NC}"
        echo -e "${RED}   Response:${NC}"
        cat /tmp/response.json 2>/dev/null || echo "   No response body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    echo ""
}

# Run tests
echo -e "${YELLOW}🚀 Starting endpoint tests...${NC}\n"

# Basic endpoints
test_endpoint "GET" "/help" 200 "Help endpoint"
test_endpoint "GET" "/health" 200 "Health check endpoint"
test_endpoint "GET" "/version" 200 "Version endpoint"

# Monitoring endpoints
test_endpoint "GET" "/status" 200 "System status dashboard"
test_endpoint "GET" "/metrics" 200 "System metrics"
test_endpoint "GET" "/activity" 200 "Recent activity"

# Configuration endpoints
test_endpoint "GET" "/config" 200 "Get configuration"

# Test configuration update
config_update='{"batchSize": 25, "dailyCostLimit": 75}'
test_endpoint "POST" "/config" 200 "Update configuration" "$config_update"

# Control endpoints (these might fail if system is not fully set up)
test_endpoint "POST" "/enable-scraping" 200 "Enable scraping system"
test_endpoint "POST" "/disable-scraping" 200 "Disable scraping system"

# Test invalid endpoints
test_endpoint "GET" "/nonexistent" 404 "Non-existent endpoint (should fail)"
test_endpoint "POST" "/invalid" 404 "Invalid POST endpoint (should fail)"

# Test trends endpoint (might fail without data)
test_endpoint "GET" "/trends/error_rate?range=24h" 200 "Trends endpoint"

# Advanced tests
echo -e "${YELLOW}🔬 Running advanced tests...${NC}\n"

# Test CORS headers
echo -e "${YELLOW}🔍 Testing CORS headers...${NC}"
cors_response=$(curl -s -H "Origin: https://example.com" -H "Access-Control-Request-Method: GET" -X OPTIONS "$FUNCTION_URL/status")
if curl -s -I -H "Origin: https://example.com" "$FUNCTION_URL/status" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ CORS headers missing${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test JSON response format
echo -e "${YELLOW}🔍 Testing JSON response format...${NC}"
if curl -s "$FUNCTION_URL/help" | jq empty 2>/dev/null; then
    echo -e "${GREEN}✅ Valid JSON responses${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Invalid JSON responses${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Performance test
echo -e "${YELLOW}🔍 Testing response time...${NC}"
response_time=$(curl -s -o /dev/null -w '%{time_total}' "$FUNCTION_URL/health")
response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")

if (( $(echo "$response_time < 5.0" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${GREEN}✅ Response time acceptable: ${response_time}s${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Response time slow: ${response_time}s${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Integration test - full workflow
echo -e "${YELLOW}🔍 Testing full workflow...${NC}"
workflow_success=true

# 1. Get current status
if ! curl -s -f "$FUNCTION_URL/status" > /tmp/status.json; then
    workflow_success=false
fi

# 2. Update config
if ! curl -s -f -X POST -H 'Content-Type: application/json' -d '{"batchSize": 30}' "$FUNCTION_URL/config" > /dev/null; then
    workflow_success=false
fi

# 3. Get updated config
if ! curl -s -f "$FUNCTION_URL/config" > /tmp/config.json; then
    workflow_success=false
fi

# 4. Check if batchSize was updated
if command -v jq >/dev/null 2>&1; then
    batch_size=$(jq -r '.config.batchSize' /tmp/config.json 2>/dev/null || echo "0")
    if [ "$batch_size" != "30" ]; then
        workflow_success=false
    fi
fi

if [ "$workflow_success" = true ]; then
    echo -e "${GREEN}✅ Full workflow test passed${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Full workflow test failed${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Cleanup
rm -f /tmp/response.json /tmp/status.json /tmp/config.json

# Results
echo -e "${BLUE}📊 Test Results${NC}"
echo -e "${BLUE}==============${NC}"
echo -e "✅ Tests Passed: $TESTS_PASSED"
echo -e "❌ Tests Failed: $TESTS_FAILED"
echo -e "📈 Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Command Station is working correctly.${NC}"
    exit 0
else
    success_rate=$(echo "scale=1; $TESTS_PASSED * 100 / ($TESTS_PASSED + $TESTS_FAILED)" | bc 2>/dev/null || echo "0")
    echo -e "\n${YELLOW}⚠️  Some tests failed. Success rate: ${success_rate}%${NC}"
    
    if [ $TESTS_PASSED -gt $TESTS_FAILED ]; then
        echo -e "${YELLOW}Most functionality is working. Check failed tests above.${NC}"
        exit 1
    else
        echo -e "${RED}Major issues detected. Please check the deployment.${NC}"
        exit 2
    fi
fi