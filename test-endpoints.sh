#!/bin/bash

# ACP Backend Endpoint Testing Script
# Make sure your server is running: npm run dev

BASE_URL="http://localhost:8080"
SKU="YOUR-SKU-HERE"  # Replace with your actual SKU from SHOPIFY_SKU_MAP

echo "🧪 Testing ACP Backend Endpoints"
echo "================================"
echo ""

# Step 1: Create Checkout
echo "📦 Step 1: Creating checkout session..."
echo ""

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/create_checkout" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-create-'$(date +%s) \
  -d "{
    \"items\": [
      {
        \"sku\": \"$SKU\",
        \"quantity\": 1
      }
    ],
    \"shippingAddress\": {
      \"line1\": \"123 Main Street\",
      \"city\": \"New York\",
      \"postalCode\": \"10001\",
      \"country\": \"US\"
    },
    \"email\": \"buyer@example.com\"
  }")

echo "Response:"
echo "$CREATE_RESPONSE" | jq . 2>/dev/null || echo "$CREATE_RESPONSE"
echo ""

SESSION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.sessionId' 2>/dev/null)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "null" ]; then
  echo "❌ Failed to create checkout session. Check your SKU and Shopify config."
  exit 1
fi

echo "✅ Checkout created! Session ID: $SESSION_ID"
echo ""

# Step 2: Update Checkout
read -p "Press Enter to test update_checkout, or Ctrl+C to skip..."
echo ""
echo "✏️  Step 2: Updating checkout (express shipping)..."
echo ""

UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/update_checkout" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-update-'$(date +%s) \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"shippingOption\": \"express\"
  }")

echo "Response:"
echo "$UPDATE_RESPONSE" | jq . 2>/dev/null || echo "$UPDATE_RESPONSE"
echo ""

echo "✅ Checkout updated!"
echo ""

# Step 3: Get PayPal Token
read -p "Press Enter to test complete_checkout, or Ctrl+C to skip..."
echo ""
echo "💳 Step 3: To complete checkout, you need a PayPal order ID."
echo "   Run these commands to get one:"
echo ""
echo "   # Get PayPal access token"
echo "   PAYPAL_TOKEN=\$(curl -s -u \"\$PAYPAL_CLIENT_ID:\$PAYPAL_CLIENT_SECRET\" \\"
echo "     -d \"grant_type=client_credentials\" \\"
echo "     https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)"
echo ""
echo "   # Create PayPal order (replace 80.51 with your actual total in dollars)"
echo "   PAYPAL_ORDER_ID=\$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \\"
echo "     -H \"Authorization: Bearer \$PAYPAL_TOKEN\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"intent\":\"CAPTURE\",\"purchase_units\":[{\"amount\":{\"currency_code\":\"USD\",\"value\":\"80.51\"}}]}' | jq -r .id)"
echo ""
echo "   # Use the PAYPAL_ORDER_ID in the next step"
echo ""

read -p "Enter your PayPal Order ID (or press Enter to skip): " PAYPAL_ORDER_ID

if [ -z "$PAYPAL_ORDER_ID" ]; then
  echo "Skipping complete_checkout test."
  exit 0
fi

echo ""
echo "✅ Step 4: Completing checkout with PayPal..."
echo ""

COMPLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/complete_checkout" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-'$(date +%s) \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"email\": \"buyer@example.com\",
    \"sharedPaymentToken\": {
      \"provider\": \"paypal\",
      \"token\": \"$PAYPAL_ORDER_ID\"
    }
  }")

echo "Response:"
echo "$COMPLETE_RESPONSE" | jq . 2>/dev/null || echo "$COMPLETE_RESPONSE"
echo ""

if echo "$COMPLETE_RESPONSE" | jq -e '.orderId' > /dev/null 2>&1; then
  ORDER_ID=$(echo "$COMPLETE_RESPONSE" | jq -r '.orderId')
  echo "✅ Order completed! Shopify Order ID: $ORDER_ID"
  echo "   Check your Shopify admin to see the new order."
else
  echo "❌ Order completion may have failed. Check the response above."
fi

echo ""
echo "🎉 Testing complete!"

