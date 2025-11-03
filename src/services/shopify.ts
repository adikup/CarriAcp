import axios from 'axios';
import { UpstreamError, NotFoundError } from '../utils/errors.js';

function adminBase() {
  let shop = process.env.SHOPIFY_SHOP || '';
  // Remove https:// if present (we add it ourselves)
  shop = shop.replace(/^https?:\/\//, '');
  // Remove trailing slash
  shop = shop.replace(/\/$/, '');
  return `https://${shop}/admin/api/2023-10`;
}

function authHeaders() {
  return {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '',
    'Content-Type': 'application/json'
  };
}

function skuMap(): Record<string, number> {
  try {
    const raw = process.env.SHOPIFY_SKU_MAP;
    if (!raw) return {};
    // Handle multiline JSON by removing newlines and spaces
    const cleaned = raw.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return {};
    const parsed = JSON.parse(cleaned);
    // Validate it's an object
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('SHOPIFY_SKU_MAP must be a JSON object, got:', typeof parsed);
      return {};
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse SHOPIFY_SKU_MAP. Make sure it\'s valid JSON like: {"SKU-123": 1234567890}');
    console.warn('Error:', e instanceof Error ? e.message : e);
    return {};
  }
}

export async function findVariantBySku(sku: string): Promise<number | null> {
  try {
    // Search products by SKU
    const resp = await axios.get(`${adminBase()}/products.json`, {
      headers: authHeaders(),
      params: { limit: 250 }
    });
    
    for (const product of resp.data.products || []) {
      for (const variant of product.variants || []) {
        if (variant.sku === sku) {
          return variant.id;
        }
      }
    }
    return null;
  } catch (e: any) {
    const message = e?.response?.data?.errors || e?.response?.statusText || e?.message || 'Unknown error';
    const status = e?.response?.status || 'unknown';
    console.warn(`Failed to search Shopify by SKU ${sku} (${status}):`, message);
    return null;
  }
}

export async function resolveVariantIdBySku(sku: string): Promise<number> {
  // First check the manual map
  const map = skuMap();
  const variantId = map[sku];
  if (variantId) return Number(variantId);
  
  // If not found, query Shopify API dynamically
  const foundVariantId = await findVariantBySku(sku);
  if (foundVariantId) return foundVariantId;
  
  throw new NotFoundError(
    `SKU ${sku} not found. Either add it to SHOPIFY_SKU_MAP as {"${sku}": variant_id} or ensure it exists in your Shopify store.`
  );
}

export async function getVariant(variantId: number) {
  try {
    const resp = await axios.get(`${adminBase()}/variants/${variantId}.json`, { headers: authHeaders() });
    return resp.data.variant;
  } catch (e: any) {
    const message = e?.response?.data?.errors || e?.response?.statusText || e?.message || 'Unknown error';
    const status = e?.response?.status || 'unknown';
    throw new UpstreamError(
      `Failed to fetch variant ${variantId} from Shopify (${status}): ${JSON.stringify(message)}`,
      { variantId, status, response: e?.response?.data }
    );
  }
}

export async function checkInventory(variantId: number, quantity: number) {
  try {
    const variant = await getVariant(variantId);
    if (typeof variant.inventory_quantity === 'number' && variant.inventory_quantity < quantity) {
      return { available: false, availableQuantity: variant.inventory_quantity };
    }
    return { available: true, availableQuantity: variant.inventory_quantity ?? undefined };
  } catch (e) {
    // Re-throw with context
    throw e;
  }
}

export async function createOrder(params: {
  lineItems: Array<{ variant_id: number; quantity: number }>;
  email: string;
  shippingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    zip: string;
    country: string;
  };
  paid: boolean;
}) {
  try {
    const resp = await axios.post(
      `${adminBase()}/orders.json`,
      {
        order: {
          email: params.email,
          line_items: params.lineItems,
          shipping_address: params.shippingAddress,
          financial_status: params.paid ? 'paid' : 'pending'
        }
      },
      { headers: authHeaders() }
    );
    return resp.data.order;
  } catch (e) {
    throw new UpstreamError('Failed to create Shopify order', e);
  }
}

export async function cancelOrder(orderId: number) {
  try {
    const resp = await axios.post(`${adminBase()}/orders/${orderId}/cancel.json`, {}, { headers: authHeaders() });
    return resp.data.order;
  } catch (e) {
    throw new UpstreamError('Failed to cancel Shopify order', e);
  }
}


