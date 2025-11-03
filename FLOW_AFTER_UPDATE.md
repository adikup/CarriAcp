# What to Do After `update_checkout`

## Complete Flow After Update Checkout

After calling `update_checkout`, you need to:

1. **Create PayPal Order** → Get PayPal Order ID
2. **Approve PayPal Payment** → Click approval URL in browser
3. **Complete Checkout** → Capture payment and create Shopify order

---

## Step 1: Create PayPal Order

After `update_checkout`, use the **`total`** from the response to create a PayPal order.

### Option A: Using Helper Script (Easiest)

```bash
# Use the total from update_checkout response (convert cents to dollars)
# Example: if total is 8951 cents, that's $89.51
./create-paypal-order.sh 89.51
```

This will give you:
- ✅ PayPal Order ID
- ✅ **Approval URL** (important!)

### Option B: Manual API Call

```bash
# Get PayPal access token
PAYPAL_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)

# Create PayPal order (replace 89.51 with your total in dollars)
PAYPAL_ORDER_ID=$(curl -s -X POST https://api-m.sandbox.paypal.com/v2/checkout/orders \
  -H "Authorization: Bearer $PAYPAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "CAPTURE",
    "purchase_units": [{
      "amount": {
        "currency_code": "USD",
        "value": "89.51"
      }
    }]
  }' | jq -r .id)

# Get approval URL
APPROVE_URL=$(curl -s -X GET https://api-m.sandbox.paypal.com/v2/checkout/orders/$PAYPAL_ORDER_ID \
  -H "Authorization: Bearer $PAYPAL_TOKEN" | jq -r '.links[] | select(.rel=="approve") | .href')

echo "Order ID: $PAYPAL_ORDER_ID"
echo "Approval URL: $APPROVE_URL"
```

---

## Step 2: Approve PayPal Payment

**Important**: You MUST approve the payment before calling `complete_checkout`.

1. **Copy the approval URL** from Step 1
2. **Open it in your browser**
3. **Log in** with PayPal sandbox buyer account (or pay as guest)
4. **Click "Continue" or "Approve"** to complete the approval

### Verify Approval

After approving, check the order status:

```bash
./check-paypal-order.sh YOUR_PAYPAL_ORDER_ID
```

Status should be **`APPROVED`** (not `CREATED`).

---

## Step 3: Complete Checkout

Now you can call `complete_checkout` with the PayPal Order ID:

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
  }'
```

**Replace**:
- `YOUR_SESSION_ID` → The sessionId from `create_checkout` or `update_checkout`
- `YOUR_PAYPAL_ORDER_ID` → The PayPal Order ID from Step 1

### Expected Response

```json
{
  "orderId": 1234567890,
  "shopifyOrderId": 1234567890,
  "status": "completed"
}
```

---

## Quick Reference: Full Flow

```
1. create_checkout
   ↓
2. update_checkout (optional)
   ↓
3. Create PayPal Order
   ↓
4. Approve PayPal Payment (in browser)
   ↓
5. complete_checkout ← FINAL STEP
```

---

## Important Notes

⚠️ **Must approve first**: You CANNOT call `complete_checkout` until the PayPal order is `APPROVED`.

⚠️ **Don't capture manually**: Don't use `test-capture.sh` between approval and `complete_checkout`. Let your backend handle the capture.

⚠️ **Use updated total**: Make sure to use the `total` from `update_checkout` response (not `create_checkout`) if you updated anything.

⚠️ **Session must match**: Use the same `sessionId` from `create_checkout` in `complete_checkout`.

---

## Example: Complete Sequence

```bash
# 1. Create checkout
SESSION_ID=$(curl -s -X POST http://localhost:8080/create_checkout \
  -H 'Content-Type: application/json' \
  -d '{"items":[...]}' | jq -r .sessionId)

# 2. Update checkout
UPDATED=$(curl -s -X POST http://localhost:8080/update_checkout \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\",\"shippingOption\":\"express\"}")

TOTAL=$(echo "$UPDATED" | jq -r .total)  # in cents
TOTAL_DOLLARS=$(echo "scale=2; $TOTAL / 100" | bc)

# 3. Create PayPal order
./create-paypal-order.sh $TOTAL_DOLLARS
# Copy the approval URL and PayPal Order ID

# 4. Approve in browser (open the approval URL)

# 5. Complete checkout
curl -X POST http://localhost:8080/complete_checkout \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"email\": \"buyer@example.com\",
    \"sharedPaymentToken\": {
      \"provider\": \"paypal\",
      \"token\": \"PAYPAL_ORDER_ID\"
    }
  }"
```

