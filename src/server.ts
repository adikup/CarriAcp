import './setupEnv';
import express from 'express';
import pinoHttp from 'pino-http';
import { router as acpRouter } from './routes/acp.js';
import { errorHandler } from './utils/errors.js';
import { rateLimiter } from './middleware/security.js';

const app = express();

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


