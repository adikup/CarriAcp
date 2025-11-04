#!/usr/bin/env node

/**
 * Validate and clean SHOPIFY_SKU_MAP
 * 
 * This script:
 * 1. Checks if all variant IDs in SKU_MAP still exist in Shopify
 * 2. Removes invalid entries
 * 3. Updates the .env file with cleaned map
 * 
 * Usage:
 *   node validate-sku-map.js
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

async function checkVariantExists(variantId) {
  try {
    const resp = await axios.get(`${adminBase()}/variants/${variantId}.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return resp.data.variant !== undefined;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

async function validateSkuMap() {
  const map = skuMap();
  const entries = Object.entries(map);
  
  if (entries.length === 0) {
    console.log('ℹ️  SHOPIFY_SKU_MAP is empty, nothing to validate');
    return;
  }
  
  console.log(`🔍 Validating ${entries.length} SKU entries...`);
  console.log('');
  
  const valid = {};
  const invalid = [];
  
  for (const [sku, variantId] of entries) {
    process.stdout.write(`Checking ${sku} (variant ${variantId})... `);
    
    try {
      const exists = await checkVariantExists(variantId);
      if (exists) {
        valid[sku] = variantId;
        console.log('✅');
      } else {
        invalid.push({ sku, variantId });
        console.log('❌ Not found');
      }
    } catch (error) {
      console.log(`⚠️  Error: ${error.message}`);
      // Keep it for now, but mark as potentially invalid
      valid[sku] = variantId;
    }
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Validation Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Valid entries: ${Object.keys(valid).length}`);
  console.log(`❌ Invalid entries: ${invalid.length}`);
  
  if (invalid.length > 0) {
    console.log('');
    console.log('❌ Invalid SKU entries (will be removed):');
    invalid.forEach(({ sku, variantId }) => {
      console.log(`   - ${sku}: variant ${variantId} (not found in Shopify)`);
    });
  }
  
  // Update .env file
  if (invalid.length > 0) {
    console.log('');
    console.log('🔄 Updating .env file...');
    
    const formatted = JSON.stringify(valid, null, 2);
    const newValue = `SHOPIFY_SKU_MAP='${formatted}'`;
    
    let content = fs.readFileSync('.env', 'utf8');
    const pattern = /SHOPIFY_SKU_MAP='[\s\S]*?'/;
    
    if (pattern.test(content)) {
      content = content.replace(pattern, newValue);
      fs.writeFileSync('.env', content);
      console.log('✅ Updated .env file with cleaned SKU map');
    } else {
      console.log('⚠️  Could not find SHOPIFY_SKU_MAP in .env, please update manually');
      console.log('');
      console.log('New SHOPIFY_SKU_MAP value:');
      console.log(newValue);
    }
  } else {
    console.log('');
    console.log('✅ All SKU entries are valid!');
  }
  
  console.log('');
  console.log('💡 Tip: Run this script periodically to keep your SKU map up to date');
}

validateSkuMap().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

