# Complete Testing Guide - Postman & Terminal

This guide shows you how to test the **complete checkout flow** using both **Postman** and **Terminal**.

---

## Flow Overview

```
1. ✅ Create Checkout (you already did this)
2. ⬇️  Update Checkout (optional)
3. ⬇️  Get PayPal Token
4. ⬇️  Create PayPal Order
5. ⬇️  Complete Checkout (captures PayPal + creates Shopify order)
```

---

## Part 1: Get PayPal Access Token

### Option A: Using Postman ⭐ (Recommended for Visual Testing)

1. **Create New Request**
   - Method: `POST`
   - URL: `https://api-m.sandbox.paypal.com/v1/oauth2/token`

2. **Authorization Tab**
   - Type: `Basic Auth`
   - Username: Your `PAYPAL_CLIENT_ID` (from `.env`)
   - Password: Your `PAYPAL_CLIENT_SECRET` (from `.env`)

3. **Body Tab**
   - Select: `x-www-form-urlencoded`
   - Add one field:
     - Key: `grant_type`
     - Value: `client_credentials`

4. **Send**
   - You should get a response with `access_token`
   - **Copy the `access_token` value** - you'll need it for the next step

### Option B: Using Terminal

```bash
# Option 1: Use the helper script
./get-paypal-token.sh

# Option 2: Direct command
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq .
```

---

## Part 2: Create PayPal Order

### Option A: Using Postman ⭐

1. **Create New Request**
   - Method: `POST`
   - URL: `https://api-m.sandbox.paypal.com/v2/checkout/orders`

2. **Headers Tab**
   - Add two headers:
     - `Authorization`: `Bearer YOUR_ACCESS_TOKEN_FROM_STEP_1`
     - `Content-Type`: `application/json`

3. **Body Tab**
   - Select: `raw` → `JSON`
   - Use this body (replace `80.51` with your checkout total from Step 1):

```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "amount": {
        "currency_code": "USD",
        "value": "80.51"
      }
    }
  ]
}
```

4. **Send**
   - You'll get a response with an `id` field
   - **Copy the `id` value** - this is your PayPal Order ID

### Option B: Using Terminal

```bash
# Option 1: Use the helper script (easiest!)
./create-paypal-order.sh 80.51

# Option 2: Manual command
export PAYPAL_TOKEN="YOUR_ACCESS_TOKEN"
curl -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $PAYPAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "CAPTURE",
    "purchase_units": [{
      "amount": {
        "currency_code": "USD",
        "value": "80.51"
      }
    }]
  }' | jq .
```

**Important**: Replace `80.51` with the **actual total** from your `create_checkout` response (convert from cents to dollars).

---

## Part 3: Complete Checkout

Now use the PayPal Order ID you just created to complete the checkout.

### Option A: Using Postman ⭐

1. **Create New Request**
   - Method: `POST`
   - URL: `http://localhost:8080/complete_checkout`

2. **Headers Tab**
   - Add:
     - `Content-Type`: `application/json`
     - `Idempotency-Key`: `test-complete-001` (or any unique value)

3. **Body Tab**
   - Select: `raw` → `JSON`
   - Use this body (replace with your actual values):

```json
{
  "sessionId": "YOUR_SESSION_ID_FROM_CREATE_CHECKOUT",
  "email": "buyer@example.com",
  "sharedPaymentToken": {
    "provider": "paypal",
    "token": "YOUR_PAYPAL_ORDER_ID_FROM_STEP_2"
  }
}
```

4. **Send**
   - Success response should include:
     - `orderId`
     - `shopifyOrderId`
     - `status: "completed"`

### Option B: Using Terminal

```bash
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-001' \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "email": "buyer@example.com",
    "sharedPaymentToken": {
      "provider": "paypal",
      "token": "YOUR_PAYPAL_ORDER_ID"
    }
  }' | jq .
```

---

## Quick Test Script (All in One)

I've also created helper scripts for you:

```bash
# 1. Get PayPal token
./get-paypal-token.sh

# 2. Create PayPal order (replace 80.51 with your total)
./create-paypal-order.sh 80.51

# 3. Complete checkout (use the order ID from step 2)
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-001' \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "email": "buyer@example.com",
    "sharedPaymentToken": {
      "provider": "paypal",
      "token": "PAYPAL_ORDER_ID_FROM_STEP_2"
    }
  }'
```

---

## Complete Example Flow

Here's a complete example assuming you have:
- Session ID: `550e8400-e29b-41d4-a716-446655440000`
- Checkout Total: `$80.51` (8051 cents)

### Step 1: Get PayPal Token (Terminal)
```bash
export PAYPAL_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)
echo $PAYPAL_TOKEN
```

### Step 2: Create PayPal Order (Terminal)
```bash
PAYPAL_ORDER_ID=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $PAYPAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "CAPTURE",
    "purchase_units": [{
      "amount": {
        "currency_code": "USD",
        "value": "80.51"
      }
    }]
  }' | jq -r .id)

echo "PayPal Order ID: $PAYPAL_ORDER_ID"
```

### Step 3: Complete Checkout (Terminal or Postman)
```bash
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-001' \
  -d "{
    \"sessionId\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"email\": \"buyer@example.com\",
    \"sharedPaymentToken\": {
      \"provider\": \"paypal\",
      \"token\": \"$PAYPAL_ORDER_ID\"
    }
  }" | jq .
```

---

## Troubleshooting

### PayPal Token Request Fails
- ✅ Check that `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
- ✅ Ensure you're using **sandbox** credentials (not production)
- ✅ In Postman, make sure Basic Auth is set correctly

### PayPal Order Creation Fails
- ✅ Check that the access token is valid (not expired)
- ✅ Ensure the amount matches your checkout total
- ✅ Verify currency code is correct (USD)

### Complete Checkout Fails
- ✅ Check that PayPal Order ID is valid
- ✅ Ensure the session ID exists and is still valid
- ✅ Verify the PayPal order status is `CREATED` or `APPROVED`
- ✅ Check server logs for detailed error messages

---

## Summary

**Recommendation**: Use **Postman** for the PayPal API calls (token + order creation) since it's visual and easier to debug. Use **terminal** or **Postman** for your ACP endpoints (they're straightforward).

The complete flow:
1. ✅ Create Checkout (done)
2. 🔑 Get PayPal Token → Postman or `./get-paypal-token.sh`
3. 💳 Create PayPal Order → Postman or `./create-paypal-order.sh 80.51`
4. ✅ Complete Checkout → Postman or curl

