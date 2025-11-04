# Production Quick Reference

## 🚨 Critical: PayPal Keys for Production

### What You Need

1. **Get Production PayPal Credentials**:
   ```
   https://developer.paypal.com/dashboard
   → Switch to "Live" (not Sandbox)
   → Create/Select Production App
   → Copy Client ID and Secret
   ```

2. **Set These Environment Variables**:
   ```bash
   PAYPAL_CLIENT_ID=your_production_client_id
   PAYPAL_CLIENT_SECRET=your_production_secret
   PAYPAL_BASE_URL=https://api-m.paypal.com  # ⚠️ NOT sandbox!
   ```

3. **Verify**:
   ```bash
   # Should use production URL, not sandbox
   echo $PAYPAL_BASE_URL
   # Output: https://api-m.paypal.com
   ```

---

## ✅ Complete Production Checklist

### Must Have
- [ ] **PayPal Production Credentials** (not sandbox)
- [ ] **PAYPAL_BASE_URL=https://api-m.paypal.com**
- [ ] **HTTPS enabled** (for OpenAI)
- [ ] **Health endpoint** working
- [ ] **Shopify credentials** valid

### Should Have
- [ ] **SHOPIFY_SKU_MAP** generated (for performance)
- [ ] **Monitoring** set up (Sentry, uptime monitor)
- [ ] **Error tracking** configured
- [ ] **Logs** accessible

### Nice to Have
- [ ] **Custom domain**
- [ ] **Metrics dashboard**
- [ ] **Alerting** configured

---

## 🔍 Quick Verification

```bash
# 1. Check PayPal is production
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.paypal.com/v1/oauth2/token | jq -r .access_token
# Should return token (if using production URL)

# 2. Check health
curl https://your-backend-url.com/health
# Should return: {"status":"ok"}

# 3. Test checkout
curl -X POST https://your-backend-url.com/create_checkout \
  -H 'Content-Type: application/json' \
  -d '{"items": [{"sku": "TEST", "quantity": 1}]}'
```

---

## 📋 Environment Variables Summary

### Required
```bash
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxx
PAYPAL_CLIENT_ID=production_client_id
PAYPAL_CLIENT_SECRET=production_secret
PAYPAL_BASE_URL=https://api-m.paypal.com  # ⚠️ Production!
```

### Recommended
```bash
SHOPIFY_SKU_MAP={"SKU1":1234567890}
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
LOG_LEVEL=info
```

### Optional
```bash
DEFAULT_CURRENCY=USD
PORT=8080
```

---

## ⚠️ Common Mistakes

1. **Using Sandbox in Production**
   - ❌ `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`
   - ✅ `PAYPAL_BASE_URL=https://api-m.paypal.com`

2. **Missing HTTPS**
   - OpenAI requires HTTPS
   - Most platforms provide this automatically

3. **Wrong PayPal Credentials**
   - Make sure you're using **Production** credentials
   - Not sandbox/test credentials

4. **CORS Not Configured**
   - Check `ALLOWED_ORIGINS` includes OpenAI domains

---

## 🆘 If Something Goes Wrong

1. **Check Logs**: Look for error messages
2. **Verify PayPal**: Test production credentials
3. **Check Health**: `curl /health`
4. **Review Environment Variables**: All required vars set?
5. **Test Endpoint**: Try creating a checkout manually

---

## 📚 Full Documentation

- **Production Checklist**: `PRODUCTION_CHECKLIST.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **OpenAI Integration**: `OPENAI_INTEGRATION.md`

