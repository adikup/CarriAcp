import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { idempotencyStore } from '../storage/checkoutStore.js';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});

export function idempotencyMiddleware(endpointName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.header('Idempotency-Key');
    if (!key) return next();
    const cached = await idempotencyStore.get(endpointName, key);
    if (cached) return res.status(200).json(cached);
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      idempotencyStore.set(endpointName, key, body);
      return originalJson(body);
    }) as typeof res.json;
    next();
  };
}


