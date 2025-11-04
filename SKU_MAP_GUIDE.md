# SHOPIFY_SKU_MAP Guide

## Quick Answer

**You don't NEED `SHOPIFY_SKU_MAP` in production**, but it's **highly recommended** for performance.

## How It Works

Your code has a **two-step lookup**:

1. **First**: Check `SHOPIFY_SKU_MAP` (fast, instant)
2. **Fallback**: Query Shopify API (slower, but automatic)

### Without SKU_MAP
```javascript
// For each SKU lookup:
1. Check SHOPIFY_SKU_MAP → Not found
2. Query Shopify API → Found → Return variant ID
```

### With SKU_MAP
```javascript
// For each SKU lookup:
1. Check SHOPIFY_SKU_MAP → Found → Return variant ID ✅
// No API call needed!
```

## Performance Comparison

| Scenario | Without SKU_MAP | With SKU_MAP |
|----------|----------------|--------------|
| **Lookup Speed** | ~200-500ms (API call) | <1ms (in-memory) |
| **Shopify API Calls** | 1 per SKU lookup | 0 |
| **Rate Limits** | Can hit limits with high traffic | No risk |
| **Maintenance** | None | Update when products change |

## Recommendation

### Small Store (< 100 products)
- **Option**: Leave `SHOPIFY_SKU_MAP` empty
- **Reason**: Low traffic, maintenance overhead not worth it

### Medium Store (100-1000 products)
- **Option**: Use `SHOPIFY_SKU_MAP` for popular products only
- **Reason**: Balance between performance and maintenance

### Large Store (1000+ products) or High Traffic
- **Option**: Use `SHOPIFY_SKU_MAP` for all products
- **Reason**: Performance critical, rate limits matter

## Generating SKU_MAP Automatically

We've created a script to generate it from your Shopify store:

```bash
# Generate SKU map from your Shopify store
node generate-sku-map.js > sku-map.json

# Add to your .env file
SHOPIFY_SKU_MAP=$(cat sku-map.json)
```

Or manually format it:

```bash
# The script outputs JSON like:
{"SKU1": 1234567890, "SKU2": 9876543210}

# Add to .env (must be on one line, or use escaped newlines)
SHOPIFY_SKU_MAP={"SKU1":1234567890,"SKU2":9876543210}
```

## Production Setup

### Option A: Full SKU Map (Recommended)

1. **Generate the map**:
   ```bash
   node generate-sku-map.js > sku-map.json
   ```

2. **Format for .env** (one line):
   ```bash
   # Copy the JSON output
   SHOPIFY_SKU_MAP={"SKU1":1234567890,"SKU2":9876543210}
   ```

3. **Set in your hosting platform**:
   - Railway: `railway variables set SHOPIFY_SKU_MAP='{"SKU1":1234567890}'`
   - Render: Add in dashboard environment section
   - Heroku: `heroku config:set SHOPIFY_SKU_MAP='{"SKU1":1234567890}'`

### Option B: Leave Empty (Automatic)

1. **Don't set `SHOPIFY_SKU_MAP`** or set it to empty:
   ```bash
   SHOPIFY_SKU_MAP=""
   ```

2. **The system will query Shopify API automatically**
   - Works for any SKU in your store
   - Slower but maintenance-free

### Option C: Partial Map (Best of Both Worlds)

1. **Map only popular/frequently purchased products**:
   ```bash
   SHOPIFY_SKU_MAP={"POPULAR-SKU-1":1234567890,"POPULAR-SKU-2":9876543210}
   ```

2. **Other SKUs will be looked up automatically**
   - Fast for popular products
   - Automatic for others

## Updating SKU_MAP

When products change, regenerate:

```bash
# Regenerate
node generate-sku-map.js > sku-map.json

# Update environment variable
# (Then redeploy or update via your hosting platform)
```

## Troubleshooting

### SKU Not Found Errors

If you get "SKU not found" errors:

1. **Check SKU exists in Shopify**:
   - Go to Shopify Admin → Products
   - Verify the SKU is set correctly

2. **Check SKU_MAP**:
   ```bash
   # Verify SKU is in the map
   echo $SHOPIFY_SKU_MAP | grep "YOUR-SKU"
   ```

3. **Regenerate map**:
   ```bash
   node generate-sku-map.js
   ```

### Invalid JSON Error

If you get JSON parsing errors:

1. **Check format**: Must be valid JSON
2. **Check for newlines**: JSON must be on one line or properly escaped
3. **Use the generator script**: It outputs valid JSON

## Best Practice

For production with OpenAI integration:

1. **Generate full SKU map** initially
2. **Set it in environment variables**
3. **Regenerate when**:
   - Adding new products
   - Changing SKUs
   - Monthly maintenance

This gives you:
- ✅ Fast lookups
- ✅ No API rate limit issues
- ✅ Better performance for OpenAI traffic
- ✅ Reliable operation

## Summary

| Question | Answer |
|----------|--------|
| **Do I need it?** | No, but recommended |
| **Do I need ALL products?** | No, can be partial or empty |
| **How to generate?** | `node generate-sku-map.js` |
| **When to update?** | When products/SKUs change |
| **Can I leave it empty?** | Yes, system will query Shopify API |

**Recommendation**: Generate it for production, especially if you expect high traffic from OpenAI.

