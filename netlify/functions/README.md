# Netlify Functions

This directory contains serverless functions for the Coffee Store.

## Current Functions

### `helcim-webhook.js`

Handles payment event webhooks from Helcim payment gateway.

**Endpoint:** `/.netlify/functions/helcim-webhook`

**Supported HTTP Methods:**
- `HEAD` - Used by Helcim to validate the webhook URL during configuration
- `GET` - Health check endpoint, returns operational status
- `POST` - Receives webhook events from Helcim
- `OPTIONS` - CORS preflight support

**Events Handled:**
- `payment.success` / `transaction.approved` - Payment completed
- `payment.failed` / `transaction.declined` - Payment failed
- `payment.refunded` - Payment refunded

**Setup:**
1. In Helcim Dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-site.netlify.app/.netlify/functions/helcim-webhook`
3. Helcim will validate the URL with a HEAD request - the function returns 200 OK
4. (Optional) Set `HELCIM_WEBHOOK_SECRET` environment variable for signature verification

**Key Features:**
- Responds to HEAD requests for Helcim's URL validation (fixes 400 error during setup)
- Handles CORS for cross-origin requests
- Logs all webhook events for debugging
- Returns 200 OK for all events to prevent retries

### `health.js`

Health check endpoint for monitoring deployment status.

**Endpoint:** `GET /.netlify/functions/health`

Returns configuration status without exposing secrets.

### `send-contact-email.js`

Sends contact form emails using Resend API.

**Endpoint:** `POST /.netlify/functions/send-contact-email`

## Environment Variables

Required environment variables (set in Netlify Dashboard → Site settings → Environment variables):

| Variable | Description | Required |
|----------|-------------|----------|
| `HELCIM_WEBHOOK_SECRET` | (Optional) Webhook signature secret for verification | No |
| `SITE_URL` | Your site URL for redirects | Yes |

## Local Development

```bash
# Install dependencies
cd netlify/functions
npm install

# Run with Netlify CLI (from project root)
netlify dev
```

## Testing

Use Helcim test mode with test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Any future expiry date and any 3-digit CVV

## API Reference

- [Helcim API Docs](https://devdocs.helcim.com)
- [HelcimPay.js Initialize](https://devdocs.helcim.com/docs/initialize-helcimpayjs)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
