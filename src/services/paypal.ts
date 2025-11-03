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

export async function getOrderStatus(orderId: string) {
  const accessToken = await getAccessToken();
  try {
    const resp = await axios.get(
      `${baseUrl()}/v2/checkout/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return resp.data;
  } catch (e) {
    throw new UpstreamError('Failed to get PayPal order status', e);
  }
}

export async function captureWithSharedToken(token: string) {
  const accessToken = await getAccessToken();
  
  // Log the order ID being used
  // eslint-disable-next-line no-console
  console.log(`[paypal.capture] Attempting to capture order ID: ${token}`);
  
  // First, check the order status to provide better error messages
  let orderStatus = 'UNKNOWN';
  let orderId = token;
  try {
    const orderDetails = await getOrderStatus(token);
    orderStatus = orderDetails.status || 'UNKNOWN';
    orderId = orderDetails.id || token; // Use the ID from the response
    // eslint-disable-next-line no-console
    console.log(`[paypal.capture] Order ID from status check: ${orderId}, Status: ${orderStatus}`);
    
    if (orderStatus === 'COMPLETED') {
      // Order already captured, return the order details as if capture succeeded
      // eslint-disable-next-line no-console
      console.log(`[paypal.capture] Order ${orderId} already COMPLETED, returning existing capture`);
      return orderDetails;
    }
    
    if (orderStatus !== 'APPROVED' && orderStatus !== 'CREATED') {
      throw new UpstreamError(
        `Cannot capture order. Order status is "${orderStatus}". Order must be in "APPROVED" or "CREATED" state. Please approve the order in PayPal first.`,
        new Error(`Order status: ${orderStatus}`)
      );
    }
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    // eslint-disable-next-line no-console
    console.error(`[paypal.capture] Error checking order status for ${token}:`, e);
    // If we can't get status, continue with capture attempt using original token
  }
  
  // Use the order ID from status check if available, otherwise use the token
  const captureOrderId = orderId || token;
  // eslint-disable-next-line no-console
  console.log(`[paypal.capture] Capturing order: ${captureOrderId}`);
  
  try {
    const resp = await axios.post(
      `${baseUrl()}/v2/checkout/orders/${captureOrderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return resp.data;
  } catch (e) {
    // Enhance visibility into PayPal failures
    if (axios.isAxiosError(e)) {
      const errorDetails = e.response?.data;
      // eslint-disable-next-line no-console
      console.error('[paypal.capture] status:', e.response?.status);
      // eslint-disable-next-line no-console
      console.error('[paypal.capture] error details:', JSON.stringify(errorDetails, null, 2));
      
      // Provide more helpful error message
      if (e.response?.status === 422) {
        const errorMessage = errorDetails?.message || errorDetails?.details?.[0]?.description || 'Order cannot be captured';
        throw new UpstreamError(
          `PayPal capture failed: ${errorMessage}. Make sure the order is approved in PayPal (status should be APPROVED). Current status: ${orderStatus}`,
          e
        );
      }
    }
    throw new UpstreamError('PayPal capture failed', e);
  }
}


