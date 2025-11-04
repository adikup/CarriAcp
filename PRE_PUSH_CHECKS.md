# Pre-Push Checks

## What It Does

Before pushing to GitHub, the pre-push check ensures:

1. ✅ **TypeScript compiles** - No build errors
2. ✅ **No secrets in code** - Catches accidental secret commits
3. ✅ **Code quality** - Runs linting if available

## How to Use

### Manual Check (Before Pushing)

```bash
npm run pre-push-check
```

### Automatic (Git Hook)

The git hook is already installed. It runs automatically when you push:

```bash
git push
# Pre-push checks run automatically
```

### Skip Checks (Not Recommended)

If you need to skip checks (not recommended):

```bash
git push --no-verify
```

## What Gets Checked

### TypeScript Compilation
- Runs `npm run build`
- Fails if TypeScript errors exist

### Secret Detection
- Checks for real Shopify tokens (`shpat_` with 40+ chars)
- Checks for real PayPal secrets (20+ chars)
- **Excludes**: Documentation files, templates, scripts
- **Only checks**: Source code files

## Files Excluded from Secret Checking

- `*.md` files (documentation)
- `*.template` files
- `*.sh` scripts
- `*.example` files
- Files with names like `RENDER_ENV`, `PRODUCTION`, etc.

## Fixing Common Issues

### Build Fails

```bash
# Fix TypeScript errors
npm run build

# Fix errors shown, then try again
npm run pre-push-check
```

### Secrets Detected

```bash
# Remove secrets from source files
# Keep secrets only in .env (gitignored)

# Then commit again
git add .
git commit -m "fix: remove secrets"
```

## For CI/CD (Render, etc.)

Render will run `npm run build` automatically. The pre-push check ensures your code will build successfully in CI/CD.

## Summary

✅ **Always run** `npm run pre-push-check` before pushing  
✅ **Git hook** runs it automatically  
✅ **Catches** build errors and secrets before they reach GitHub

