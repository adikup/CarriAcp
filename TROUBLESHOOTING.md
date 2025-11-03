# Troubleshooting: "Invalid sessionId" Error

## Problem
You're getting `{"code": "bad_request", "message": "Invalid sessionId"}` when calling `/complete_checkout`, even though you copied the sessionId from `/create_checkout`.

## Most Common Causes

### 1. Server Was Restarted ⚠️ (Most Likely)
**Issue**: Sessions are stored in **memory only**. If the server restarts between `create_checkout` and `complete_checkout`, all sessions are lost.

**Solution**: 
- Make sure the server stays running between steps
- **Run all steps in sequence without restarting the server**

### 2. Wrong SessionId Format
**Issue**: The sessionId must be a valid UUID format.

**Check**: Your sessionId should look like: `550e8400-e29b-41d4-a716-446655440000`

**Common mistakes**:
- Extra quotes: `"550e8400-e29b-41d4-a716-446655440000"` ❌
- Extra whitespace: ` 550e8400-e29b-41d4-a716-446655440000 ` ❌
- Missing characters or wrong format

**Solution**: Copy the sessionId exactly as returned, without quotes.

### 3. SessionId Not Saved Properly
**Issue**: The session might not have been created/saved correctly.

**Solution**: Check the debug endpoint (see below).

---

## Debug Steps

### Step 1: Check Active Sessions

After creating a checkout, immediately check what sessions exist:

```bash
curl http://localhost:8080/debug/sessions
```

**Expected Response**:
```json
{
  "count": 1,
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "awaiting_payment",
      "total": 8051
    }
  ]
}
```

**If count is 0**: The server restarted or the session wasn't created.

### Step 2: Verify Your Request Format

Make sure your `complete_checkout` request is correctly formatted:

```bash
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-001' \
  -d '{
    "sessionId": "YOUR_SESSION_ID_HERE",
    "email": "buyer@example.com",
    "sharedPaymentToken": {
      "provider": "paypal",
      "token": "YOUR_PAYPAL_ORDER_ID"
    }
  }'
```

**Important**: 
- Use single quotes `'` for the outer JSON in bash
- Use double quotes `"` for JSON field names and values
- No extra quotes around the sessionId value

### Step 3: Check Server Logs

When you try to complete checkout, the server will now log:
- The sessionId you provided
- All active session IDs in memory

Look at your server terminal output for these debug messages.

---

## Complete Test Flow (Do All Steps in One Session)

### 1. Start Server
```bash
npm run dev
```
**Keep this terminal window open!**

### 2. Create Checkout
```bash
curl -X POST http://localhost:8080/create_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-create-001' \
  -d '{
    "items": [{"sku": "YOUR-SKU", "quantity": 1}],
    "shippingAddress": {
      "line1": "123 Main St",
      "city": "NYC",
      "postalCode": "10001",
      "country": "US"
    }
  }' | jq .
```

**Copy the `sessionId` from the response.**

### 3. Verify Session Exists (NEW - Debug Step)
```bash
curl http://localhost:8080/debug/sessions | jq .
```

**You should see your sessionId in the list.**

### 4. Create PayPal Order
```bash
# Get PayPal token
PAYPAL_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)

# Create order (replace 80.51 with your total from step 2)
PAYPAL_ORDER_ID=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $PAYPAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "CAPTURE",
    "purchase_units": [{
      "amount": {"currency_code": "USD", "value": "80.51"}
    }]
  }' | jq -r .id)

echo "PayPal Order ID: $PAYPAL_ORDER_ID"
```

### 5. Complete Checkout (In Same Terminal Session)
```bash
# Replace with your actual sessionId and PayPal order ID
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-complete-001' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"email\": \"buyer@example.com\",
    \"sharedPaymentToken\": {
      \"provider\": \"paypal\",
      \"token\": \"$PAYPAL_ORDER_ID\"
    }
  }" | jq .
```

---

## Quick Fix: Test Everything in One Go

If you keep getting the error, try this complete test script:

```bash
#!/bin/bash

# Step 1: Create checkout
echo "Creating checkout..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/create_checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: test-'$(date +%s) \
  -d '{
    "items": [{"sku": "YOUR-SKU", "quantity": 1}],
    "shippingAddress": {
      "line1": "123 Main St",
      "city": "NYC",
      "postalCode": "10001",
      "country": "US"
    }
  }')

SESSION_ID=$(echo "$CREATE_RESPONSE" | jq -r .sessionId)
TOTAL=$(echo "$CREATE_RESPONSE" | jq -r .total)

echo "✅ Session ID: $SESSION_ID"
echo "✅ Total: $TOTAL cents"

# Step 2: Verify session exists
echo ""
echo "Checking active sessions..."
curl -s http://localhost:8080/debug/sessions | jq .

# Step 3: Get PayPal token and create order
echo ""
echo "Creating PayPal order..."
# ... (PayPal steps from above)

# Step 4: Complete checkout
echo ""
echo "Completing checkout..."
# ... (Complete checkout step)
```

---

## Still Not Working?

1. **Check server logs**: Look for the debug messages showing what sessionId was requested and what sessions exist
2. **Verify UUID format**: Your sessionId should match: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. **Test the debug endpoint**: Run `curl http://localhost:8080/debug/sessions` right after creating checkout
4. **Make sure server didn't restart**: Check if `npm run dev` is still running

If you still have issues, share:
- The sessionId you're using
- The response from `/debug/sessions`
- The server terminal output when you call `/complete_checkout`

