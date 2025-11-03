# OpenAI ChatGPT Merchants Integration Guide

This guide explains how to connect your ACP backend to OpenAI's ChatGPT Merchants platform.

## Overview

Your ACP backend is already compatible with OpenAI's Agentic Commerce Protocol (ACP). OpenAI will:
1. Create checkout sessions via `/create_checkout`
2. Handle PayPal order creation and approval (on OpenAI's side)
3. Complete checkouts via `/complete_checkout` with PayPal tokens

## Prerequisites

1. ✅ **ACP Endpoints Implemented**: All required endpoints are ready
2. ✅ **PayPal Integration**: PayPal capture is working
3. ✅ **Shopify Integration**: Order creation is functional
4. ✅ **Error Handling**: Proper error responses implemented
5. ⬇️ **Deployment**: Backend needs to be publicly accessible
6. ⬇️ **OpenAI Application**: Apply to OpenAI's merchant program

## Step 1: Deploy Your Backend

Your backend must be accessible via HTTPS for OpenAI to connect.

### Option A: Deploy to a Cloud Platform

**Recommended Platforms:**
- **Railway**: Easy deployment, automatic HTTPS
- **Render**: Free tier available, automatic HTTPS
- **Fly.io**: Fast global deployment
- **Heroku**: Classic platform, easy setup
- **AWS/GCP/Azure**: Full control, more complex

### Deployment Checklist

```bash
# 1. Build your application
npm run build

# 2. Set environment variables on your hosting platform:
#    - SHOPIFY_SHOP
#    - SHOPIFY_ADMIN_API_ACCESS_TOKEN
#    - SHOPIFY_SKU_MAP
#    - PAYPAL_CLIENT_ID
#    - PAYPAL_CLIENT_SECRET
#    - PAYPAL_BASE_URL (https://api-m.paypal.com for production)
#    - PORT (usually auto-set by platform)
#    - ALLOWED_ORIGINS (comma-separated list of OpenAI domains)

# 3. Deploy and verify
curl https://your-backend-url.com/health
```

### Environment Variables for Production

```bash
# .env.production
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_token
SHOPIFY_SKU_MAP={"SKU1":"variant_id_1","SKU2":"variant_id_2"}

# PayPal Production (not sandbox)
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_BASE_URL=https://api-m.paypal.com

# CORS - Allow OpenAI domains
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com

# Logging
LOG_LEVEL=info
PORT=8080
```

## Step 2: Apply to OpenAI Merchant Program

1. **Visit**: https://openai.com/merchants
2. **Apply** with your business details
3. **Provide** your backend API URL
4. **Wait** for approval from OpenAI

## Step 3: Configure OpenAI Integration

Once approved, OpenAI will need:

1. **API Base URL**: `https://your-backend-url.com`
2. **Endpoints**:
   - `POST /create_checkout`
   - `POST /update_checkout`
   - `POST /complete_checkout`
   - `POST /cancel_checkout`
   - `GET /health` (for monitoring)

3. **Authentication**: OpenAI will configure how they authenticate (if required)

## Step 4: API Endpoints Reference

### POST /create_checkout

**Request:**
```json
{
  "items": [
    {
      "sku": "PRODUCT-SKU",
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "line1": "123 Main St",
    "city": "New York",
    "postalCode": "10001",
    "country": "US"
  },
  "email": "customer@example.com"
}
```

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "currency": "USD",
  "subtotal": 6900,
  "shipping": 599,
  "tax": 552,
  "total": 8051,
  "shippingOptions": [
    {
      "id": "standard",
      "label": "Standard (5-7 days)",
      "amount": 599
    },
    {
      "id": "express",
      "label": "Express (2-3 days)",
      "amount": 1499
    }
  ],
  "status": "awaiting_payment"
}
```

### POST /update_checkout

**Request:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "shippingOption": "express",
  "shippingAddress": {
    "line1": "456 Oak Ave",
    "city": "Los Angeles",
    "postalCode": "90001",
    "country": "US"
  }
}
```

### POST /complete_checkout

**Request:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "customer@example.com",
  "sharedPaymentToken": {
    "provider": "paypal",
    "token": "PAYPAL_ORDER_ID_FROM_OPENAI"
  }
}
```

**Response:**
```json
{
  "orderId": 1234567890,
  "shopifyOrderId": 1234567890,
  "status": "completed"
}
```

### POST /cancel_checkout

**Request:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Customer cancelled"
}
```

## Step 5: Testing with OpenAI

Once integrated, OpenAI will test your endpoints:

1. **Health Check**: `GET /health` should return `{"status": "ok"}`
2. **Create Checkout**: Test with sample products
3. **Complete Checkout**: Test with PayPal sandbox orders
4. **Error Handling**: Test invalid inputs

## Important Notes

### Idempotency

All endpoints support `Idempotency-Key` header. OpenAI will send this to ensure requests can be safely retried.

### Rate Limiting

Current rate limit: **60 requests per minute**. Adjust if needed:
- Production: May need higher limits
- OpenAI traffic: Monitor and adjust

### Error Responses

All errors follow this format:
```json
{
  "code": "error_code",
  "message": "Human-readable error message",
  "details": { /* additional error details */ },
  "requestId": "uuid-for-tracking"
}
```

### Request ID Tracking

All requests/responses include `X-Request-ID` header for tracking and debugging.

## Monitoring & Debugging

### Logs

Your backend uses structured logging (Pino). Monitor:
- Request/response logs
- Error logs
- PayPal capture logs
- Shopify order creation logs

### Health Endpoint

OpenAI will monitor `/health`:
```bash
curl https://your-backend-url.com/health
# Should return: {"status": "ok"}
```

### Debug Endpoint (Development Only)

`GET /debug/sessions` - Lists active checkout sessions
- ⚠️ **Remove in production** or secure with authentication

## Security Considerations

1. **HTTPS Only**: Required for production
2. **CORS**: Configured for OpenAI domains
3. **Rate Limiting**: Prevents abuse
4. **Idempotency**: Prevents duplicate processing
5. **Error Sanitization**: Sensitive data redacted in logs

## Troubleshooting

### OpenAI Can't Connect

1. Check backend is publicly accessible
2. Verify HTTPS is working
3. Check CORS configuration
4. Verify `/health` endpoint responds

### Payments Failing

1. Check PayPal credentials (production vs sandbox)
2. Verify PayPal orders are approved before capture
3. Check Shopify API credentials
4. Review server logs for errors

### Orders Not Appearing in Shopify

1. Verify `SHOPIFY_ADMIN_API_ACCESS_TOKEN` is valid
2. Check Shopify API rate limits
3. Review error logs for Shopify errors

## Next Steps

1. ✅ Deploy backend to production
2. ✅ Apply to OpenAI merchant program
3. ✅ Configure production environment variables
4. ✅ Test with OpenAI's integration team
5. ✅ Monitor logs and metrics
6. ✅ Go live!

## Support

- **OpenAI Documentation**: https://developers.openai.com/commerce
- **ACP Specification**: Check OpenAI's ACP docs
- **Your Backend Logs**: Monitor for debugging

## Checklist Before Going Live

- [ ] Backend deployed and accessible via HTTPS
- [ ] Production environment variables configured
- [ ] PayPal production credentials set
- [ ] Shopify credentials verified
- [ ] Health endpoint responding
- [ ] CORS configured for OpenAI domains
- [ ] Rate limiting appropriate for production
- [ ] Logging configured and monitored
- [ ] Error handling tested
- [ ] OpenAI integration approved
- [ ] Test transactions successful
- [ ] Monitoring/alerting set up

