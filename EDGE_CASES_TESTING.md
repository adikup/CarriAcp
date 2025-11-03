# Edge Cases Testing Guide

## Overview

This document covers all edge cases that have been tested and fixed in the ACP checkout system.

## Test Suite

Run the comprehensive edge case tests:

```bash
# Make sure your server is running first
npm run dev

# In another terminal, run the tests
./test-edge-cases.sh
```

## Edge Cases Tested

### ✅ 1. Invalid Inputs - create_checkout

- **Empty items array** → Returns 400
- **Missing items field** → Returns 400
- **Invalid quantity (zero)** → Returns 400
- **Invalid quantity (negative)** → Returns 400
- **Invalid quantity (decimal)** → Returns 400
- **Invalid email format** → Returns 400
- **Invalid country code (too short)** → Returns 400
- **Invalid country code (too long)** → Returns 400

### ✅ 2. Invalid Session IDs

- **Update with non-existent session ID** → Returns 400
- **Update with invalid UUID format** → Returns 400
- **Complete with non-existent session ID** → Returns 400
- **Cancel with non-existent session ID** → Returns 400

### ✅ 3. Invalid SKUs/Products

- **Create checkout with non-existent SKU** → Returns 400
- **Create checkout with missing SKU and productId** → Returns 400

### ✅ 4. Session State Transitions

- **Update cancelled session** → Returns 409 (Conflict)
- **Complete cancelled session** → Returns 409 (Conflict) ✅ Fixed
- **Cancel already cancelled session** → Returns 200 (Idempotent) ✅ Fixed
- **Cancel completed session** → Returns 409 (Conflict) ✅ Fixed

### ✅ 5. Idempotency

- **Duplicate requests with same idempotency key** → Returns same session ID

### ✅ 6. Invalid PayPal Tokens

- **Complete with fake PayPal order ID** → Returns 502 (Upstream Error)
- **Complete with too short PayPal token** → Returns 400 (Validation Error)

## Code Fixes Applied

### Fix 1: Prevent Completing Cancelled Sessions
**File**: `src/services/checkout.ts`
- Added check to reject completing cancelled sessions with 409 Conflict error

```typescript
if (session.status === 'cancelled') {
  throw new ConflictError('Cannot complete a cancelled session');
}
```

### Fix 2: Prevent Canceling Completed Sessions
**File**: `src/services/checkout.ts`
- Added check to reject canceling completed sessions with 409 Conflict error
- Made cancel idempotent (can cancel already-cancelled session without error)

```typescript
if (session.status === 'completed') {
  throw new ConflictError('Cannot cancel a completed session');
}
if (session.status === 'cancelled') {
  // Idempotent: already cancelled, return success
  return { sessionId: session.id, status: 'cancelled' };
}
```

## Expected Behavior by Session Status

| Session Status | Update | Complete | Cancel |
|---------------|--------|----------|--------|
| `draft` | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `awaiting_payment` | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `completed` | ❌ 409 Conflict | ✅ Returns existing order | ❌ 409 Conflict |
| `cancelled` | ❌ 409 Conflict | ❌ 409 Conflict | ✅ 200 (idempotent) |

## Test Results Interpretation

After running `./test-edge-cases.sh`:

- ✅ **Green PASS**: Test passed as expected
- ❌ **Red FAIL**: Test failed - unexpected behavior
- ⚠️  **Yellow warnings**: Informational messages

## Manual Testing Scenarios

If you want to test manually:

### Test 1: Cancel then Complete
```bash
# Create checkout
SESSION_ID=$(curl -s -X POST http://localhost:8080/create_checkout ... | jq -r .sessionId)

# Cancel it
curl -X POST http://localhost:8080/cancel_checkout \
  -d "{\"sessionId\": \"$SESSION_ID\"}"

# Try to complete (should fail with 409)
curl -X POST http://localhost:8080/complete_checkout \
  -d "{\"sessionId\": \"$SESSION_ID\", ...}"
```

### Test 2: Complete Already Completed
```bash
# Complete checkout first time
curl -X POST http://localhost:8080/complete_checkout ...

# Complete again (should return same order, not error)
curl -X POST http://localhost:8080/complete_checkout ...
```

### Test 3: Invalid Inputs
```bash
# Try with zero quantity
curl -X POST http://localhost:8080/create_checkout \
  -d '{"items": [{"sku": "TEST", "quantity": 0}]}'
# Should return 400
```

## Continuous Testing

For CI/CD integration, you can run tests non-interactively:

```bash
./test-edge-cases.sh > test-results.log 2>&1
```

Check exit code:
- `0` = All tests passed
- `1` = Some tests failed

## Known Limitations

1. **Out of Stock**: Testing requires actual Shopify inventory, which may vary
2. **PayPal Sandbox**: Invalid PayPal tokens depend on PayPal API responses
3. **Session Expiration**: Currently sessions don't expire (stored in memory)

## Future Enhancements

- [ ] Add session expiration/TTL
- [ ] Add rate limiting tests
- [ ] Add concurrent request tests
- [ ] Add stress/load testing
- [ ] Add integration tests with real Shopify/PayPal

