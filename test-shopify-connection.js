#!/usr/bin/env node

// Quick test script to verify Shopify connection
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const shop = process.env.SHOPIFY_SHOP?.replace(/^https?:\/\//, '') || '';
const token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '';
const variantId = 51228467527963; // Your variant ID from SKU map

const url = `https://${shop}/admin/api/2023-10/variants/${variantId}.json`;

console.log('Testing Shopify connection...');
console.log(`Shop: ${shop}`);
console.log(`URL: ${url}`);
console.log('');

try {
  const resp = await axios.get(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Success! Variant found:');
  console.log(JSON.stringify(resp.data.variant, null, 2));
} catch (e) {
  console.error('❌ Error:', e.response?.status, e.response?.statusText);
  if (e.response?.data) {
    console.error('Response:', JSON.stringify(e.response.data, null, 2));
  }
  console.error('\n💡 Make sure your Custom App has these scopes:');
  console.error('   - read_products');
  console.error('   - read_inventory');
  console.error('   - write_orders');
  process.exit(1);
}

