# Custom Payment Gateway Architecture

This document describes the processor-agnostic custom payment gateway implementation for Snipcart.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Setup Instructions](#setup-instructions)
- [How It Works](#how-it-works)
- [Swapping Payment Processors](#swapping-payment-processors)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

This implementation provides a **processor-agnostic** payment gateway for Snipcart. It's designed to work with any payment processor (Stripe, Square, Adyen, etc.) without changing the core logic.

### Key Features

✅ **Processor Agnostic** - Swap payment processors by creating a new adapter  
✅ **Server-Side Amount Validation** - Never trusts client-provided amounts  
✅ **Secure Webhook Handling** - Verifies all webhooks before processing  
✅ **Idempotent Operations** - Handles duplicate webhooks gracefully  
✅ **Mock Implementation** - Works end-to-end without a real processor  
✅ **Clean Separation** - Snipcart logic separate from processor logic  

## Architecture

### Components

```
┌─────────────────┐
│   Snipcart      │
│   Checkout      │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌────────────────────┐           ┌──────────────────┐
│  payment-methods   │           │  custom-checkout │
│  (Function)        │           │  (HTML Page)     │
└────────┬───────────┘           └────────┬─────────┘
         │                                 │
         │ Returns custom                  │
         │ payment method                  │
         │                                 ▼
         │                    ┌────────────────────────┐
         │                    │ create-checkout-       │
         │                    │ session (Function)     │
         │                    └────────┬───────────────┘
         │                             │
         │                             │ Creates hosted
         │                             │ checkout session
         │                             │
         │                             ▼
         │                    ┌─────────────────┐
         │                    │ Payment Adapter │
         │                    │ (mock.js)       │
         │                    └────────┬────────┘
         │                             │
         │                             │ Returns
         │                             │ redirect URL
         │                             │
         ▼                             ▼
┌────────────────────────────────────────────┐
│          Payment Processor                 │
│     (Simulated by mock adapter)            │
└────────────────┬───────────────────────────┘
                 │
                 │ Sends webhook
                 │ on payment success
                 │
                 ▼
        ┌────────────────────┐
        │ processor-webhook  │
        │ (Function)         │
        └────────┬───────────┘
                 │
                 │ Confirms payment
                 │
                 ▼
        ┌────────────────────┐
        │   Snipcart API     │
        │ (Order confirmed)  │
        └────────────────────┘
```

## File Structure

```
/
├── custom-checkout.html              # External checkout redirect page
├── netlify.toml                      # Netlify configuration
├── PAYMENT_GATEWAY.md               # This file
└── netlify/
    └── functions/
        ├── payment-methods.js        # Returns custom payment methods to Snipcart
        ├── create-checkout-session.js # Creates hosted checkout session
        ├── processor-webhook.js      # Handles payment processor webhooks
        ├── lib/
        │   └── snipcart.js          # Snipcart API utilities
        └── payfac/
            ├── adapter.js           # Payment adapter interface
            └── mock.js              # Mock payment adapter implementation
```

## Setup Instructions

### 1. Configure Snipcart

Add the custom payment gateway to your Snipcart dashboard:

1. Log in to [Snipcart Dashboard](https://app.snipcart.com)
2. Go to **Account** → **Gateways**
3. Click **Add a custom gateway**
4. Configure:
   - **Name**: Custom Payment Gateway
   - **Payment methods endpoint**: `https://your-site.com/.netlify/functions/payment-methods`
   - **Payment webhook endpoint**: `https://your-site.com/.netlify/functions/processor-webhook`

### 2. Set Environment Variables

Configure these environment variables in Netlify:

**Required:**
- `SNIPCART_SECRET_API_KEY` - Your Snipcart secret API key
- `SITE_URL` - Your site's base URL (e.g., `https://your-site.com`)

**Optional (for real processor):**
- `PAYMENT_WEBHOOK_SECRET` - Webhook signing secret from your payment processor
- Processor-specific API keys (add when you create a real adapter)

To set environment variables in Netlify:
1. Go to **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Enter the key and value
4. Save and redeploy

### 3. Get Your Snipcart API Key

1. Log in to [Snipcart Dashboard](https://app.snipcart.com)
2. Go to **Account** → **API Keys**
3. Copy your **Secret API Key** (starts with a long string)
4. Add it to Netlify environment variables as `SNIPCART_SECRET_API_KEY`

## How It Works

### Payment Flow

1. **Customer initiates checkout** → Adds items to cart in Snipcart
2. **Snipcart requests payment methods** → Calls `payment-methods.js`
3. **Customer selects custom payment** → Snipcart redirects to `custom-checkout.html`
4. **Frontend requests checkout session** → Calls `create-checkout-session.js`
5. **Backend validates with Snipcart** → Fetches amount and currency server-side
6. **Backend creates hosted checkout** → Uses payment adapter to get redirect URL
7. **Customer redirected to payment page** → Completes payment on processor's site
8. **Processor sends webhook** → Calls `processor-webhook.js`
9. **Backend confirms payment** → Calls Snipcart API to mark order as paid
10. **Order completed** → Customer receives confirmation

### Security Flow

```
Client → Never trusts client amounts
  ↓
Server → Fetches amounts from Snipcart API
  ↓
Server → Creates payment with adapter
  ↓
Processor → Sends webhook with signature
  ↓
Server → Verifies webhook signature
  ↓
Server → Confirms payment with Snipcart
```

## Swapping Payment Processors

The system is designed to make swapping payment processors easy. Here's how:

### Step 1: Create a New Adapter

Create a new file in `netlify/functions/payfac/` (e.g., `stripe.js`, `square.js`, etc.):

```javascript
// netlify/functions/payfac/stripe.js
const { PaymentAdapter } = require('./adapter');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripePaymentAdapter extends PaymentAdapter {
  async createHostedCheckout({ amount, currency, metadata, successUrl, cancelUrl }) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          unit_amount: amount,
          product_data: { name: 'Order' }
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata
    });

    return {
      redirectUrl: session.url,
      sessionId: session.id
    };
  }

  async verifyWebhook(request, webhookSecret) {
    const sig = request.headers['stripe-signature'];
    return stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  }

  extractPublicToken(event) {
    return event.data?.object?.metadata?.publicToken || null;
  }

  getTransactionId(event) {
    return event.data?.object?.id || event.id;
  }

  getPaymentStatus(event) {
    if (event.type === 'checkout.session.completed') {
      return 'succeeded';
    }
    return 'pending';
  }
}

module.exports = new StripePaymentAdapter();
```

### Step 2: Update the Import

Change the adapter import in your functions:

```javascript
// Before (mock):
const paymentAdapter = require('./payfac/mock');

// After (Stripe):
const paymentAdapter = require('./payfac/stripe');
```

Update this line in:
- `netlify/functions/create-checkout-session.js`
- `netlify/functions/processor-webhook.js`

### Step 3: Add Environment Variables

Add processor-specific environment variables:

For Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

For Square:
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_WEBHOOK_SECRET`

### Step 4: Install Dependencies

Add the processor's SDK to `netlify/functions/package.json`:

```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

### Step 5: Deploy

Deploy your site and the changes will take effect immediately.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SNIPCART_SECRET_API_KEY` | Snipcart secret API key | `YOUR_SNIPCART_KEY` |
| `SITE_URL` | Base URL of your site | `https://your-site.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PAYMENT_WEBHOOK_SECRET` | Webhook signing secret | `mock_webhook_secret` |
| `NODE_ENV` | Environment mode | (auto-detected) |

### Processor-Specific Variables

Add these when using a real payment processor:

**Stripe:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Square:**
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_WEBHOOK_SECRET`
- `SQUARE_ENVIRONMENT` (`production` or `sandbox`)

**Adyen:**
- `ADYEN_API_KEY`
- `ADYEN_MERCHANT_ACCOUNT`
- `ADYEN_HMAC_KEY`

## Testing

### Testing with Mock Adapter

The mock adapter is included for testing without a real payment processor:

1. **Add items to cart** in Snipcart
2. **Proceed to checkout**
3. **Select the custom payment method**
4. **You'll be redirected** to `custom-checkout.html`
5. **Frontend calls** `create-checkout-session`
6. **Backend returns** a mock redirect URL
7. **You'll see** a mock payment page (if created)

### Testing Webhooks Locally

Use a tool like ngrok to expose your local server:

```bash
# Start local server
netlify dev

# In another terminal, start ngrok
ngrok http 8888

# Use the ngrok URL in your webhook configuration
```

### Mock Webhook Testing

You can trigger mock webhooks programmatically:

```javascript
// In your test file or browser console
const mockWebhook = {
  type: 'payment.succeeded',
  sessionId: 'mock_session_123',
  status: 'succeeded',
  publicToken: 'YOUR_PUBLIC_TOKEN',
  metadata: {
    publicToken: 'YOUR_PUBLIC_TOKEN'
  }
};

fetch('/.netlify/functions/processor-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(mockWebhook)
});
```

## Security

### Best Practices Implemented

✅ **Never trust client amounts** - Always fetch from Snipcart server-side  
✅ **Verify all webhooks** - Check signatures before processing  
✅ **Use HTTPS everywhere** - Netlify provides automatic SSL  
✅ **Store secrets securely** - Use environment variables, never commit secrets  
✅ **Idempotent webhook handling** - Process each webhook only once  
✅ **Server-side payment confirmation** - Never confirm from client  

### CORS Configuration

The functions allow requests from:
- `https://app.snipcart.com`
- `https://cdn.snipcart.com`
- Your site's URL (from `SITE_URL` env var)
- `localhost` (in development only)

### Webhook Security

1. **Signature Verification**: All webhooks are verified before processing
2. **Idempotent Handling**: Duplicate webhooks are detected and ignored
3. **Public Token Validation**: Tokens are validated with Snipcart API

## Troubleshooting

### Payment method not showing in Snipcart

- Check that `payment-methods.js` is deployed
- Verify the endpoint URL in Snipcart dashboard
- Check Netlify function logs for errors
- Ensure `SNIPCART_SECRET_API_KEY` is set

### Checkout redirect fails

- Verify `SITE_URL` environment variable is set correctly
- Check that `custom-checkout.html` is accessible
- Look for errors in browser console
- Check `create-checkout-session` function logs

### Order stays in "pending" state

- Verify webhook endpoint is configured in Snipcart dashboard
- Check that `processor-webhook.js` is receiving webhooks
- Ensure webhook signature verification is passing
- Check Netlify function logs for errors

### Invalid public token errors

- Verify `SNIPCART_SECRET_API_KEY` is correct
- Check that the token hasn't expired
- Ensure the token is being passed correctly in requests

### Function logs not showing

Access logs in Netlify:
1. Go to **Functions** tab in Netlify dashboard
2. Click on a function name
3. View recent logs and errors

## Extension Points

The architecture is designed for easy extension:

### Add Multiple Payment Methods

Modify `payment-methods.js` to return multiple methods:

```javascript
const paymentMethods = [
  {
    id: 'credit_card',
    name: 'Credit Card',
    checkoutUrl: `${siteUrl}/custom-checkout.html?method=card`
  },
  {
    id: 'paypal',
    name: 'PayPal',
    checkoutUrl: `${siteUrl}/custom-checkout.html?method=paypal`
  }
];
```

### Add Order Processing

Extend `processor-webhook.js` to:
- Save orders to a database
- Send custom email notifications
- Update inventory
- Create shipping labels
- Trigger fulfillment workflows

### Add Custom Validation

Extend `create-checkout-session.js` to:
- Validate customer information
- Apply custom business rules
- Check inventory availability
- Calculate custom fees or discounts

## Support

- **Snipcart Docs**: https://docs.snipcart.com/v3/custom-payment-gateway
- **Netlify Docs**: https://docs.netlify.com/functions/overview/
- **This Repository**: Check the code comments for detailed explanations

## License

This implementation is provided as-is for use with the CoffeeStore project.
