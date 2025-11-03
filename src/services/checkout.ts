import { Request } from 'express';
import { checkoutStore, CheckoutSession, CheckoutItem } from '../storage/checkoutStore.js';
import { BadRequestError, ConflictError } from '../utils/errors.js';
import { captureWithSharedToken } from './paypal.js';
import { resolveVariantIdBySku, getVariant, checkInventory, createOrder, cancelOrder } from './shopify.js';

function toShopifyShippingAddress(addr?: CheckoutSession['shippingAddress']) {
  if (!addr) return undefined;
  return {
    address1: addr.line1,
    address2: addr.line2,
    city: addr.city,
    province: addr.state,
    zip: addr.postalCode,
    country: addr.country
  };
}

async function enrichItems(items: CheckoutItem[]): Promise<CheckoutItem[]> {
  const out: CheckoutItem[] = [];
  for (const item of items) {
    const variantId = item.variantId || (item.sku ? await resolveVariantIdBySku(item.sku) : undefined);
    if (!variantId) throw new BadRequestError('Each item must include sku or resolvable productId');
    const variant = await getVariant(variantId);
    out.push({
      ...item,
      variantId,
      unitPrice: Number(variant.price),
      title: variant.title || variant.name
    });
  }
  return out;
}

function calculateTotals(items: CheckoutItem[], shippingOption?: string) {
  const subtotal = items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
  const shippingAmount = shippingOption === 'express' ? 1499 : 599; // cents
  const taxAmount = Math.round(subtotal * 0.08);
  const total = subtotal + shippingAmount + taxAmount;
  return { subtotal, shippingAmount, taxAmount, total };
}

async function ensureInventory(items: CheckoutItem[]) {
  for (const item of items) {
    const variantId = item.variantId as number;
    const inv = await checkInventory(variantId, item.quantity);
    if (!inv.available) {
      throw new ConflictError(`Item out of stock: ${item.sku || variantId}`);
    }
  }
}

export const checkoutService = {
  async create(_req: Request, body: any) {
    const session = checkoutStore.create({ items: [], currency: process.env.DEFAULT_CURRENCY });
    const items = await enrichItems(body.items);
    await ensureInventory(items);
    const totals = calculateTotals(items, body.shippingOption);
    session.items = items;
    session.shippingAddress = body.shippingAddress;
    session.shippingOption = body.shippingOption;
    session.subtotal = totals.subtotal;
    session.shippingAmount = totals.shippingAmount;
    session.taxAmount = totals.taxAmount;
    session.total = totals.total;
    session.status = 'awaiting_payment';
    checkoutStore.set(session);
    return {
      sessionId: session.id,
      currency: session.currency,
      subtotal: totals.subtotal,
      shipping: totals.shippingAmount,
      tax: totals.taxAmount,
      total: totals.total,
      shippingOptions: [
        { id: 'standard', label: 'Standard (5-7 days)', amount: 599 },
        { id: 'express', label: 'Express (2-3 days)', amount: 1499 }
      ],
      status: session.status
    };
  },

  async update(_req: Request, body: any) {
    const session = checkoutStore.get(body.sessionId);
    if (!session) throw new BadRequestError('Invalid sessionId');
    if (session.status !== 'awaiting_payment' && session.status !== 'draft') {
      throw new ConflictError('Session cannot be updated');
    }
    if (body.items) session.items = await enrichItems(body.items);
    if (body.shippingAddress) session.shippingAddress = body.shippingAddress;
    if (body.shippingOption) session.shippingOption = body.shippingOption;
    await ensureInventory(session.items);
    const totals = calculateTotals(session.items, session.shippingOption);
    session.subtotal = totals.subtotal;
    session.shippingAmount = totals.shippingAmount;
    session.taxAmount = totals.taxAmount;
    session.total = totals.total;
    checkoutStore.set(session);
    return {
      sessionId: session.id,
      currency: session.currency,
      subtotal: totals.subtotal,
      shipping: totals.shippingAmount,
      tax: totals.taxAmount,
      total: totals.total,
      status: session.status
    };
  },

  async complete(_req: Request, body: any) {
    const session = checkoutStore.get(body.sessionId);
    if (!session) {
      // eslint-disable-next-line no-console
      console.error(`[complete_checkout] Session not found: ${body.sessionId}`);
      // eslint-disable-next-line no-console
      console.error(`[complete_checkout] Active sessions: ${checkoutStore.listAll().map(s => s.id).join(', ') || 'none'}`);
      throw new BadRequestError('Invalid sessionId');
    }
    if (session.status === 'completed') {
      return { orderId: session.shopifyOrderId, shopifyOrderId: session.shopifyOrderId, status: 'completed' };
    }
    if (session.status === 'cancelled') {
      throw new ConflictError('Cannot complete a cancelled session');
    }
    await ensureInventory(session.items);
    // eslint-disable-next-line no-console
    console.log(`[complete_checkout] Attempting to capture PayPal order: ${body.sharedPaymentToken.token}`);
    const capture = await captureWithSharedToken(body.sharedPaymentToken.token);
    const paid = capture?.status === 'COMPLETED';
    const order = await createOrder({
      lineItems: session.items.map(i => ({ variant_id: i.variantId as number, quantity: i.quantity })),
      email: body.email,
      shippingAddress: toShopifyShippingAddress(session.shippingAddress),
      paid
    });
    session.shopifyOrderId = order.id;
    session.status = 'completed';
    checkoutStore.set(session);
    return { orderId: order.id, shopifyOrderId: order.id, status: 'completed' };
  },

  async cancel(_req: Request, body: any) {
    const session = checkoutStore.get(body.sessionId);
    if (!session) throw new BadRequestError('Invalid sessionId');
    if (session.status === 'completed') {
      throw new ConflictError('Cannot cancel a completed session');
    }
    if (session.status === 'cancelled') {
      // Idempotent: already cancelled, return success
      return { sessionId: session.id, status: 'cancelled' };
    }
    if (session.shopifyOrderId) await cancelOrder(session.shopifyOrderId);
    session.status = 'cancelled';
    checkoutStore.set(session);
    return { sessionId: session.id, status: 'cancelled' };
  }
};


