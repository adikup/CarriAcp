import axios from 'axios';
import { UpstreamError } from '../utils/errors.js';

function baseUrl() {
  return process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken(): Promise<string> {
  const client = process.env.PAYPAL_CLIENT_ID || '';
  const secret = process.env.PAYPAL_CLIENT_SECRET || '';
  try {
    const resp = await axios.post(
      `${baseUrl()}/v1/oauth2/token`,
      new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
      {
        auth: { username: client, password: secret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return resp.data.access_token;
  } catch (e) {
    throw new UpstreamError('Failed to get PayPal access token', e);
  }
}

export async function captureWithSharedToken(token: string) {
  const accessToken = await getAccessToken();
  try {
    const resp = await axios.post(
      `${baseUrl()}/v2/checkout/orders/${token}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return resp.data;
  } catch (e) {
    throw new UpstreamError('PayPal capture failed', e);
  }
}


