import './setupEnv.js';
import express from 'express';
import cors from 'cors';
import pinoHttpModule from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { router as acpRouter } from './routes/acp.js';
import { errorHandler } from './utils/errors.js';
import { rateLimiter } from './middleware/security.js';

// Handle pino-http default export (ES modules compatibility)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoHttp = ((pinoHttpModule as any).default || pinoHttpModule) as (opts?: any) => express.RequestHandler;

const app = express();

// CORS configuration for OpenAI integration
const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://chat.openai.com',
      'https://chatgpt.com',
      'http://localhost:3000', // For local development
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins or OpenAI domains
    if (allowedOrigins.includes(origin) || origin.endsWith('.openai.com')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
};

app.use(cors(corsOptions));

// Request ID middleware for tracking OpenAI requests
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.body.sharedPaymentToken', 'res.body.sharedPaymentToken'],
    censor: '***'
  }
}));

app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/', acpRouter);

app.use(errorHandler);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ACP backend listening on :${port}`);
});


