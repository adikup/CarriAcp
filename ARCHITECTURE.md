# ACP Backend Architecture - PayPal Flow

## Production Flow (with OpenAI ChatGPT Merchants)

```
┌─────────────┐
│   Customer  │
│  (ChatGPT)  │
└──────┬───────┘
       │
       │ 1. Browses products, adds to cart
       ▼
┌─────────────────┐
│  OpenAI/ACP     │
│  (Frontend)     │
└────────┬────────┘
         │
         │ 2. POST /create_checkout
         │    { items: [...], shippingAddress: {...} }
         ▼
┌─────────────────┐
│  Your Backend   │
│  /create_checkout│
└────────┬────────┘
         │
         │ 3. Returns { sessionId, total, currency, ... }
         ▼
┌─────────────────┐
│  OpenAI/ACP     │
└────────┬────────┘
         │
         │ 4. OpenAI creates PayPal Order
         │    (using PayPal SDK/Checkout on OpenAI's side)
         │    Customer approves payment in PayPal UI
         │
         │ 5. POST /complete_checkout
         │    {
         │      sessionId: "...",
         │      sharedPaymentToken: {
         │        provider: "paypal",
         │        token: "PAYPAL_ORDER_ID"  ← OpenAI provides this
         │      },
         │      email: "..."
         │    }
         ▼
┌─────────────────┐
│  Your Backend   │
│ /complete_checkout│
└────────┬────────┘
         │
         │ 6. Capture PayPal order (using token)
         │ 7. Create Shopify order
         │
         │ 8. Returns { orderId, shopifyOrderId, status: "completed" }
         ▼
┌─────────────────┐
│  OpenAI/ACP     │
│  Shows confirmation to customer
└─────────────────┘
```

## Key Points

### ✅ What Your Backend Does:
- **Provides totals** (`/create_checkout`)
- **Captures PayPal payments** (when OpenAI sends token)
- **Creates Shopify orders**
- **Validates inventory/pricing**

### ❌ What Your Backend Does NOT Do:
- ❌ Create PayPal orders (OpenAI does this)
- ❌ Show PayPal UI to customers (OpenAI does this)
- ❌ Handle PayPal redirects (OpenAI does this)

## Testing Flow (Manual)

When testing without OpenAI:

1. You manually create a PayPal order using PayPal API
2. You use that order ID as the `sharedPaymentToken.token`
3. Your backend captures it (same as production

This simulates exactly what OpenAI will do in production.

## PayPal Token Format

Based on ACP spec, `sharedPaymentToken.token` should be:
- **For PayPal**: The PayPal Order ID (e.g., `"5O190127TN364715T"`)
- Your backend captures this order using: `POST /v2/checkout/orders/{order_id}/capture`

## Current Implementation Status

✅ **Correct**: Your `captureWithSharedToken()` function:
- Takes the token as a PayPal Order ID
- Captures the order using PayPal API
- Returns capture status

This matches the expected ACP behavior.

## Potential Adjustments

If OpenAI's SharedPaymentToken format differs, you might need to:
1. Parse different token formats
2. Handle authorization vs capture differently
3. Support multiple payment providers (if OpenAI adds them)

But for now, treating it as a PayPal Order ID is correct per ACP spec.

