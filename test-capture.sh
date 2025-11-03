#!/bin/bash

# Test script to directly capture a PayPal order
# Usage: ./test-capture.sh <order_id>
# Example: ./test-capture.sh 1DD26435H21130108

if [ -z "$1" ]; then
  echo "❌ Error: PayPal Order ID required"
  echo "Usage: ./test-capture.sh <order_id>"
  exit 1
fi

ORDER_ID=$1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 Testing direct capture for order: $ORDER_ID"
echo ""

# Get access token
echo "Step 1: Getting access token..."
ACCESS_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

echo "✅ Token obtained"
echo ""

# Check order status first
echo "Step 2: Checking order status..."
ORDER_STATUS_RESPONSE=$(curl -s -X GET https://api-m.sandbox.paypal.com/v2/checkout/orders/$ORDER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

STATUS=$(echo "$ORDER_STATUS_RESPONSE" | jq -r '.status')
echo "   Current Status: $STATUS"
echo ""

if [ "$STATUS" != "APPROVED" ]; then
  echo "⚠️  Warning: Order status is $STATUS, not APPROVED"
  echo "   It should be APPROVED to capture. Continuing anyway..."
  echo ""
fi

# Attempt capture
echo "Step 3: Attempting to capture order..."
CAPTURE_RESPONSE=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders/$ORDER_ID/capture \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

# Check for errors
ERROR=$(echo "$CAPTURE_RESPONSE" | jq -r '.error // empty' 2>/dev/null)
if [ ! -z "$ERROR" ]; then
  echo "❌ Capture failed:"
  echo "$CAPTURE_RESPONSE" | jq .
  exit 1
fi

# Check response status
CAPTURE_STATUS=$(echo "$CAPTURE_RESPONSE" | jq -r '.status')
if [ "$CAPTURE_STATUS" == "COMPLETED" ]; then
  echo "✅ Capture successful!"
  echo ""
  echo "📋 Capture Details:"
  echo "$CAPTURE_RESPONSE" | jq .
else
  echo "⚠️  Capture response status: $CAPTURE_STATUS"
  echo ""
  echo "📋 Full Response:"
  echo "$CAPTURE_RESPONSE" | jq .
fi

