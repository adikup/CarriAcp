#!/usr/bin/env node

/**
 * Generate SHOPIFY_SKU_MAP from your Shopify store
 * 
 * This script queries your Shopify store and generates a SKU to variant ID mapping.
 * 
 * Usage:
 *   node generate-sku-map.js > sku-map.json
 * 
 * Then add to your .env:
 *   SHOPIFY_SKU_MAP=$(cat sku-map.json)
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

if (!SHOPIFY_SHOP || !SHOPIFY_TOKEN) {
  console.error('❌ Error: SHOPIFY_SHOP and SHOPIFY_ADMIN_API_ACCESS_TOKEN must be set in .env');
  process.exit(1);
}

const adminBase = () => `https://${SHOPIFY_SHOP}/admin/api/2024-01`;

async function getAllProducts() {
  const products = [];
  let pageInfo = null;
  
  do {
    const params = { limit: 250 };
    if (pageInfo) params.page_info = pageInfo;
    
    try {
      const resp = await axios.get(`${adminBase()}/products.json`, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        },
        params
      });
      
      products.push(...(resp.data.products || []));
      
      // Get next page link from headers
      const linkHeader = resp.headers.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        } else {
          pageInfo = null;
        }
      } else {
        pageInfo = null;
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error.response?.data || error.message);
      process.exit(1);
    }
  } while (pageInfo);
  
  return products;
}

async function generateSkuMap() {
  console.error('📦 Fetching products from Shopify...');
  const products = await getAllProducts();
  console.error(`✅ Found ${products.length} products`);
  
  const skuMap = {};
  let totalVariants = 0;
  let mappedVariants = 0;
  
  for (const product of products) {
    for (const variant of product.variants || []) {
      totalVariants++;
      if (variant.sku && variant.sku.trim()) {
        skuMap[variant.sku] = variant.id;
        mappedVariants++;
      }
    }
  }
  
  console.error(`📊 Statistics:`);
  console.error(`   Total variants: ${totalVariants}`);
  console.error(`   Variants with SKU: ${mappedVariants}`);
  console.error(`   Variants without SKU: ${totalVariants - mappedVariants}`);
  console.error(`   SKU map entries: ${Object.keys(skuMap).length}`);
  console.error('');
  console.error('✅ SKU map generated!');
  console.error('   Copy the JSON below to your .env file as SHOPIFY_SKU_MAP');
  console.error('');
  
  // Output as JSON (minified for .env)
  console.log(JSON.stringify(skuMap));
}

generateSkuMap().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

