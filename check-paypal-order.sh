#!/bin/bash

# Helper script to check PayPal order status
# Usage: ./check-paypal-order.sh <order_id>
# Example: ./check-paypal-order.sh 30L87565J5495470H

if [ -z "$1" ]; then
  echo "❌ Error: PayPal Order ID required"
  echo "Usage: ./check-paypal-order.sh <order_id>"
  echo "Example: ./check-paypal-order.sh 30L87565J5495470H"
  exit 1
fi

ORDER_ID=$1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 Checking PayPal Order Status..."
echo "Order ID: $ORDER_ID"
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

# Get order details
echo "Step 2: Fetching order details..."
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

# Extract status
ORDER_STATUS=$(echo "$ORDER_RESPONSE" | jq -r '.status')
INTENT=$(echo "$ORDER_RESPONSE" | jq -r '.intent')
AMOUNT=$(echo "$ORDER_RESPONSE" | jq -r '.purchase_units[0].amount.value')

echo "📊 Order Details:"
echo "   Status: $ORDER_STATUS"
echo "   Intent: $INTENT"
echo "   Amount: \$$AMOUNT"
echo ""

# Status interpretation
case $ORDER_STATUS in
  "CREATED")
    echo "ℹ️  Order created but NOT approved yet."
    echo "   ➡️  You need to approve the order on the PayPal page first."
    echo "   ➡️  Look for an 'approve' link in the order details below."
    ;;
  "APPROVED")
    echo "✅ Order is APPROVED and ready to capture!"
    echo "   ➡️  You can now call /complete_checkout with this order ID."
    ;;
  "COMPLETED")
    echo "✅ Order is already COMPLETED (already captured)."
    echo "   ➡️  This order has been processed."
    ;;
  "CANCELLED")
    echo "❌ Order was CANCELLED."
    echo "   ➡️  You'll need to create a new order."
    ;;
  *)
    echo "ℹ️  Order status: $ORDER_STATUS"
    ;;
esac

echo ""
echo "🔗 Approval Link (if status is CREATED):"
APPROVE_URL=$(echo "$ORDER_RESPONSE" | jq -r '.links[] | select(.rel=="approve") | .href')
if [ ! -z "$APPROVE_URL" ] && [ "$APPROVE_URL" != "null" ]; then
  echo "   $APPROVE_URL"
  echo ""
  echo "   💡 Copy this URL and open it in your browser to approve the payment."
else
  echo "   (No approval link - order may already be approved or cancelled)"
fi

echo ""
echo "📋 Full Order Details:"
echo "$ORDER_RESPONSE" | jq .

