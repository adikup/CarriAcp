#!/bin/bash

# Helper script to get the approval URL for an existing PayPal order
# Usage: ./get-approval-url.sh <order_id>
# Example: ./get-approval-url.sh 1DD26435H21130108

if [ -z "$1" ]; then
  echo "❌ Error: PayPal Order ID required"
  echo "Usage: ./get-approval-url.sh <order_id>"
  echo "Example: ./get-approval-url.sh 1DD26435H21130108"
  exit 1
fi

ORDER_ID=$1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 Getting approval URL for order: $ORDER_ID"
echo ""

# Get access token
ACCESS_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

# Get order details
ORDER_RESPONSE=$(curl -s -X GET https://api-m.sandbox.paypal.com/v2/checkout/orders/$ORDER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

# Check for errors
ERROR=$(echo "$ORDER_RESPONSE" | jq -r '.error // empty' 2>/dev/null)
if [ ! -z "$ERROR" ]; then
  echo "❌ Error fetching order:"
  echo "$ORDER_RESPONSE" | jq .
  exit 1
fi

# Extract approval URL
APPROVE_URL=$(echo "$ORDER_RESPONSE" | jq -r '.links[] | select(.rel=="approve") | .href')
ORDER_STATUS=$(echo "$ORDER_RESPONSE" | jq -r '.status')

echo "Order Status: $ORDER_STATUS"
echo ""

if [ ! -z "$APPROVE_URL" ] && [ "$APPROVE_URL" != "null" ]; then
  echo "✅ Approval URL Found:"
  echo ""
  echo "   $APPROVE_URL"
  echo ""
  echo "📋 Steps:"
  echo "   1. Copy the URL above"
  echo "   2. Paste it into your browser"
  echo "   3. Log in with PayPal sandbox buyer account (or pay as guest)"
  echo "   4. Click 'Continue' to approve"
  echo "   5. After approval, run: ./check-paypal-order.sh $ORDER_ID"
  echo "   6. Then run your /complete_checkout with this order ID"
else
  echo "⚠️  No approval URL found for this order."
  echo ""
  if [ "$ORDER_STATUS" == "APPROVED" ]; then
    echo "   This order is already APPROVED. You can directly use it in /complete_checkout"
  elif [ "$ORDER_STATUS" == "COMPLETED" ]; then
    echo "   This order is already COMPLETED (already captured)."
  else
    echo "   Order status: $ORDER_STATUS"
    echo "   Check the order details below for more information."
  fi
fi

echo ""
echo "📋 Full Order Details:"
echo "$ORDER_RESPONSE" | jq .

