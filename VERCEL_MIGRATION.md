# Vercel Migration Guide

This document describes the migration from Netlify to Vercel for the Grainhouse Coffee e-commerce site.

## Current Likely Breakages (Before Migration)

When deploying a Netlify-based project to Vercel without migration, the following would be broken:

1. **Netlify Functions Not Available** - `/.netlify/functions/*` endpoints return 404
2. **Webhooks Broken** - `/webhooks/*` routes not working
3. **Contact Form Broken** - Email sending via Netlify function unavailable
4. **Checkout Broken** - Helcim payment integration unavailable
5. **netlify.toml Headers/Redirects Ignored** - Security headers and redirects not applied
6. **Netlify Blobs Unavailable** - Idempotency storage for webhooks broken

## Migration Summary

### What Was Done

1. Created `vercel.json` with:
   - Rewrites for legacy Netlify endpoints → `/api/*`
   - Redirect www → apex (canonical domain)
   - Security headers matching netlify.toml
   - Cache control headers

2. Created Vercel API routes:
   - `/api/checkout.js` - Helcim payment integration
   - `/api/helcim-webhook.js` - Webhook handler with signature verification
   - `/api/send-contact-email.js` - Contact form email via Resend
   - `/api/health.js` - Health check endpoint
   - `/api/lib/helcim-config.js` - Shared Helcim configuration
   - `/api/lib/idempotency.js` - In-memory idempotency (with Vercel KV upgrade path)

## Environment Variables

Configure these in Vercel Project Settings → Environment Variables:

| Variable | Required | Example | Where Used |
|----------|----------|---------|------------|
| `HELCIM_API_TOKEN` | **Yes** | `helcim_api_xxxxx` | Checkout API for payment processing |
| `HELCIM_WEBHOOK_SECRET` | Recommended | `base64_encoded_secret` | Webhook signature verification |
| `RESEND_API_KEY` | **Yes** | `re_xxxxx` | Contact form email sending |
| `SITE_URL` | **Yes** | `https://grainhousecoffee.com` | Payment redirects and canonical URL |
| `HELCIM_ENVIRONMENT` | No | `sandbox` or `production` | Auto-detected from VERCEL_ENV |

### Getting Environment Variable Values

1. **HELCIM_API_TOKEN**: 
   - Log into [Helcim Dashboard](https://secure.myhelcim.com)
   - Navigate to: Integrations → API Access Configurations → New API Access
   - Copy the API token

2. **HELCIM_WEBHOOK_SECRET**:
   - In Helcim Dashboard → Integrations → Webhooks
   - Create or edit webhook pointing to `https://grainhousecoffee.com/api/helcim-webhook`
   - Copy the Verifier Token (this is the secret, already base64 encoded)

3. **RESEND_API_KEY**:
   - Log into [Resend Dashboard](https://resend.com)
   - Navigate to: API Keys → Create API Key
   - Copy the key

## Endpoint Mapping

| Original Netlify Endpoint | New Vercel Endpoint | Rewrite Configured |
|--------------------------|--------------------|--------------------|
| `/.netlify/functions/checkout` | `/api/checkout` | ✅ Yes |
| `/.netlify/functions/helcim-webhook` | `/api/helcim-webhook` | ✅ Yes |
| `/.netlify/functions/send-contact-email` | `/api/send-contact-email` | ✅ Yes |
| `/.netlify/functions/health` | `/api/health` | ✅ Yes |
| `/webhooks/*` | `/api/helcim-webhook` | ✅ Yes |

## Validation Checklist

### Test Commands

```bash
# 1. Check site availability
curl -I https://www.grainhousecoffee.com/

# 2. Verify www to apex redirect
curl -I https://www.grainhousecoffee.com/ 2>&1 | grep -i location

# 3. Health check endpoint
curl https://grainhousecoffee.com/api/health

# 4. Webhook HEAD validation (Helcim URL verification)
curl -I https://grainhousecoffee.com/webhooks/payment
curl -I https://grainhousecoffee.com/api/helcim-webhook

# 5. Webhook GET validation (with check parameter)
curl "https://grainhousecoffee.com/api/helcim-webhook?check=test123"

# 6. CORS preflight test
curl -X OPTIONS https://grainhousecoffee.com/api/checkout \
  -H "Origin: https://grainhousecoffee.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" -I

# 7. Legacy Netlify endpoint rewrite test
curl -I https://grainhousecoffee.com/.netlify/functions/health
```

### Manual Tests

1. **Static Pages**: Browse to https://grainhousecoffee.com/ and verify all pages load
2. **Checkout Flow**: Add items to cart and proceed to checkout form
3. **Contact Form**: Submit a test message on the contact page
4. **Webhook**: Check Helcim dashboard for webhook status

## Domain Configuration

The site uses **apex domain as canonical**: `https://grainhousecoffee.com`

All requests to `www.grainhousecoffee.com` are 301/308 redirected to the apex domain.

### ⚠️ CRITICAL: Vercel Dashboard Domain Setup

**IMPORTANT**: Domain-level redirects (apex vs www) are controlled by the **Vercel Dashboard**, NOT vercel.json. The vercel.json redirects only work AFTER the domain-level routing is resolved.

#### Step-by-Step Domain Configuration

1. **Go to Vercel Dashboard → Project → Settings → Domains**

2. **If `www.grainhousecoffee.com` is listed as Primary** (this causes apex→www redirect):
   - Click the three-dot menu (⋯) next to `grainhousecoffee.com`
   - Select **"Set as Primary"**
   - This makes apex the canonical domain

3. **Configure www as a Redirect** (not an alias):
   - Click on `www.grainhousecoffee.com` in the domains list
   - Under "Redirects to", ensure it says `grainhousecoffee.com`
   - The redirect type should be **308 Permanent Redirect**

4. **Verify the configuration shows**:
   ```
   grainhousecoffee.com         [Primary] [✓ Valid]
   www.grainhousecoffee.com     Redirects to grainhousecoffee.com [✓ Valid]
   ```

5. **DNS Configuration**:
   - **Apex domain (`grainhousecoffee.com`)**:
     - A record → `76.76.21.21` (Vercel's IP)
     - OR ALIAS/ANAME → `cname.vercel-dns.com` (if your DNS supports it)
   - **WWW subdomain (`www.grainhousecoffee.com`)**:
     - CNAME → `cname.vercel-dns.com`

#### Why This Matters for Webhooks

When `www` is set as Primary in Vercel:
- `https://grainhousecoffee.com/webhooks/payment` → 307 redirect to `https://www.grainhousecoffee.com/webhooks/payment`
- Helcim webhook follows redirect, lands on www
- The webhook rewrite at www may not work correctly, resulting in 404

When `apex` is set as Primary:
- `https://grainhousecoffee.com/webhooks/payment` → 200 OK (direct hit)
- `https://www.grainhousecoffee.com/webhooks/payment` → 308 redirect to apex → 200 OK
- Webhooks work correctly without redirect chains

#### Verification After Domain Change

After making domain changes in Vercel Dashboard, verify with:

```bash
# Test apex webhook (should return 200, no redirect)
curl -I https://grainhousecoffee.com/webhooks/payment

# Test www webhook (should redirect to apex with 308, then 200)
curl -I -L https://www.grainhousecoffee.com/webhooks/payment

# Test apex API endpoint (should return 200, no redirect)  
curl -I https://grainhousecoffee.com/api/helcim-webhook
```

## Idempotency Storage

### Current Implementation (In-Memory)

The webhook handler uses in-memory storage for idempotency. This works but resets on:
- Cold starts
- Deployments
- Function restarts

### Production Upgrade: Vercel KV (Upstash)

For production-grade idempotency:

1. Enable Vercel KV in project dashboard
2. Install dependency: `npm install @vercel/kv`
3. Uncomment the Vercel KV implementation in `/api/lib/idempotency.js`

This ensures idempotency persists across all function invocations.

## Security Headers

All security headers from `netlify.toml` have been migrated to `vercel.json`:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(self 'https://secure.helcim.app')`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy`: Allows Helcim payment processor, Google Fonts, Google Maps, Resend API

## Caching Strategy

| Resource Type | Cache Policy |
|--------------|--------------|
| Images (`/images/*`) | `public, max-age=31536000, immutable` (1 year) |
| CSS files (`*.css`) | `public, max-age=31536000, immutable` (1 year) |
| JS files (`*.js`) | `public, max-age=31536000, immutable` (1 year) |
| `site-config.js` | `public, max-age=3600, stale-while-revalidate=86400` (1 hour) |
| HTML files (`*.html`) | `public, max-age=3600, stale-while-revalidate=86400` (1 hour) |
| Fonts (`*.woff`, `*.woff2`) | `public, max-age=31536000, immutable` (1 year) |
| SVG files (`*.svg`) | `public, max-age=31536000, immutable` (1 year) |

## Deployment Checklist

### Step-by-Step Deployment

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "Migrate Netlify functions to Vercel API routes"
   git push origin main
   ```

2. **Set Environment Variables in Vercel**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add each variable for **All Environments** (Production, Preview, Development):
     - `HELCIM_API_TOKEN` - Your Helcim API token
     - `HELCIM_WEBHOOK_SECRET` - Base64 encoded Verifier Token from Helcim
     - `RESEND_API_KEY` - Your Resend API key
     - `SITE_URL` - `https://grainhousecoffee.com`

3. **Trigger Redeploy**
   - After adding env vars, redeploy via Vercel Dashboard
   - Or push a new commit to trigger automatic deployment

4. **Verify Deployment**
   - Run the validation commands below
   - Check Vercel function logs for any errors

### Post-Deployment Verification

```bash
# 1. Check webhook HEAD returns 200 (Helcim validation)
curl -I https://grainhousecoffee.com/webhooks/payment
# Expected: HTTP/2 200

# 2. Verify www redirects to apex
curl -I https://www.grainhousecoffee.com/ 2>&1 | grep -i location
# Expected: Location: https://grainhousecoffee.com/

# 3. Test health endpoint
curl https://grainhousecoffee.com/api/health
# Expected: JSON with status: healthy

# 4. Test webhook GET
curl https://grainhousecoffee.com/api/helcim-webhook
# Expected: JSON with status: ready

# 5. Test webhook with check parameter (echo test)
curl "https://grainhousecoffee.com/api/helcim-webhook?check=test123"
# Expected: test123

# 6. Test webhook POST (simulated - will fail signature but proves route works)
curl -X POST https://grainhousecoffee.com/api/helcim-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}' -v
# Expected: 401 (signature verification) proves function is running

# 7. Test checkout CORS preflight
curl -X OPTIONS https://grainhousecoffee.com/api/checkout \
  -H "Origin: https://grainhousecoffee.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" -I
# Expected: HTTP/2 204 with Access-Control-Allow-Origin header

# 8. Test legacy Netlify endpoint rewrites
curl -I https://grainhousecoffee.com/.netlify/functions/health
# Expected: HTTP/2 200 (rewritten to /api/health)
```

### Verify in Helcim Dashboard

1. Go to Helcim Dashboard → Integrations → Webhooks
2. Edit your webhook and set URL to: `https://grainhousecoffee.com/webhooks/payment`
3. Click "Validate URL" - should return success
4. If validation fails, check Vercel function logs

## Troubleshooting

### 307 Redirect from Apex to WWW (Domain Configuration Issue)

**Symptom**: 
```bash
curl -I https://grainhousecoffee.com/webhooks/payment
# Returns: HTTP/2 307, Location: https://www.grainhousecoffee.com/webhooks/payment
```

**Cause**: In Vercel Dashboard, `www.grainhousecoffee.com` is set as the Primary Domain, causing Vercel to redirect all apex traffic to www before processing any routes.

**Solution**: 
1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Click the three-dot menu (⋯) next to `grainhousecoffee.com`
3. Select **"Set as Primary"**
4. Verify that `www.grainhousecoffee.com` shows "Redirects to grainhousecoffee.com"

**Note**: This is a dashboard-only fix - vercel.json redirects cannot override Vercel's domain-level Primary Domain routing.

### Checkout Not Working

1. Check health endpoint: `curl https://grainhousecoffee.com/api/health`
2. Verify `HELCIM_API_TOKEN` is set in Vercel environment variables
3. Check Vercel function logs for errors

### Webhooks Not Validating (404 Error)

1. Verify the API route files exist in `/api/` directory
2. Check that `vercel.json` has the correct rewrites
3. Test HEAD request: `curl -I https://grainhousecoffee.com/api/helcim-webhook`
4. Check Vercel deployment logs for function bundling errors
5. Ensure the `functions` config in `vercel.json` includes `api/lib/**` files

### Webhooks Signature Verification Failing

1. Verify `HELCIM_WEBHOOK_SECRET` is set correctly (base64 encoded)
2. Check that the webhook secret matches the Verifier Token from Helcim
3. Ensure no whitespace in the environment variable value

### Contact Form Not Sending

1. Verify `RESEND_API_KEY` is set
2. Check Resend dashboard for sending limits/errors
3. Verify domain is verified in Resend for sending from `support@grainhousecoffee.com`

### CORS Errors

1. Check browser console for specific CORS error
2. Verify origin is in allowed list (production domains + Vercel previews)
3. Test preflight with OPTIONS request

### 404 on /webhooks/payment

If you're getting 404 on webhook routes:

1. Check Vercel deployment includes the `api/` folder
2. Verify `vercel.json` has the `functions` configuration
3. Ensure rewrites are properly ordered (most specific first)
4. Check Vercel function logs for bundling errors
