# Helcim Payment Integration Setup Guide

This guide covers how to configure and test the Helcim payment integration for the CoffeeStore e-commerce site.

## Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Sandbox vs Production](#sandbox-vs-production)
4. [Webhook Setup](#webhook-setup)
5. [Testing Procedures](#testing-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Overview

The CoffeeStore payment integration uses:
- **Helcim** as the payment processor
- **Netlify Functions** for server-side payment processing
- **Netlify Blobs** for persistent webhook idempotency storage
- **HMAC-SHA256** for webhook signature verification

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client App    │────▶│ Netlify Function │────▶│   Helcim API    │
│  (checkout.js)  │     │   (checkout.js)  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Netlify Blobs  │◀────│ Netlify Function │◀────│ Helcim Webhook  │
│ (idempotency)   │     │(helcim-webhook)  │     │   Notification  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## Environment Configuration

### Required Environment Variables

Set these in **Netlify Dashboard → Site Settings → Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `HELCIM_API_TOKEN` | Yes | Your Helcim API token |
| `HELCIM_WEBHOOK_SECRET` | Recommended | Webhook verification token |
| `SITE_URL` | Yes | Your site URL (e.g., `https://grainhousecoffee.com`) |
| `HELCIM_ENVIRONMENT` | No | `sandbox` or `production` (auto-detected if not set) |

### Setting Environment Variables

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Navigate to **Site Settings → Environment Variables**
4. Click **Add a variable** for each variable
5. **Important**: Set the scope to include **Functions** (required for runtime access)

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your sandbox credentials:
   ```env
   HELCIM_ENVIRONMENT=sandbox
   HELCIM_API_TOKEN=your_sandbox_token_here
   HELCIM_WEBHOOK_SECRET=your_webhook_secret_here
   SITE_URL=http://localhost:8888
   ```

3. Run local development server:
   ```bash
   netlify dev
   ```

---

## Sandbox vs Production

### Automatic Environment Detection

The integration automatically detects the environment based on Netlify's `CONTEXT` variable:

| Netlify Context | Detected Environment |
|-----------------|---------------------|
| `dev` (local) | Sandbox |
| `branch-deploy` | Sandbox |
| `deploy-preview` | Sandbox |
| `production` | Production |

### Manual Override

To explicitly set the environment, use the `HELCIM_ENVIRONMENT` variable:

```env
# Force sandbox mode
HELCIM_ENVIRONMENT=sandbox

# Force production mode
HELCIM_ENVIRONMENT=production
```

### Sandbox Mode Features

When in sandbox mode:
- Invoice numbers are prefixed with `TEST-` for easy identification
- Test card numbers work (real cards are declined)
- No real transactions are processed
- Webhook events are marked as test events

### Test Card Numbers (Sandbox Only)

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0000 0000 9995` | Insufficient funds |

For all test cards:
- **Expiry**: Any future date (e.g., `12/25`)
- **CVV**: Any 3 digits (e.g., `123`)

---

## Webhook Setup

### Webhook URL

Configure your webhook URL in Helcim Dashboard:

```
https://grainhousecoffee.com/webhooks/payment
```

Or use the direct function URL:
```
https://grainhousecoffee.com/.netlify/functions/helcim-webhook
```

### Setting Up Webhooks in Helcim

1. Log in to [Helcim Dashboard](https://secure.myhelcim.com)
2. Navigate to **Integrations → Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL
5. Select the events you want to receive:
   - `payment.success` / `transaction.approved`
   - `payment.failed` / `transaction.declined`
   - `payment.refunded`
6. **Copy the Verifier Token** - this is your `HELCIM_WEBHOOK_SECRET`
7. Save the webhook configuration

### Webhook Signature Verification

The integration uses HMAC-SHA256 to verify webhook authenticity:

1. Helcim signs each webhook with three headers:
   - `webhook-id`: Unique message identifier
   - `webhook-timestamp`: Unix timestamp
   - `webhook-signature`: HMAC-SHA256 signature

2. The signature is verified against:
   ```
   signed_content = "${webhook_id}.${webhook_timestamp}.${body}"
   ```

3. If verification fails, the webhook is rejected with HTTP 401

### Idempotency Protection

Webhooks are protected against duplicate processing:

- **Netlify Blobs**: Persistent storage across function invocations
- **7-day TTL**: Processed event IDs are retained for 7 days
- **Graceful fallback**: In-memory storage if Blobs is unavailable

When a duplicate webhook is detected:
```json
{
  "received": true,
  "duplicate": true,
  "originalProcessedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing Procedures

### 1. Local Testing

```bash
# Start local development server
netlify dev

# Test webhook endpoint (HEAD - validation)
curl -I http://localhost:8888/.netlify/functions/helcim-webhook

# Test webhook endpoint (GET - health check)
curl http://localhost:8888/.netlify/functions/helcim-webhook

# Test webhook endpoint (POST - simulated event)
curl -X POST http://localhost:8888/.netlify/functions/helcim-webhook \
  -H "Content-Type: application/json" \
  -H "webhook-id: test-123" \
  -H "webhook-timestamp: $(date +%s)" \
  -d '{"type":"payment.success","transactionId":"test-txn-001"}'
```

### 2. Deploy Preview Testing

1. Push your changes to a feature branch
2. Netlify creates a deploy preview automatically
3. Test using the preview URL:
   ```
   https://deploy-preview-XX--your-site.netlify.app
   ```

### 3. Production Verification

After deploying to production:

1. **Verify Webhook Health**:
   ```bash
   curl https://grainhousecoffee.com/webhooks/payment
   ```
   Expected response:
   ```json
   {
     "status": "ready",
     "message": "Helcim webhook endpoint is operational",
     "timestamp": "..."
   }
   ```

2. **Test Payment Flow**:
   - Add items to cart
   - Complete checkout with a test card (if in sandbox)
   - Verify webhook is received in Netlify Function logs

3. **Check Netlify Function Logs**:
   - Go to Netlify Dashboard → Functions
   - Select `helcim-webhook`
   - Review recent invocations

### 4. End-to-End Checkout Test

1. Navigate to the store
2. Add a product to cart
3. Proceed to checkout
4. Enter test card details:
   - Number: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVV: `123`
5. Complete payment
6. Verify success page displays
7. Check function logs for webhook receipt

---

## Troubleshooting

### Common Issues

#### Webhook Returns 401 Unauthorized

**Cause**: Missing or invalid webhook secret

**Solution**:
1. Verify `HELCIM_WEBHOOK_SECRET` is set in Netlify environment variables
2. Ensure the secret matches the Verifier Token from Helcim
3. Check that the environment variable scope includes "Functions"

#### Webhook Returns 404 Not Found

**Cause**: Webhook URL not configured correctly

**Solution**:
1. Verify the webhook URL in Helcim Dashboard
2. Check `netlify.toml` has the correct rewrite rule
3. Test with the direct function URL first

#### Duplicate Webhooks Being Processed

**Cause**: Idempotency storage not working

**Solution**:
1. Check Netlify Function logs for storage errors
2. Verify `@netlify/blobs` is in `package.json`
3. Ensure the function has access to Netlify Blobs

#### Payment Gateway Not Configured Error

**Cause**: Missing `HELCIM_API_TOKEN`

**Solution**:
1. Set `HELCIM_API_TOKEN` in Netlify environment variables
2. Verify the token is valid in Helcim Dashboard
3. Check environment variable scope includes "Functions"

### Debug Logging

Enable debug logging by setting:
```env
DEBUG_CHECKOUT=true
```

This will log additional information about:
- API requests to Helcim
- Environment configuration
- Cart and pricing calculations

### Webhook Test Script

Use the included test script:
```bash
./test-webhook.sh
```

---

## Security Best Practices

### Environment Variables

- ✅ Store all secrets in Netlify environment variables
- ✅ Never commit secrets to version control
- ✅ Use different credentials for sandbox and production
- ✅ Rotate API tokens periodically

### Webhook Security

- ✅ Always enable webhook signature verification in production
- ✅ Use HTTPS for all webhook URLs
- ✅ Implement idempotency to prevent duplicate processing
- ✅ Validate timestamp to prevent replay attacks

### Code Security

- ✅ Server-side price validation (never trust client prices)
- ✅ Input sanitization for all user data
- ✅ Payload size limits (1MB max)
- ✅ No sensitive data in logs

### Production Checklist

Before going live:

- [ ] Set `HELCIM_ENVIRONMENT=production` or remove for auto-detection
- [ ] Replace sandbox API token with production token
- [ ] Configure `HELCIM_WEBHOOK_SECRET` from production webhook
- [ ] Verify `SITE_URL` is your production domain
- [ ] Test a real transaction (refund afterward if needed)
- [ ] Monitor function logs for the first few transactions
- [ ] Set up alerts for function errors

---

## Support

For additional help:
- [Helcim API Documentation](https://devdocs.helcim.com)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Webhook Troubleshooting Guide](./WEBHOOK_TROUBLESHOOTING.md)
