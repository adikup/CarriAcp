#!/usr/bin/env node

/**
 * Fix SHOPIFY_SKU_MAP: Convert Product IDs to Variant IDs
 * 
 * Some entries in SKU_MAP might have product IDs instead of variant IDs.
 * This script finds the correct variant ID for each SKU.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

if (!SHOPIFY_SHOP || !SHOPIFY_TOKEN) {
  console.error('❌ Error: SHOPIFY_SHOP and SHOPIFY_ADMIN_API_ACCESS_TOKEN must be set in .env');
  process.exit(1);
}

const adminBase = () => `https://${SHOPIFY_SHOP}/admin/api/2024-01`;

function skuMap() {
  try {
    const raw = process.env.SHOPIFY_SKU_MAP;
    if (!raw) return {};
    const cleaned = raw.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return {};
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('❌ Failed to parse SHOPIFY_SKU_MAP');
    return {};
  }
}

async function getVariant(variantId) {
  try {
    const resp = await axios.get(`${adminBase()}/variants/${variantId}.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return resp.data.variant;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function getProduct(productId) {
  try {
    const resp = await axios.get(`${adminBase()}/products/${productId}.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return resp.data.product;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function findVariantBySku(sku) {
  try {
    // Remove "SKU-" prefix if present (Shopify stores SKUs without prefix)
    const cleanSku = sku.startsWith('SKU-') ? sku.substring(4) : sku;
    
    const resp = await axios.get(`${adminBase()}/products.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      },
      params: { limit: 250 }
    });
    
    for (const product of resp.data.products || []) {
      for (const variant of product.variants || []) {
        // Check both with and without prefix
        if (variant.sku === sku || variant.sku === cleanSku) {
          return variant.id;
        }
      }
    }
    return null;
  } catch (error) {
    if (error.response?.status === 429) {
      console.error(`   ⚠️  Rate limited, skipping...`);
      return null;
    }
    console.error(`Error searching for SKU ${sku}:`, error.message);
    return null;
  }
}

async function fixVariantIds() {
  const map = skuMap();
  const entries = Object.entries(map);
  
  if (entries.length === 0) {
    console.log('ℹ️  SHOPIFY_SKU_MAP is empty');
    return;
  }
  
  console.log(`🔍 Checking ${entries.length} SKU entries...`);
  console.log('');
  
  const fixed = {};
  let fixedCount = 0;
  
  for (const [sku, id] of entries) {
    process.stdout.write(`Checking ${sku} (ID: ${id})... `);
    
    // First, try as variant ID
    const variant = await getVariant(id);
    if (variant) {
      // Check if SKU matches (with or without prefix)
      const variantSku = variant.sku || '';
      const cleanSku = sku.startsWith('SKU-') ? sku.substring(4) : sku;
      if (variantSku === sku || variantSku === cleanSku) {
        // It's a valid variant ID
        fixed[sku] = id;
        console.log('✅ (valid variant ID)');
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit delay
        continue;
      }
    }
    
    // Try as product ID
    const product = await getProduct(id);
    if (product) {
      // It's a product ID, find the variant with matching SKU
      const cleanSku = sku.startsWith('SKU-') ? sku.substring(4) : sku;
      const matchingVariant = product.variants?.find(v => {
        const vSku = v.sku || '';
        return vSku === sku || vSku === cleanSku;
      });
      if (matchingVariant) {
        fixed[sku] = matchingVariant.id;
        fixedCount++;
        console.log(`🔧 (was product ID) → ${matchingVariant.id} (variant ID)`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit delay
        continue;
      }
    }
    
    // Not found, try API lookup (but skip if rate limited)
    console.log('🔍 (not found, searching by SKU)...');
    await new Promise(resolve => setTimeout(resolve, 200)); // Delay before search
    const foundVariantId = await findVariantBySku(sku);
    if (foundVariantId) {
      fixed[sku] = foundVariantId;
      fixedCount++;
      console.log(`   ✅ Found variant ID: ${foundVariantId}`);
    } else {
      console.log(`   ⚠️  SKU not found, keeping old ID`);
      // Keep the old ID, but it might not work
      fixed[sku] = id;
    }
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Fixed ${fixedCount} entries`);
  console.log(`📊 Total entries: ${Object.keys(fixed).length}`);
  console.log('');
  
  // Update .env file
  console.log('🔄 Updating .env file...');
  
  const sorted = Object.keys(fixed).sort().reduce((acc, key) => {
    acc[key] = fixed[key];
    return acc;
  }, {});
  
  const formatted = JSON.stringify(sorted, null, 2);
  const newValue = `SHOPIFY_SKU_MAP='${formatted}'`;
  
  let content = fs.readFileSync('.env', 'utf8');
  const pattern = /SHOPIFY_SKU_MAP='[\s\S]*?'/;
  
  if (pattern.test(content)) {
    content = content.replace(pattern, newValue);
    fs.writeFileSync('.env', content);
    console.log('✅ Updated .env file');
    console.log('');
    console.log(`📝 Fixed entries: ${fixedCount}`);
    if (fixedCount > 0) {
      console.log('   Product IDs were converted to variant IDs');
    }
  } else {
    console.log('⚠️  Could not find SHOPIFY_SKU_MAP in .env');
    console.log('');
    console.log('New value:');
    console.log(newValue);
  }
}

fixVariantIds().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

