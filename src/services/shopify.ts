import axios from 'axios';
import { UpstreamError, NotFoundError } from '../utils/errors.js';

function adminBase() {
  const shop = process.env.SHOPIFY_SHOP || '';
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
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function resolveVariantIdBySku(sku: string): Promise<number> {
  const map = skuMap();
  const variantId = map[sku];
  if (variantId) return Number(variantId);
  throw new NotFoundError(`SKU ${sku} not mapped to Shopify variant. Add to SHOPIFY_SKU_MAP.`);
}

export async function getVariant(variantId: number) {
  try {
    const resp = await axios.get(`${adminBase()}/variants/${variantId}.json`, { headers: authHeaders() });
    return resp.data.variant;
  } catch (e) {
    throw new UpstreamError('Failed to fetch variant', e);
  }
}

export async function checkInventory(variantId: number, quantity: number) {
  const variant = await getVariant(variantId);
  if (typeof variant.inventory_quantity === 'number' && variant.inventory_quantity < quantity) {
    return { available: false, availableQuantity: variant.inventory_quantity };
  }
  return { available: true, availableQuantity: variant.inventory_quantity ?? undefined };
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


