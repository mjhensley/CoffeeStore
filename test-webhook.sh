#!/usr/bin/env bash
# Webhook Testing Script
# Tests the deployed helcim-webhook endpoint

set -e
set -o pipefail

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide your webhook URL${NC}"
    echo "Usage: $0 https://your-site.netlify.app/.netlify/functions/helcim-webhook"
    exit 1
fi

WEBHOOK_URL="$1"

echo "🧪 Testing Helcim Webhook Endpoint"
echo "URL: $WEBHOOK_URL"
echo ""

# Test 1: HEAD request (Critical for Helcim validation)
echo -e "${YELLOW}Test 1: HEAD Request (Webhook Validation)${NC}"
HTTP_STATUS=$(curl -I -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HEAD request successful - Returns 200 OK${NC}"
    echo "   This is what Helcim uses to validate the webhook URL"
else
    echo -e "${RED}❌ HEAD request failed (Status: $HTTP_STATUS)${NC}"
    echo "   Helcim won't be able to validate this webhook URL"
fi
echo ""

# Test 2: GET request (Health check)
echo -e "${YELLOW}Test 2: GET Request (Health Check)${NC}"
HEALTH_RESPONSE=$(curl -s "$WEBHOOK_URL")
if echo "$HEALTH_RESPONSE" | grep -q "ready"; then
    echo -e "${GREEN}✅ GET request successful${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ GET request failed or returned unexpected response${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi
echo ""

# Test 3: POST request (Webhook event)
echo -e "${YELLOW}Test 3: POST Request (Webhook Event)${NC}"
WEBHOOK_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"type":"payment.success","transactionId":"test-12345","amount":99.99}')

if echo "$WEBHOOK_RESPONSE" | grep -q "received.*true"; then
    echo -e "${GREEN}✅ POST request successful${NC}"
    echo "   Response: $WEBHOOK_RESPONSE"
else
    echo -e "${RED}❌ POST request failed or returned unexpected response${NC}"
    echo "   Response: $WEBHOOK_RESPONSE"
fi
echo ""

# Test 4: OPTIONS request (CORS)
echo -e "${YELLOW}Test 4: OPTIONS Request (CORS Preflight)${NC}"
HTTP_STATUS=$(curl -I -s -X OPTIONS -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" || echo "000")
if [ "$HTTP_STATUS" = "204" ]; then
    echo -e "${GREEN}✅ OPTIONS request successful - Returns 204${NC}"
    echo "   CORS is properly configured"
else
    echo -e "${RED}❌ OPTIONS request failed (Status: $HTTP_STATUS)${NC}"
fi
echo ""

# Test 5: GET request with check parameter (URL verification)
echo -e "${YELLOW}Test 5: GET Request with check parameter (URL Verification)${NC}"
CHECK_VALUE="test.value+123"
CHECK_RESPONSE=$(curl -s "$WEBHOOK_URL?check=$CHECK_VALUE")
if [ "$CHECK_RESPONSE" = "$CHECK_VALUE" ]; then
    echo -e "${GREEN}✅ Check parameter echoed correctly${NC}"
    echo "   Response: $CHECK_RESPONSE"
else
    echo -e "${RED}❌ Check parameter not echoed correctly${NC}"
    echo "   Expected: $CHECK_VALUE"
    echo "   Got: $CHECK_RESPONSE"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Testing Complete${NC}"
echo ""
echo "Next Steps:"
echo "1. If all tests pass, configure webhook in Helcim Dashboard"
echo "2. Go to Helcim → Integrations → Webhooks"
echo "3. Add webhook URL: $WEBHOOK_URL"
echo "4. Select events to receive (payment.success, payment.failed, etc.)"
echo "5. Save and verify Helcim shows webhook as 'Active'"
echo ""
echo "For troubleshooting, see WEBHOOK_TROUBLESHOOTING.md"

