import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validators.js';
import { checkoutService } from '../services/checkout.js';
import { idempotencyMiddleware } from '../middleware/security.js';
import { checkoutStore } from '../storage/checkoutStore.js';

export const router = Router();

const createSchema = z.object({
  items: z.array(z.object({
    sku: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    quantity: z.number().int().positive()
  })).min(1),
  shippingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().min(1),
    country: z.string().length(2)
  }).optional(),
  email: z.string().email().optional()
});

const updateSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    quantity: z.number().int().positive()
  })).optional(),
  shippingAddress: createSchema.shape.shippingAddress.optional(),
  shippingOption: z.string().optional()
});

const completeSchema = z.object({
  sessionId: z.string().uuid(),
  sharedPaymentToken: z.object({ provider: z.literal('paypal'), token: z.string().min(3) }),
  email: z.string().email()
});

const cancelSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().optional()
});

router.post('/create_checkout', idempotencyMiddleware('create_checkout'), validate(createSchema), async (req, res, next) => {
  try {
    const result = await checkoutService.create(req, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/update_checkout', idempotencyMiddleware('update_checkout'), validate(updateSchema), async (req, res, next) => {
  try {
    const result = await checkoutService.update(req, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/complete_checkout', idempotencyMiddleware('complete_checkout'), validate(completeSchema), async (req, res, next) => {
  try {
    const result = await checkoutService.complete(req, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/cancel_checkout', idempotencyMiddleware('cancel_checkout'), validate(cancelSchema), async (req, res, next) => {
  try {
    const result = await checkoutService.cancel(req, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Debug endpoint - list all active sessions (development only)
router.get('/debug/sessions', (_req, res) => {
  const sessions = checkoutStore.listAll();
  res.json({ count: sessions.length, sessions });
});


