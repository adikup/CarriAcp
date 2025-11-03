# Fixed: PayPal Capture Issue

## Problem Identified

1. **Order was already captured**: Your order `1DD26435H21130108` was successfully captured (status: COMPLETED), but the code tried to capture it again, causing a 422 error.

2. **Multiple order IDs in errors**: The error messages showed different order IDs (`30L87565J5495470H`, `17A62432KH343834N`), suggesting you may have tested with multiple orders or there was some confusion.

## Fixes Applied

✅ **Handle already-completed orders**: The code now checks if an order is already COMPLETED and returns it instead of trying to capture again.

✅ **Better logging**: Added detailed logging to track:
   - Which order ID is being used
   - Order status before capture
   - Any errors during the process

✅ **Improved error messages**: More helpful error messages showing the actual order status.

## Testing

Direct capture test shows order `1DD26435H21130108` works perfectly:
```bash
./test-capture.sh 1DD26435H21130108
# ✅ Result: COMPLETED successfully
```

## Next Steps

### Option 1: Use the Already-Captured Order

Your order `1DD26435H21130108` is already captured. Try calling `/complete_checkout` again - it should now work because the code handles already-completed orders.

### Option 2: Create a New Order

If you want to test the full flow from scratch:

1. **Create a new checkout session**
2. **Create a new PayPal order**:
   ```bash
   ./create-paypal-order.sh 80.51
   ```
   This will give you:
   - A new Order ID
   - An approval URL
3. **Approve the payment** (click the approval URL)
4. **Complete checkout immediately** (before the order gets captured elsewhere)

## Important Notes

- **Don't capture orders manually**: Once you approve a PayPal order, don't capture it manually (via `test-capture.sh` or API). Let your `/complete_checkout` endpoint handle it.

- **One order = one capture**: Each PayPal order can only be captured once. After capture, status becomes COMPLETED.

- **Check server logs**: The new logging will help debug any future issues. Look for lines starting with `[paypal.capture]` and `[complete_checkout]`.

## Current Order Status

Order `1DD26435H21130108`:
- ✅ Status: COMPLETED (already captured)
- ✅ Amount: $16.06
- ✅ Capture ID: 9TG86446S94009429

You can now use this in `/complete_checkout` and it should work!

