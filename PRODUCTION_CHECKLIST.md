# Production Checklist

Complete checklist of everything you need before going live.

## ✅ Critical: PayPal Configuration

### Current Status
- **Sandbox**: Currently using `https://api-m.sandbox.paypal.com`
- **Production**: Need to switch to `https://api-m.paypal.com`

### What You Need to Do

1. **Get PayPal Production Credentials**:
   - Go to https://developer.paypal.com/dashboard
   - **Switch from Sandbox to Live** (top toggle)
   - Create a new app or use existing production app
   - Copy **Client ID** and **Client Secret**

2. **Update Environment Variables**:
   ```bash
   # Change from sandbox to production:
   PAYPAL_CLIENT_ID=your_production_client_id
   PAYPAL_CLIENT_SECRET=your_production_client_secret
   PAYPAL_BASE_URL=https://api-m.paypal.com  # ⚠️ CRITICAL: Change from sandbox
   ```

3. **Test Production Credentials**:
   ```bash
   # Test production token
   PAYPAL_TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
     -d "grant_type=client_credentials" \
     https://api-m.paypal.com/v1/oauth2/token | jq -r .access_token)
   
   echo "Token: $PAYPAL_TOKEN"
   # Should return a valid token
   ```

⚠️ **IMPORTANT**: 
- Test with a **small real transaction** first
- Never use sandbox credentials in production
- Keep production credentials secure

---

## ✅ Required Environment Variables

### Shopify
- [ ] `SHOPIFY_SHOP` - Your shop domain (e.g., `your-shop.myshopify.com`)
- [ ] `SHOPIFY_ADMIN_API_ACCESS_TOKEN` - Production API token
- [ ] `SHOPIFY_SKU_MAP` - Optional but recommended (see SKU_MAP_GUIDE.md)

### PayPal (Production)
- [ ] `PAYPAL_CLIENT_ID` - **Production** client ID (not sandbox)
- [ ] `PAYPAL_CLIENT_SECRET` - **Production** client secret (not sandbox)
- [ ] `PAYPAL_BASE_URL` - Must be `https://api-m.paypal.com` (not sandbox)

### Server
- [ ] `PORT` - Usually auto-set by hosting platform (8080 default)
- [ ] `LOG_LEVEL` - `info` for production, `debug` for development

### CORS
- [ ] `ALLOWED_ORIGINS` - Comma-separated list (e.g., `https://chat.openai.com,https://chatgpt.com`)

### Optional
- [ ] `DEFAULT_CURRENCY` - Defaults to `USD` if not set

---

## ✅ Security & Infrastructure

### HTTPS
- [ ] **HTTPS is enabled** (required for OpenAI)
- Most platforms (Railway, Render, Fly.io) provide this automatically
- Verify: `curl https://your-backend-url.com/health`

### CORS
- [ ] **CORS configured** for OpenAI domains ✅ (Already done)
- Check `ALLOWED_ORIGINS` environment variable

### Rate Limiting
- [ ] **Rate limiting enabled** ✅ (60 requests/minute)
- Adjust if needed for your traffic

### Secrets Management
- [ ] **Environment variables** set in hosting platform (not in code)
- [ ] **No secrets in Git** (check `.gitignore` includes `.env`)
- [ ] **Credentials rotated** regularly

---

## ✅ Monitoring & Observability

### Health Check
- [ ] **Health endpoint working**: `GET /health`
- OpenAI will monitor this

### Logging
- [ ] **Structured logging** enabled ✅ (Pino)
- [ ] **Log level** set appropriately (`info` for production)
- [ ] **Logs accessible** (via hosting platform or external service)

### Error Tracking (Recommended)
- [ ] **Sentry** or similar error tracking service
- [ ] **Uptime monitoring** (UptimeRobot, Pingdom, etc.)
- [ ] **Alerting** configured for critical errors

### Metrics (Optional but Recommended)
- [ ] **Request metrics** (response times, error rates)
- [ ] **Business metrics** (orders created, revenue)
- [ ] **PayPal API metrics** (capture success rate)

---

## ✅ Testing & Validation

### End-to-End Testing
- [ ] **Test complete checkout flow** in production (with real PayPal, small amount)
- [ ] **Verify Shopify orders** are created correctly
- [ ] **Test error handling** (invalid SKUs, out of stock, etc.)

### API Testing
- [ ] **All endpoints tested**:
  - [ ] `GET /health`
  - [ ] `POST /create_checkout`
  - [ ] `POST /update_checkout`
  - [ ] `POST /complete_checkout`
  - [ ] `POST /cancel_checkout`

### PayPal Testing
- [ ] **Production PayPal credentials** tested
- [ ] **Real payment captured** successfully
- [ ] **Order appears in PayPal dashboard**

### Shopify Testing
- [ ] **Orders appear in Shopify admin**
- [ ] **Order details correct** (items, shipping, totals)
- [ ] **Inventory updated** correctly

---

## ✅ Deployment

### Platform Setup
- [ ] **Hosting platform** chosen and configured
- [ ] **Environment variables** set
- [ ] **Build process** working (`npm run build`)
- [ ] **Start command** working (`npm start`)
- [ ] **Auto-deploy** configured (if using Git)

### DNS & Domain
- [ ] **Backend URL** accessible (HTTPS)
- [ ] **Custom domain** configured (if using)
- [ ] **SSL certificate** valid

### Backup & Recovery
- [ ] **Database backup** (if using database)
- [ ] **Environment backup** (export env vars)
- [ ] **Disaster recovery plan**

---

## ✅ OpenAI Integration

### Application
- [ ] **Applied to OpenAI merchant program**
- [ ] **Backend URL provided** to OpenAI
- [ ] **Approval received** from OpenAI

### Configuration
- [ ] **API endpoints** documented for OpenAI
- [ ] **Health endpoint** responding
- [ ] **CORS** allows OpenAI domains

### Testing with OpenAI
- [ ] **OpenAI integration testing** completed
- [ ] **Test transactions** successful
- [ ] **Monitoring** set up for OpenAI traffic

---

## ✅ Documentation

- [ ] **API documentation** complete (openapi.yaml)
- [ ] **Deployment guide** reviewed
- [ ] **Troubleshooting guide** available
- [ ] **Runbook** for common issues

---

## ✅ Compliance & Legal

### Payment Processing
- [ ] **PayPal merchant account** verified
- [ ] **Business information** complete in PayPal
- [ ] **Tax configuration** set up (if needed)

### Data Protection
- [ ] **Privacy policy** (if collecting customer data)
- [ ] **GDPR compliance** (if serving EU customers)
- [ ] **Data retention** policy

### Terms of Service
- [ ] **Terms of service** defined
- [ ] **Refund policy** defined
- [ ] **Customer support** process defined

---

## 🚨 Critical Pre-Launch Checklist

Before going live, verify:

- [ ] **PayPal is production** (not sandbox)
- [ ] **PAYPAL_BASE_URL** is `https://api-m.paypal.com`
- [ ] **HTTPS is working**
- [ ] **Health endpoint** responds
- [ ] **Test transaction** completed successfully
- [ ] **Shopify orders** created correctly
- [ ] **Error handling** works
- [ ] **Monitoring** set up
- [ ] **Logs** accessible
- [ ] **Backup plan** in place

---

## 🔍 Quick Verification Commands

```bash
# 1. Check health
curl https://your-backend-url.com/health
# Should return: {"status":"ok"}

# 2. Test PayPal production token
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  https://api-m.paypal.com/v1/oauth2/token | jq .
# Should return access_token (not sandbox URL!)

# 3. Test checkout creation
curl -X POST https://your-backend-url.com/create_checkout \
  -H 'Content-Type: application/json' \
  -d '{"items": [{"sku": "TEST-SKU", "quantity": 1}]}'
# Should return checkout session

# 4. Verify environment variables
echo $PAYPAL_BASE_URL
# Should be: https://api-m.paypal.com (NOT sandbox)
```

---

## 📝 Production Environment Template

```bash
# Copy this to your hosting platform

# Shopify
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_SKU_MAP={"SKU1":1234567890}

# PayPal PRODUCTION (⚠️ NOT SANDBOX)
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_secret
PAYPAL_BASE_URL=https://api-m.paypal.com

# Server
PORT=8080
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com

# Optional
DEFAULT_CURRENCY=USD
```

---

## 🆘 Support & Resources

- **PayPal Production**: https://developer.paypal.com/dashboard (switch to Live)
- **OpenAI Docs**: https://developers.openai.com/commerce
- **Shopify Admin**: https://admin.shopify.com

---

## Summary

**Most Critical for Production:**
1. ✅ **Switch PayPal to production** (`PAYPAL_BASE_URL=https://api-m.paypal.com`)
2. ✅ **Get production PayPal credentials**
3. ✅ **HTTPS enabled**
4. ✅ **Test end-to-end flow**
5. ✅ **Monitoring set up**

You're ready for production once all critical items are checked! 🚀

