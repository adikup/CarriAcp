# Quick Start Guide - ACP Backend

This guide will help you:
1. **Run the ACP backend**
2. **Set up PayPal Sandbox account for testing**

---

## Part 1: Running the ACP Backend

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Create `.env` File

Create a `.env` file in the root directory with the following variables:

```bash
# Shopify Configuration
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_shopify_token
SHOPIFY_SKU_MAP={"SKU1":"variant-id-1","SKU2":"variant-id-2"}

# PayPal Configuration (Sandbox)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Optional
PORT=8080
DEFAULT_CURRENCY=USD
LOG_LEVEL=info
```

### Step 3: Run the Server

**For Development (with auto-reload):**
```bash
npm run dev
```

**For Production:**
```bash
npm run build
npm start
```

The server will start on port 8080 (or the PORT specified in your `.env`).

You should see:
```
ACP backend listening on :8080
```

### Step 4: Verify Server is Running

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{"status":"ok"}
```

---

## Part 2: Creating PayPal Sandbox Account for Testing

### Step 1: Create PayPal Developer Account

1. Go to **https://developer.paypal.com/**
2. Click **"Sign Up"** (or **"Log In"** if you already have an account)
3. Sign up using your PayPal account or create a new one

### Step 2: Create a Sandbox App

1. Once logged in, go to **Dashboard** → **My Apps & Credentials**
2. Scroll down to **"Sandbox"** section
3. Click **"Create App"**
4. Fill in:
   - **App Name**: `ACP Testing` (or any name you prefer)
   - **Merchant**: Select your sandbox business account (or create one)
5. Click **"Create App"**

### Step 3: Get Your Sandbox Credentials

After creating the app, you'll see:
- **Client ID**: Copy this value
- **Client Secret**: Click **"Show"** and copy this value

**Add these to your `.env` file:**
```bash
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
```

### Step 4: Create Sandbox Test Accounts (Optional)

To test the full payment flow, you may want to create buyer accounts:

1. Go to **Dashboard** → **Sandbox** → **Accounts**
2. Click **"Create Account"**
3. Select account type:
   - **Business** (for merchant testing)
   - **Personal** (for buyer testing)
4. Fill in account details (email, password, etc.)
5. Save the credentials for testing

### Step 5: Verify Sandbox Configuration

Test your PayPal credentials:

```bash
# Get PayPal access token (replace with your credentials)
PAYPAL_TOKEN=$(curl -s -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)

echo "Access Token: $PAYPAL_TOKEN"
```

If successful, you'll see an access token. If it fails, double-check your credentials.

---

## Part 3: Testing the Full Flow

See `TESTING.md` for detailed testing instructions, or run:

```bash
chmod +x test-endpoints.sh
./test-endpoints.sh
```

### Quick Test Flow:

1. **Create Checkout** → Get `sessionId`
2. **Update Checkout** (optional) → Modify shipping
3. **Create PayPal Order** → Get PayPal `orderId`
4. **Complete Checkout** → Use PayPal `orderId` as `sharedPaymentToken.token`

### Creating a PayPal Order for Testing:

```bash
# Step 1: Get access token
PAYPAL_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token | jq -r .access_token)

# Step 2: Create PayPal order (replace 80.51 with your checkout total in dollars)
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

**Note**: In production with OpenAI, OpenAI will create the PayPal order. For testing, you create it manually as shown above.

---

## Troubleshooting

### Server won't start
- ✅ Check that all required env variables are set in `.env`
- ✅ Check that port 8080 (or your PORT) is not already in use
- ✅ Run `npm install` to ensure dependencies are installed

### PayPal authentication fails
- ✅ Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env`
- ✅ Ensure you're using **Sandbox** credentials (not live/production)
- ✅ Check that `PAYPAL_BASE_URL` is set to `https://api-m.sandbox.paypal.com`

### Shopify connection fails
- ✅ Verify `SHOPIFY_SHOP` format: `your-shop.myshopify.com`
- ✅ Check `SHOPIFY_ADMIN_API_ACCESS_TOKEN` is valid
- ✅ Ensure SKU mappings in `SHOPIFY_SKU_MAP` are correct

---

## Next Steps

- 📖 Read `TESTING.md` for detailed testing procedures
- 📖 Read `ARCHITECTURE.md` for flow documentation
- 🔧 Configure your Shopify SKU mappings
- 🚀 Test the complete checkout flow

---

## Important Notes

- **Sandbox vs Production**: This setup uses PayPal **Sandbox** for testing. Switch to production by setting `PAYPAL_BASE_URL=https://api-m.paypal.com` (and using production credentials).
- **PayPal Order Creation**: In production, OpenAI will create PayPal orders. For testing, you create them manually using the API.
- **SKU Mapping**: Make sure `SHOPIFY_SKU_MAP` contains actual SKU-to-variant-ID mappings from your Shopify store.

