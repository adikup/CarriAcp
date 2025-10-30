import { v4 as uuid } from 'uuid';

export type CheckoutItem = {
  sku?: string;
  productId?: string;
  quantity: number;
  unitPrice?: number;
  title?: string;
  variantId?: number;
};

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type CheckoutSession = {
  id: string;
  items: CheckoutItem[];
  shippingAddress?: Address;
  shippingOption?: string;
  taxAmount?: number;
  shippingAmount?: number;
  subtotal?: number;
  total?: number;
  currency: string;
  status: 'draft' | 'awaiting_payment' | 'completed' | 'cancelled';
  shopifyDraftOrderId?: number;
  shopifyOrderId?: number;
};

const sessions = new Map<string, CheckoutSession>();

export const checkoutStore = {
  create(initial: Partial<CheckoutSession>): CheckoutSession {
    const id = uuid();
    const session: CheckoutSession = {
      id,
      items: initial.items || [],
      currency: initial.currency || process.env.DEFAULT_CURRENCY || 'USD',
      status: 'draft',
      shippingAddress: initial.shippingAddress,
      shippingOption: initial.shippingOption
    };
    sessions.set(id, session);
    return session;
  },
  get(id: string): CheckoutSession | undefined {
    return sessions.get(id);
  },
  set(session: CheckoutSession) {
    sessions.set(session.id, session);
    return session;
  }
};

const idem = new Map<string, any>();

export const idempotencyStore = {
  async get(endpoint: string, key: string) {
    return idem.get(`${endpoint}:${key}`);
  },
  async set(endpoint: string, key: string, value: unknown) {
    idem.set(`${endpoint}:${key}`, value);
  }
};


