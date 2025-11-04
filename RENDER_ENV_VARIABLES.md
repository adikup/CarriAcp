# Environment Variables for Render Deployment

## 🔴 Required Variables (Must Add)

Add these in Render's Environment Variables section:

### Shopify
```
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### PayPal (PRODUCTION - ⚠️ Use Production Credentials!)
```
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_BASE_URL=https://api-m.paypal.com
```

**⚠️ Important**: Make sure you're using **PRODUCTION** PayPal credentials, not sandbox!

---

## 🟡 Recommended Variables (Should Add)

### Shopify SKU Map (for performance)
```
SHOPIFY_SKU_MAP={"SKU-260193KS":10035672711451,"SKU-4Z7JC97":10035672514843,...}
```

**Note**: Copy your entire SKU_MAP from `.env` as a single line JSON string.

### CORS (for OpenAI)
```
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
```

**Note**: This is optional since the code has defaults, but setting it explicitly is good practice.

---

## 🟢 Optional Variables (Can Skip or Add)

### Server Configuration
```
PORT=8080
```
**Note**: Render usually auto-sets PORT, but you can set it to 8080 if needed.

```
LOG_LEVEL=info
```
**Note**: Defaults to 'info' if not set.

### Currency
```
DEFAULT_CURRENCY=USD
```
**Note**: Defaults to 'USD' if not set, so you can skip this.

---

## ❌ Don't Add These

- `APP_BASE_URL` - Not used in the code, don't need to set it

---

## 📋 Quick Copy-Paste List for Render

Add these in Render's Environment Variables section:

### Minimum Required (5 variables):
```
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_BASE_URL=https://api-m.paypal.com
```

### Recommended (add these too):
```
SHOPIFY_SKU_MAP={"your":"sku","map":"here"}
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
LOG_LEVEL=info
```

---

## 🔍 How to Get Your Current Values

From your local `.env` file, copy these values:

```bash
# View your current values
grep -E "^SHOPIFY_SHOP|^SHOPIFY_ADMIN_API_ACCESS_TOKEN|^SHOPIFY_SKU_MAP" .env

# For PayPal, you'll need to get PRODUCTION credentials from:
# https://developer.paypal.com/dashboard (switch to Live mode)
```

---

## ⚠️ Important Notes

1. **PayPal Credentials**: Must be **PRODUCTION** credentials, not sandbox!
2. **PAYPAL_BASE_URL**: Must be `https://api-m.paypal.com` (not sandbox)
3. **SHOPIFY_SKU_MAP**: Copy the entire JSON as one line (no newlines)
4. **Security**: Never commit these values to Git

---

## 📝 Step-by-Step in Render

1. Go to your Web Service in Render
2. Click on **"Environment"** in the left sidebar
3. Click **"Add Environment Variable"**
4. Add each variable:
   - **Key**: `SHOPIFY_SHOP`
   - **Value**: `your-shop.myshopify.com`
   - Click **"Save"**
5. Repeat for all variables above
6. After adding all variables, Render will automatically redeploy

---

## ✅ Verification

After deployment, test:

```bash
curl https://your-app.onrender.com/health
# Should return: {"status":"ok"}
```

