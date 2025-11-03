# Deployment Guide

This guide helps you deploy your ACP backend for OpenAI ChatGPT Merchants integration.

## Quick Deploy Options

### Railway (Recommended - Easiest)

1. **Sign up**: https://railway.app
2. **New Project** → **Deploy from GitHub** (or Git repo)
3. **Add Environment Variables** (see below)
4. **Deploy** → Automatic HTTPS included

### Render

1. **Sign up**: https://render.com
2. **New Web Service** → Connect GitHub repo
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`
5. **Add Environment Variables**
6. **Deploy** → Free SSL included

### Fly.io

1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `fly auth login`
3. **Launch**: `fly launch`
4. **Set Secrets**: `fly secrets set KEY=value`
5. **Deploy**: `fly deploy`

## Environment Variables

### Required Variables

```bash
# Shopify Configuration
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
SHOPIFY_SKU_MAP={"SKU1":"variant_id_1","SKU2":"variant_id_2"}

# PayPal Configuration (Production)
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_secret
PAYPAL_BASE_URL=https://api-m.paypal.com

# Server Configuration
PORT=8080
LOG_LEVEL=info

# CORS (for OpenAI)
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
```

### Optional Variables

```bash
# Default Currency (if not USD)
DEFAULT_CURRENCY=USD

# Rate Limiting (adjust if needed)
# Currently: 60 requests/minute (hardcoded in middleware)
```

## Production Checklist

### Before Deployment

- [ ] **Switch PayPal to Production**
  - Get production credentials from PayPal Developer Dashboard
  - Update `PAYPAL_BASE_URL` to `https://api-m.paypal.com`
  - Test with small transaction first

- [ ] **Verify Shopify Credentials**
  - Ensure Admin API token has correct permissions
  - Test order creation in Shopify

- [ ] **Update SKU Map**
  - Ensure all SKUs are mapped correctly
  - Test with actual products

- [ ] **Configure CORS**
  - Set `ALLOWED_ORIGINS` for OpenAI domains
  - Add your domain for testing if needed

### After Deployment

- [ ] **Test Health Endpoint**
  ```bash
  curl https://your-backend-url.com/health
  # Should return: {"status":"ok"}
  ```

- [ ] **Test Checkout Flow**
  - Create checkout
  - Update checkout
  - Complete checkout with PayPal sandbox (test mode)
  - Verify order in Shopify

- [ ] **Monitor Logs**
  - Check for errors
  - Verify request logging
  - Monitor PayPal/Shopify API calls

- [ ] **Setup Monitoring** (Recommended)
  - Error tracking (Sentry, Rollbar, etc.)
  - Uptime monitoring (UptimeRobot, Pingdom)
  - Application metrics

## Platform-Specific Instructions

### Railway

1. **Create Project**:
   ```bash
   railway login
   railway init
   railway link
   ```

2. **Set Variables**:
   ```bash
   railway variables set SHOPIFY_SHOP=your-shop.myshopify.com
   railway variables set SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_token
   # ... etc
   ```

3. **Deploy**:
   ```bash
   git push
   # Railway auto-deploys
   ```

### Render

1. **Create Web Service**:
   - Connect GitHub repo
   - Build: `npm run build`
   - Start: `npm start`

2. **Environment Variables**:
   - Add in Render dashboard
   - Under "Environment" section

3. **Auto-Deploy**:
   - Enabled by default on git push

### Heroku

1. **Create App**:
   ```bash
   heroku create your-app-name
   ```

2. **Set Variables**:
   ```bash
   heroku config:set SHOPIFY_SHOP=your-shop.myshopify.com
   heroku config:set SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_token
   # ... etc
   ```

3. **Deploy**:
   ```bash
   git push heroku main
   ```

### Docker Deployment

If you prefer Docker:

**Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.js"]
```

**Build & Deploy**:
```bash
npm run build
docker build -t acp-backend .
docker run -p 8080:8080 --env-file .env.production acp-backend
```

## SSL/HTTPS

All platforms above provide automatic HTTPS:
- ✅ Railway: Automatic SSL
- ✅ Render: Automatic SSL
- ✅ Fly.io: Automatic SSL
- ✅ Heroku: Automatic SSL

**Important**: OpenAI requires HTTPS in production.

## Domain Configuration

You can use:
1. **Platform-provided domain**: `your-app.railway.app`
2. **Custom domain**: Point DNS to your platform

For OpenAI integration, either works as long as it's HTTPS.

## Monitoring

### Health Check

OpenAI will monitor:
```
GET https://your-backend-url.com/health
```

Should always return:
```json
{"status": "ok"}
```

### Logging

Your app uses structured logging (Pino). Monitor:
- Request/response logs
- Error logs
- PayPal capture logs
- Shopify order creation

### Error Tracking

Consider adding:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Datadog**: APM and logging

## Troubleshooting

### Deployment Fails

1. Check build logs
2. Verify Node.js version (20+)
3. Ensure all dependencies install
4. Check environment variables set

### Service Not Responding

1. Check `/health` endpoint
2. Review application logs
3. Verify PORT is correct
4. Check platform logs

### OpenAI Can't Connect

1. Verify HTTPS is working
2. Check CORS configuration
3. Test `/health` endpoint
4. Review firewall/security settings

## Next Steps

After deployment:

1. ✅ Test all endpoints
2. ✅ Apply to OpenAI merchant program
3. ✅ Provide OpenAI with your API URL
4. ✅ Wait for OpenAI integration testing
5. ✅ Go live!

## Support

- **Platform Docs**: Check your hosting platform's documentation
- **OpenAI Docs**: https://developers.openai.com/commerce
- **Your Logs**: Check application logs for debugging

