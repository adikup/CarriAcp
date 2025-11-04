# Production Environment Variables - What Stays the Same

## ✅ Variables That Stay the Same in Production

### PORT
```bash
PORT=8080
```
- **Keep this as `8080`** or let your hosting platform auto-set it
- Most platforms (Railway, Render, Fly.io) automatically set PORT
- If they set it, you can omit this variable

### APP_BASE_URL (Optional)
```bash
APP_BASE_URL=http://localhost:8080
```
- **Not used in the code**, so it doesn't matter what it's set to
- Can stay as `localhost` or update to your production URL
- Only included for future reference/documentation

## ⚠️ Variables That MUST Change for Production

### PayPal
```bash
# ❌ SANDBOX (Development)
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# ✅ PRODUCTION (Must Change!)
PAYPAL_BASE_URL=https://api-m.paypal.com
PAYPAL_CLIENT_ID=your_production_client_id  # Get from PayPal dashboard (Live mode)
PAYPAL_CLIENT_SECRET=your_production_secret  # Get from PayPal dashboard (Live mode)
```

### CORS (Recommended to Update)
```bash
# Development
ALLOWED_ORIGINS=http://localhost:3000

# Production (Add OpenAI domains)
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
```

## 📋 Production Environment Variables Summary

### Must Have (Same or Different)
- `SHOPIFY_SHOP` - Same (your shop domain)
- `SHOPIFY_ADMIN_API_ACCESS_TOKEN` - Same (your token)
- `SHOPIFY_SKU_MAP` - Same (your SKU mappings)
- `PORT` - Same (`8080` or auto-set by platform)
- `LOG_LEVEL` - Same (`info` for production)

### Must Change
- `PAYPAL_BASE_URL` - **MUST CHANGE** to `https://api-m.paypal.com`
- `PAYPAL_CLIENT_ID` - **MUST CHANGE** to production credentials
- `PAYPAL_CLIENT_SECRET` - **MUST CHANGE** to production credentials

### Optional/Can Stay Same
- `APP_BASE_URL` - Not used, can stay as `localhost`
- `DEFAULT_CURRENCY` - Same (`USD`)
- `ALLOWED_ORIGINS` - Should update to include OpenAI domains

## Quick Reference

| Variable | Development | Production | Action |
|----------|-------------|------------|--------|
| `PORT` | `8080` | `8080` | ✅ Keep same |
| `APP_BASE_URL` | `localhost:8080` | `localhost:8080` | ✅ Keep same (not used) |
| `PAYPAL_BASE_URL` | `sandbox` | `api-m.paypal.com` | ⚠️ **MUST CHANGE** |
| `PAYPAL_CLIENT_ID` | Sandbox ID | Production ID | ⚠️ **MUST CHANGE** |
| `PAYPAL_CLIENT_SECRET` | Sandbox secret | Production secret | ⚠️ **MUST CHANGE** |
| `ALLOWED_ORIGINS` | `localhost` | OpenAI domains | 📝 Should update |

## Summary

**Keep the same:**
- ✅ `PORT=8080`
- ✅ `APP_BASE_URL=http://localhost:8080` (not used, but can keep)

**Must change:**
- ⚠️ PayPal credentials and URL

**Should update:**
- 📝 `ALLOWED_ORIGINS` to include OpenAI domains

