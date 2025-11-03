# ACP Backend Testing Guide

## Prerequisites

1. **Server is running**: `npm run dev` (should show "ACP backend listening on :8080")
2. **Environment variables set** in `.env`:
   - `SHOPIFY_SHOP`
   - `SHOPIFY_ADMIN_API_ACCESS_TOKEN`
   - `SHOPIFY_SKU_MAP` with at least one SKU mapping
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`

## Testing Flow Overview

```
1. Create Checkout → 2. Update Checkout → 3. Complete Checkout
                                   ↓
                            4. Cancel Checkout (optional, can happen at any stage)
```

---

## Step 1: Create Checkout

**Purpose**: Initialize a checkout session with products from your cart.

### Request

```bash
curl -X POST http://localhost:8080/create_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-create-001' \
  -d '{
    "items": [
      {
        "sku": "YOUR-SKU-HERE",
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "line1": "123 Main Street",
      "city": "New York",
      "postalCode": "10001",
      "country": "US"
    },
    "email": "buyer@example.com"
  }'
```

### Replace
- `YOUR-SKU-HERE` with an actual SKU from your `SHOPIFY_SKU_MAP`
- Adjust `quantity` as needed
- Update `shippingAddress` to any valid US address for testing

### Expected Response (Success)

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "currency": "USD",
  "subtotal": 6900,
  "shipping": 599,
  "tax": 552,
  "total": 8051,
  "shippingOptions": [
    {
      "id": "standard",
      "label": "Standard (5-7 days)",
      "amount": 599
    },
    {
      "id": "express",
      "label": "Express (2-3 days)",
      "amount": 1499
    }
  ],
  "status": "awaiting_payment"
}
```

**Note**: Amounts are in **cents** (e.g., 6900 = $69.00)

**Save the `sessionId`** - you'll need it for the next steps!

### Possible Errors

- `404`: SKU not found in `SHOPIFY_SKU_MAP` → Add SKU to your `.env`
- `409`: Item out of stock → Check Shopify inventory
- `400`: Invalid request format → Check JSON syntax

---

## Step 2: Update Checkout (Optional)

**Purpose**: Modify shipping address, shipping option, or items before completing.

### Request

```bash
curl -X POST http://localhost:8080/update_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-update-001' \
  -d '{
    "sessionId": "YOUR-SESSION-ID-FROM-STEP-1",
    "shippingOption": "express",
    "shippingAddress": {
      "line1": "456 Oak Avenue",
      "city": "Los Angeles",
      "postalCode": "90001",
      "country": "US"
    }
  }'
```

### Replace
- `YOUR-SESSION-ID-FROM-STEP-1` with the `sessionId` from Step 1

### Expected Response

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "currency": "USD",
  "subtotal": 6900,
  "shipping": 1499,
  "tax": 552,
  "total": 8951,
  "status": "awaiting_payment"
}
```

**Notice**: Shipping changed from 599 to 1499 (express), total updated accordingly.

---

## Step 3: Get PayPal Sandbox Order Token

**Before completing checkout, you need a PayPal sandbox order token.**

### Option A: Create PayPal Order via API

```bash
# Step 3a: Get PayPal Access Token
PAYPAL_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Access Token: $PAYPAL_TOKEN"

# Step 3b: Create a PayPal Order (replace TOTAL_AMOUNT with your total from Step 1/2, in dollars)
TOTAL_AMOUNT="80.51"  # Replace with your actual total in dollars

PAYPAL_ORDER_ID=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $PAYPAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"intent\": \"CAPTURE\",
    \"purchase_units\": [{
      \"amount\": {
        \"currency_code\": \"USD\",
        \"value\": \"$TOTAL_AMOUNT\"
      }
    }]
  }" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "PayPal Order ID: $PAYPAL_ORDER_ID"
```

**Save the `PAYPAL_ORDER_ID`** - this is your `sharedPaymentToken.token`

### Option B: Use PayPal Sandbox Tool

1. Go to https://developer.paypal.com/dashboard
2. Sandbox → Accounts → Create a test buyer account
3. Use PayPal's Checkout.js or REST API to create an order
4. Copy the order ID

---

## Step 4: Complete Checkout

**Purpose**: Finalize the order, capture PayPal payment, create Shopify order.

### Request

```bash
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-001' \
  -d '{
    "sessionId": "YOUR-SESSION-ID-FROM-STEP-1",
    "email": "buyer@example.com",
    "sharedPaymentToken": {
      "provider": "paypal",
      "token": "YOUR-PAYPAL-ORDER-ID-FROM-STEP-3"
    }
  }'
```

### Replace
- `YOUR-SESSION-ID-FROM-STEP-1` with your session ID
- `YOUR-PAYPAL-ORDER-ID-FROM-STEP-3` with the PayPal order ID from Step 3

### Expected Response (Success)

```json
{
  "orderId": 1234567890,
  "shopifyOrderId": 1234567890,
  "status": "completed"
}
```

**The Shopify order should now appear in your Shopify admin!**

### Possible Errors

- `502`: PayPal capture failed → Check PayPal order status, ensure it's in "APPROVED" state
- `409`: Inventory no longer available → Item went out of stock
- `400`: Invalid session → Session expired or doesn't exist

---

## Step 5: Cancel Checkout (Optional Test)

**Purpose**: Cancel a checkout session (can be done at any stage before completion).

### Request

```bash
curl -X POST http://localhost:8080/cancel_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-cancel-001' \
  -d '{
    "sessionId": "YOUR-SESSION-ID",
    "reason": "Customer changed mind"
  }'
```

### Expected Response

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled"
}
```

---

## Quick Test Script

Save this as `test-flow.sh` and run: `chmod +x test-flow.sh && ./test-flow.sh`

```bash
#!/bin/bash
BASE_URL="http://localhost:8080"

echo "Step 1: Create Checkout"
SESSION_RESPONSE=$(curl -s -X POST $BASE_URL/create_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-001' \
  -d '{
    "items": [{"sku": "YOUR-SKU-HERE", "quantity": 1}],
    "shippingAddress": {
      "line1": "123 Main St",
      "city": "NYC",
      "postalCode": "10001",
      "country": "US"
    }
  }')

echo "$SESSION_RESPONSE" | jq .
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r .sessionId)
echo "Session ID: $SESSION_ID"

echo -e "\nStep 2: Update Checkout"
curl -s -X POST $BASE_URL/update_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-002' \
  -d "{\"sessionId\": \"$SESSION_ID\", \"shippingOption\": \"express\"}" | jq .

echo -e "\nDone! Now get PayPal order ID from Step 3 above, then run Step 4."
```

---

## Verify Everything Worked

1. **Check Server Logs**: Look for successful requests in terminal
2. **Check Shopify Admin**: Orders → Should see new order
3. **Check PayPal Dashboard**: Transactions → Should see captured payment

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| SKU not found | Add to `SHOPIFY_SKU_MAP` in `.env` |
| PayPal 401 | Check `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` |
| Shopify 401 | Check `SHOPIFY_ADMIN_API_ACCESS_TOKEN` |
| Out of stock | Verify inventory in Shopify Admin |
| Session not found | Use sessionId from create_checkout response |

---

## Next Steps After Testing

1. **Production**: Switch PayPal to live mode (`PAYPAL_BASE_URL=https://api-m.paypal.com`)
2. **Deploy**: Deploy to Heroku/Vercel/Railway with environment variables
3. **Integrate**: Connect to OpenAI ChatGPT Merchants via ACP endpoints
4. **Monitor**: Add error tracking (Sentry, etc.) and monitoring

