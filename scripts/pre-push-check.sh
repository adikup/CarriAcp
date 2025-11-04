#!/bin/bash

# Pre-push validation script
# Run this before pushing: ./scripts/pre-push-check.sh

set -e

echo "🔍 Running pre-push validation..."
echo ""

# Check 1: Build must succeed
echo "📦 Step 1: Building project..."
npm run build
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed! Fix TypeScript errors before pushing."
  exit 1
fi
echo "✅ Build successful"
echo ""

# Check 2: Check for secrets in staged files
echo "🔐 Step 2: Checking for secrets in staged files..."

SECRETS_FOUND=0

# Check for actual Shopify tokens (not placeholders)
# Exclude script files and template files from this check
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep -v "\.sh$" | grep -v "\.template$" | grep -v "pre-push" || true)
if [ ! -z "$STAGED_FILES" ]; then
  if echo "$STAGED_FILES" | xargs grep -l "shpat_[a-zA-Z0-9]\{20,\}" 2>/dev/null | grep -v "shpat_xxxxxxxx" | grep -v "shpat_xxxxx" | grep -v "your.*token"; then
    echo "❌ Found actual Shopify access token (not placeholder)!"
    echo "   Replace with: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    SECRETS_FOUND=1
  fi
fi

# Check for actual PayPal secrets
if git diff --cached --name-only 2>/dev/null | xargs grep -E "PAYPAL_CLIENT_SECRET.*[A-Za-z0-9_-]{32,}" 2>/dev/null | grep -v "your_production_secret" | grep -v "xxxxxxxx"; then
  echo "❌ Found actual PayPal secret (not placeholder)!"
  SECRETS_FOUND=1
fi

# Check for actual Shopify shop names with tokens
if git diff --cached --name-only 2>/dev/null | xargs grep -E "SHOPIFY_ADMIN_API_ACCESS_TOKEN.*shpat_[a-zA-Z0-9]{20,}" 2>/dev/null | grep -v "shpat_xxxxxxxx"; then
  echo "❌ Found actual Shopify token in environment variable examples!"
  SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 1 ]; then
  echo ""
  echo "⚠️  SECRETS DETECTED IN STAGED FILES!"
  echo "Please remove secrets from files before pushing."
  echo "Use placeholders instead."
  echo ""
  echo "To unstage files: git reset HEAD <file>"
  echo "Then fix and stage again."
  exit 1
fi

echo "✅ No secrets found"
echo ""
echo "✅ All pre-push checks passed!"
echo "You can safely push now."
exit 0
