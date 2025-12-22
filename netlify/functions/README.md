# Netlify Functions - Payment Processing

This directory contains serverless functions for processing payments with Helcim.

## Directory Structure

```
netlify/functions/
├── checkout.js              # Creates secure checkout sessions
├── helcim-webhook.js        # Handles Helcim payment webhooks
├── health.js                # Health check endpoint
├── send-contact-email.js    # Contact form handler
├── package.json             # Dependencies
└── lib/                     # Shared utilities
    ├── helcim-config.js     # Environment-based configuration
    └── idempotency.js       # Persistent webhook idempotency
```

## Functions

### `checkout.js`

Creates secure checkout sessions with Helcim API.

**Endpoint:** `POST /.netlify/functions/checkout`

**Security Features:**
- Server-side product catalog with price verification
- Input validation and sanitization
- Payload size limits (1MB max)
- Environment-based API configuration (sandbox/production)
- No sensitive credit card details logged

**Request Body:**
```json
{
  "cart": [
    {
      "id": "hair-bender",
      "quantity": 2,
      "size": "12oz",
      "isSubscription": false
    }
  ],
  "customer": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "555-1234"
  },
  "shipping": {
    "address": "123 Main St",
    "city": "Portland",
    "state": "OR",
    "zip": "97201",
    "country": "US"
  },
  "shippingMethod": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutToken": "tok_abc123...",
  "sessionId": "sess_123",
  "invoiceNumber": "GH-1234567890",
  "environment": "sandbox",
  "serverCalculatedTotals": {
    "subtotal": 74.00,
    "shipping": 5.99,
    "tax": 5.18,
    "total": 85.17
  }
}
```

### `helcim-webhook.js`

Handles payment event webhooks from Helcim with signature verification and persistent idempotency.

**Endpoints:**
- Direct: `/.netlify/functions/helcim-webhook`
- Friendly: `/webhooks/payment` (rewritten via netlify.toml)

**HTTP Methods:**
- `HEAD` - URL validation (Helcim uses this during webhook setup)
- `GET` - Health check, returns operational status
- `GET ?check=<value>` - Echo validation (returns the check value)
- `POST` - Receives webhook events from Helcim
- `OPTIONS` - CORS preflight support

**Events Handled:**
- `payment.success` / `transaction.approved` - Payment completed
- `payment.failed` / `transaction.declined` - Payment failed
- `payment.refunded` - Payment refunded

**Security Features:**
- HMAC-SHA256 signature verification
- Timestamp validation (5-minute window) to prevent replay attacks
- Persistent idempotency via Netlify Blobs
- Graceful fallback to in-memory storage

### `health.js`

Health check endpoint for monitoring.

**Endpoint:** `GET /.netlify/functions/health`

### `send-contact-email.js`

Sends contact form emails using Resend API.

**Endpoint:** `POST /.netlify/functions/send-contact-email`

## Shared Utilities

### `lib/helcim-config.js`

Environment-based configuration for Helcim API.

**Features:**
- Automatic sandbox/production detection based on Netlify context
- Centralized API configuration
- Test card numbers for sandbox mode

**Usage:**
```javascript
const { getConfig, getApiHeaders, validateConfig } = require('./lib/helcim-config');

const config = getConfig();
console.log(config.environment); // 'sandbox' or 'production'
console.log(config.isSandbox);   // true/false

const headers = getApiHeaders();
// Returns configured API headers with token
```

### `lib/idempotency.js`

Persistent idempotency storage using Netlify Blobs.

**Features:**
- Prevents duplicate webhook processing
- 7-day TTL for processed events
- Falls back to in-memory storage if Blobs unavailable

**Usage:**
```javascript
const { isEventProcessed, markEventProcessed } = require('./lib/idempotency');

// Check if event was already processed
const result = await isEventProcessed('webhook-id-123');
if (result.processed) {
  console.log('Duplicate detected');
  return;
}

// Mark event as processed
await markEventProcessed('webhook-id-123', { eventType: 'payment.success' });
```

## Environment Variables

Set these in **Netlify Dashboard → Site Settings → Environment Variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `HELCIM_API_TOKEN` | Helcim API token | Yes |
| `HELCIM_WEBHOOK_SECRET` | Webhook signature verification token | Recommended |
| `SITE_URL` | Your site URL for redirects | Yes |
| `HELCIM_ENVIRONMENT` | `sandbox` or `production` (auto-detected if not set) | No |
| `DEBUG_CHECKOUT` | Enable debug logging | No |

## Local Development

```bash
# Install dependencies
cd netlify/functions
npm install

# Run with Netlify CLI (from project root)
netlify dev
```

## Testing

### Test Cards (Sandbox Only)

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date and any 3-digit CVV.

### Webhook Testing

```bash
# Test HEAD request (validation)
curl -I http://localhost:8888/.netlify/functions/helcim-webhook

# Test GET request (health check)
curl http://localhost:8888/.netlify/functions/helcim-webhook

# Test POST request (simulated webhook)
curl -X POST http://localhost:8888/.netlify/functions/helcim-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment.success","transactionId":"test-123"}'
```

## Documentation

- [Payment Setup Guide](../../PAYMENT_SETUP.md)
- [Webhook Troubleshooting](../../WEBHOOK_TROUBLESHOOTING.md)
- [Helcim API Docs](https://devdocs.helcim.com)
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
