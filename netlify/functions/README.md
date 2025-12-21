# Netlify Functions - Payment Processing

This directory contains serverless functions for processing payments with Helcim.

## Helcim Payment Functions (Current)

### `checkout.js` ✨ NEW

Production-ready checkout function that creates secure payment sessions with Helcim API.

**Endpoint:** `POST /.netlify/functions/checkout`

**Security Features:**
- Server-side product catalog with price verification
- Input validation and sanitization
- Payload size limits (1MB max for safety)
- Token-based authentication with Helcim API
- No sensitive credit card details logged
- PCI-compliant payment processing

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
  "serverCalculatedTotals": {
    "subtotal": 74.00,
    "shipping": 5.99,
    "tax": 5.18,
    "total": 85.17
  }
}
```

### `helcim-webhook.js` ✨ NEW

Handles payment event webhooks from Helcim with signature verification and idempotency.

**Endpoint:** `POST /.netlify/functions/helcim-webhook`

**Events Handled:**
- `payment.success` / `transaction.approved` - Payment completed
- `payment.failed` / `transaction.declined` - Payment failed
- `payment.refunded` - Payment refunded

**Security Features:**
- HMAC-SHA256 signature verification
- Idempotency handling (prevents duplicate processing)
- No sensitive payment data logged

**Setup:**
1. In Helcim Dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-site.netlify.app/.netlify/functions/helcim-webhook`
3. (Optional) Set `HELCIM_WEBHOOK_SECRET` environment variable for signature verification

### `helcim-create-session.js` (Legacy)

Creates a secure checkout session with the Helcim API.

**Endpoint:** `POST /.netlify/functions/helcim-create-session`

**Request Body:**
```json
{
  "cart": [
    { "id": "hair-bender", "name": "Hair Bender", "quantity": 2, "price": 37.00 }
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
  "checkoutToken": "abc123...",
  "sessionId": "sess_123",
  "invoiceNumber": "GH-1234567890",
  "serverCalculatedTotals": {
    "subtotal": 74.00,
    "shipping": 5.99,
    "tax": 5.18,
    "total": 85.17
  }
}
```

**Security Features:**
- All prices are calculated server-side from `PRODUCT_CATALOG`
- Client-submitted totals are ignored (prevents price manipulation)
- API token stored securely in environment variables
- Only client-safe data returned (no secrets)

### `helcim-webhook.js`

Handles payment event webhooks from Helcim.

**Endpoint:** `POST /.netlify/functions/helcim-webhook`

**Events Handled:**
- `payment.success` / `transaction.approved` - Payment completed
- `payment.failed` / `transaction.declined` - Payment failed
- `payment.refunded` - Payment refunded

**Setup:**
1. In Helcim Dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-site.netlify.app/.netlify/functions/helcim-webhook`
3. (Optional) Set `HELCIM_WEBHOOK_SECRET` environment variable for signature verification

## Legacy Stripe Functions (Deprecated)

The following functions are from the previous Stripe integration and are kept for backwards compatibility:

- `create-payment-intent.js` - Creates Stripe payment intents (deprecated)
- `confirm-payment.js` - Confirms Stripe payments (deprecated)

These functions require `STRIPE_SECRET_KEY` environment variable and are not used in the current Helcim-based checkout flow.

## Environment Variables

Required environment variables (set in Netlify Dashboard):

| Variable | Description |
|----------|-------------|
| `HELCIM_API_TOKEN` | Your Helcim API token |
| `SITE_URL` | Your site URL for redirects |
| `HELCIM_WEBHOOK_SECRET` | (Optional) Webhook signature secret |

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
