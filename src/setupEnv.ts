import dotenv from 'dotenv';

dotenv.config();

const required = [
  'SHOPIFY_SHOP',
  'SHOPIFY_ADMIN_API_ACCESS_TOKEN',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET'
];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`Missing env var ${key}. The service may not function until provided.`);
  }
}

if (!process.env.DEFAULT_CURRENCY) {
  process.env.DEFAULT_CURRENCY = 'USD';
}


