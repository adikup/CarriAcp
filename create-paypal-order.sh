#!/bin/bash

# Helper script to create a PayPal order
# Usage: ./create-paypal-order.sh <amount_in_dollars>
# Example: ./create-paypal-order.sh 80.51

if [ -z "$1" ]; then
  echo "❌ Error: Amount required"
  echo "Usage: ./create-paypal-order.sh <amount_in_dollars>"
  echo "Example: ./create-paypal-order.sh 80.51"
  exit 1
fi

AMOUNT=$1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "💳 Creating PayPal Order for \$$AMOUNT..."
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

# Create order
echo "Step 2: Creating PayPal order..."
ORDER_RESPONSE=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"intent\": \"CAPTURE\",
    \"purchase_units\": [{
      \"amount\": {
        \"currency_code\": \"USD\",
        \"value\": \"$AMOUNT\"
      }
    }]
  }")

# Check for errors
ERROR=$(echo "$ORDER_RESPONSE" | jq -r '.error // empty' 2>/dev/null)
if [ ! -z "$ERROR" ]; then
  echo "❌ Error creating order:"
  echo "$ORDER_RESPONSE" | jq .
  exit 1
fi

# Extract order ID and approval URL
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
ORDER_STATUS=$(echo "$ORDER_RESPONSE" | jq -r '.status')
APPROVE_URL=$(echo "$ORDER_RESPONSE" | jq -r '.links[] | select(.rel=="approve") | .href')

echo "✅ PayPal Order Created!"
echo ""
echo "Order ID: $ORDER_ID"
echo "Status: $ORDER_STATUS"
echo ""
echo "🔗 ⭐ IMPORTANT: Click this URL to approve payment:"
echo ""
if [ ! -z "$APPROVE_URL" ] && [ "$APPROVE_URL" != "null" ]; then
  echo "   $APPROVE_URL"
  echo ""
  echo "   💡 Copy and paste this URL into your browser to approve the payment!"
else
  echo "   ⚠️  No approval URL found in response"
fi
echo ""
echo "📋 After approval, use this Order ID in your complete_checkout request:"
echo "   \"sharedPaymentToken\": {"
echo "     \"provider\": \"paypal\","
echo "     \"token\": \"$ORDER_ID\""
echo "   }"
echo ""
echo "💡 Full order details:"
echo "$ORDER_RESPONSE" | jq .

