#!/bin/bash

# Comprehensive Edge Case Testing Script
# Make sure your server is running: npm run dev

BASE_URL="http://localhost:8080"
SKU=$(grep SHOPIFY_SKU_MAP .env 2>/dev/null | cut -d'=' -f2 | grep -o '"[^"]*"' | head -1 | tr -d '"' || echo "YOUR-SKU-HERE")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

test() {
  local name="$1"
  local expected_code="$2"
  local method="$3"
  local endpoint="$4"
  local data="$5"
  local description="$6"
  
  test_count=$((test_count + 1))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "${YELLOW}Test $test_count: $name${NC}"
  echo "Description: $description"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
    -H 'Content-Type: application/json' \
    -H "Idempotency-Key: edge-test-$(date +%s)-$test_count" \
    -d "$data" 2>/dev/null)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "$expected_code" ]; then
    echo "${GREEN}✅ PASS${NC} - Expected $expected_code, got $http_code"
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    pass_count=$((pass_count + 1))
  else
    echo "${RED}❌ FAIL${NC} - Expected $expected_code, got $http_code"
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    fail_count=$((fail_count + 1))
  fi
}

echo "🧪 Edge Case Testing Suite"
echo "=========================="
echo ""
echo "Testing against: $BASE_URL"
echo "Using SKU: $SKU"
echo ""
read -p "Press Enter to start testing..."

# ============================================================================
# TEST SUITE 1: Invalid Inputs - create_checkout
# ============================================================================

echo ""
echo "📦 TEST SUITE 1: Invalid Inputs - create_checkout"
echo "───────────────────────────────────────────────────"

test "Empty items array" \
  400 \
  POST \
  "/create_checkout" \
  '{"items": []}' \
  "Should reject empty items array"

test "Missing items field" \
  400 \
  POST \
  "/create_checkout" \
  '{"shippingAddress": {"line1": "123 Main", "city": "NYC", "postalCode": "10001", "country": "US"}}' \
  "Should reject missing items field"

test "Invalid quantity (zero)" \
  400 \
  POST \
  "/create_checkout" \
  "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 0}]}" \
  "Should reject zero quantity"

test "Invalid quantity (negative)" \
  400 \
  POST \
  "/create_checkout" \
  "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": -1}]}" \
  "Should reject negative quantity"

test "Invalid quantity (decimal)" \
  400 \
  POST \
  "/create_checkout" \
  "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1.5}]}" \
  "Should reject decimal quantity"

test "Invalid email format" \
  400 \
  POST \
  "/create_checkout" \
  "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"email\": \"not-an-email\"}" \
  "Should reject invalid email format"

test "Invalid country code (too short)" \
  400 \
  POST \
  "/create_checkout" \
  "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"shippingAddress\": {\"line1\": \"123 Main\", \"city\": \"NYC\", \"postalCode\": \"10001\", \"country\": \"U\"}}" \
  "Should reject invalid country code"

test "Invalid country code (too long)" \
  400 \
  POST \
  "/create_checkout" \
  "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"shippingAddress\": {\"line1\": \"123 Main\", \"city\": \"NYC\", \"postalCode\": \"10001\", \"country\": \"USA\"}}" \
  "Should reject country code longer than 2 chars"

# ============================================================================
# TEST SUITE 2: Invalid Session IDs
# ============================================================================

echo ""
echo "🔑 TEST SUITE 2: Invalid Session IDs"
echo "────────────────────────────────────"

INVALID_UUID="00000000-0000-0000-0000-000000000000"
RANDOM_UUID="550e8400-e29b-41d4-a716-446655440000"

test "Update with non-existent session ID" \
  400 \
  POST \
  "/update_checkout" \
  "{\"sessionId\": \"$INVALID_UUID\"}" \
  "Should reject non-existent session ID"

test "Update with invalid UUID format" \
  400 \
  POST \
  "/update_checkout" \
  '{"sessionId": "not-a-uuid"}' \
  "Should reject invalid UUID format"

test "Complete with non-existent session ID" \
  400 \
  POST \
  "/complete_checkout" \
  "{\"sessionId\": \"$INVALID_UUID\", \"email\": \"test@example.com\", \"sharedPaymentToken\": {\"provider\": \"paypal\", \"token\": \"FAKE123\"}}" \
  "Should reject non-existent session ID for complete"

test "Cancel with non-existent session ID" \
  400 \
  POST \
  "/cancel_checkout" \
  "{\"sessionId\": \"$INVALID_UUID\"}" \
  "Should reject non-existent session ID for cancel"

# ============================================================================
# TEST SUITE 3: Invalid SKUs/Products
# ============================================================================

echo ""
echo "📦 TEST SUITE 3: Invalid SKUs/Products"
echo "──────────────────────────────────────"

test "Create checkout with non-existent SKU" \
  404 \
  POST \
  "/create_checkout" \
  '{"items": [{"sku": "NONEXISTENT-SKU-12345", "quantity": 1}]}' \
  "Should reject non-existent SKU with 404 (not found)"

test "Create checkout with missing SKU and productId" \
  400 \
  POST \
  "/create_checkout" \
  '{"items": [{"quantity": 1}]}' \
  "Should reject item without SKU or productId"

# ============================================================================
# TEST SUITE 4: Session State Transitions
# ============================================================================

echo ""
echo "🔄 TEST SUITE 4: Session State Transitions"
echo "───────────────────────────────────────────"

# Create a valid checkout first
echo ""
echo "Creating test session for state transition tests..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/create_checkout" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: state-test-create-$(date +%s)" \
  -d "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"shippingAddress\": {\"line1\": \"123 Main\", \"city\": \"NYC\", \"postalCode\": \"10001\", \"country\": \"US\"}}")

SESSION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.sessionId' 2>/dev/null)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "null" ]; then
  echo "${RED}❌ Failed to create test session. Skipping state transition tests.${NC}"
  echo "Response: $CREATE_RESPONSE"
else
  echo "${GREEN}✅ Test session created: $SESSION_ID${NC}"
  
  # Cancel the session
  echo ""
  echo "Cancelling session for state tests..."
  curl -s -X POST "$BASE_URL/cancel_checkout" \
    -H 'Content-Type: application/json' \
    -H "Idempotency-Key: state-test-cancel-$(date +%s)" \
    -d "{\"sessionId\": \"$SESSION_ID\"}" > /dev/null
  
  test "Update cancelled session" \
    409 \
    POST \
    "/update_checkout" \
    "{\"sessionId\": \"$SESSION_ID\", \"shippingOption\": \"express\"}" \
    "Should reject updating cancelled session"
  
  test "Complete cancelled session" \
    409 \
    POST \
    "/complete_checkout" \
    "{\"sessionId\": \"$SESSION_ID\", \"email\": \"test@example.com\", \"sharedPaymentToken\": {\"provider\": \"paypal\", \"token\": \"FAKE123\"}}" \
    "Should reject completing cancelled session"
  
  test "Cancel already cancelled session" \
    200 \
    POST \
    "/cancel_checkout" \
    "{\"sessionId\": \"$SESSION_ID\"}" \
    "Should be idempotent (already cancelled returns success)"
fi

# ============================================================================
# TEST SUITE 5: Duplicate/Idempotency
# ============================================================================

echo ""
echo "🔄 TEST SUITE 5: Idempotency"
echo "────────────────────────────"

IDEMPOTENCY_KEY="idempotency-test-$(date +%s)"

echo ""
echo "Creating first request with idempotency key: $IDEMPOTENCY_KEY"
FIRST_RESPONSE=$(curl -s -X POST "$BASE_URL/create_checkout" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"shippingAddress\": {\"line1\": \"123 Main\", \"city\": \"NYC\", \"postalCode\": \"10001\", \"country\": \"US\"}}")

FIRST_SESSION_ID=$(echo "$FIRST_RESPONSE" | jq -r '.sessionId' 2>/dev/null)

echo "Creating second request with SAME idempotency key..."
SECOND_RESPONSE=$(curl -s -X POST "$BASE_URL/create_checkout" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"shippingAddress\": {\"line1\": \"123 Main\", \"city\": \"NYC\", \"postalCode\": \"10001\", \"country\": \"US\"}}")

SECOND_SESSION_ID=$(echo "$SECOND_RESPONSE" | jq -r '.sessionId' 2>/dev/null)

test_count=$((test_count + 1))
if [ "$FIRST_SESSION_ID" == "$SECOND_SESSION_ID" ] && [ ! -z "$FIRST_SESSION_ID" ]; then
  echo "${GREEN}✅ PASS${NC} - Idempotency: Same request returns same session ID"
  pass_count=$((pass_count + 1))
else
  echo "${RED}❌ FAIL${NC} - Idempotency: Different session IDs returned"
  echo "First: $FIRST_SESSION_ID"
  echo "Second: $SECOND_SESSION_ID"
  fail_count=$((fail_count + 1))
fi

# ============================================================================
# TEST SUITE 6: Invalid PayPal Tokens
# ============================================================================

echo ""
echo "💳 TEST SUITE 6: Invalid PayPal Tokens"
echo "───────────────────────────────────────"

# Create a fresh session for PayPal tests
CREATE_FOR_PAYPAL=$(curl -s -X POST "$BASE_URL/create_checkout" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: paypal-test-$(date +%s)" \
  -d "{\"items\": [{\"sku\": \"$SKU\", \"quantity\": 1}], \"shippingAddress\": {\"line1\": \"123 Main\", \"city\": \"NYC\", \"postalCode\": \"10001\", \"country\": \"US\"}}")

PAYPAL_SESSION_ID=$(echo "$CREATE_FOR_PAYPAL" | jq -r '.sessionId' 2>/dev/null)

if [ ! -z "$PAYPAL_SESSION_ID" ] && [ "$PAYPAL_SESSION_ID" != "null" ]; then
  test "Complete with fake PayPal token" \
    502 \
    POST \
    "/complete_checkout" \
    "{\"sessionId\": \"$PAYPAL_SESSION_ID\", \"email\": \"test@example.com\", \"sharedPaymentToken\": {\"provider\": \"paypal\", \"token\": \"FAKE-ORDER-ID-12345\"}}" \
    "Should fail with invalid PayPal order ID"
  
  test "Complete with too short PayPal token" \
    400 \
    POST \
    "/complete_checkout" \
    "{\"sessionId\": \"$PAYPAL_SESSION_ID\", \"email\": \"test@example.com\", \"sharedPaymentToken\": {\"provider\": \"paypal\", \"token\": \"AB\"}}" \
    "Should reject PayPal token shorter than 3 characters"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests: $test_count"
echo "${GREEN}Passed: $pass_count${NC}"
echo "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
  echo "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo "${RED}⚠️  Some tests failed. Review the output above.${NC}"
  exit 1
fi

