#!/bin/bash

# Helper script to get PayPal access token
# Usage: ./get-paypal-token.sh

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔑 Getting PayPal Access Token..."
echo ""

# Get token
TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token)

# Check for errors
ERROR=$(echo "$TOKEN" | jq -r '.error // empty' 2>/dev/null)
if [ ! -z "$ERROR" ]; then
  echo "❌ Error: $ERROR"
  echo "$TOKEN" | jq .
  exit 1
fi

# Extract and display token
ACCESS_TOKEN=$(echo "$TOKEN" | jq -r '.access_token')
EXPIRES_IN=$(echo "$TOKEN" | jq -r '.expires_in')

echo "✅ Success!"
echo ""
echo "Access Token:"
echo "$ACCESS_TOKEN"
echo ""
echo "Expires in: $EXPIRES_IN seconds ($(($EXPIRES_IN / 3600)) hours)"
echo ""
echo "📋 Copy this token for use in creating PayPal orders:"
echo "export PAYPAL_TOKEN=\"$ACCESS_TOKEN\""

