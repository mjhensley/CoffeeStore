# Payment Gateway Setup Guide - Helcim Integration

This guide will help you set up the Helcim payment gateway with Netlify to receive actual money from customers.

## Overview

The payment gateway uses **Helcim**, a secure payment processor that handles:
- Credit/debit card payments via HelcimPay.js
- PCI compliance (card data never touches your server)
- Secure payment processing with tokenized checkout
- Lower interchange-plus pricing

## Architecture

```
┌─────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│   Browser       │      │  Netlify Functions  │      │   Helcim API     │
│   (checkout.js) │──────│  (helcim-create-    │──────│   /v2/helcim-pay │
│                 │      │   session.js)       │      │   /initialize    │
└─────────────────┘      └─────────────────────┘      └──────────────────┘
        │                                                      │
        │         ┌─────────────────────────────┐              │
        └─────────│   HelcimPay.js Modal        │◀─────────────┘
                  │   (secure.helcim.app)       │
                  └─────────────────────────────┘
```

## Step 1: Create a Helcim Account

1. Go to [https://www.helcim.com](https://www.helcim.com)
2. Click "Get Started" and create a merchant account
3. Complete the business verification process
4. Add your bank account details to receive payments

## Step 2: Get Your Helcim API Token

1. Log in to your [Helcim Dashboard](https://secure.myhelcim.com)
2. Navigate to **Integrations** → **API Access Configurations**
3. Click **New API Access** to create a new configuration:
   - **Name:** `Website Checkout` (or your preferred name)
   - **Permissions:** Select "Admin" for full transaction abilities
4. Click **Save** and copy your generated **API Token**
5. **IMPORTANT:** This token is secret - never expose it in frontend code!

## Step 3: Configure Netlify Environment Variables

The API token must be stored securely in Netlify environment variables:

### Via Netlify Dashboard (Recommended)

1. Go to your [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable** and add:

| Key | Value | Description |
|-----|-------|-------------|
| `HELCIM_API_TOKEN` | Your Helcim API token | Required for payment processing |
| `SITE_URL` | `https://grainhousecoffee.com` | Your site URL for redirects |
| `HELCIM_WEBHOOK_SECRET` | (optional) | For webhook signature verification |

5. Set **Scopes** to: Production, Deploy previews (as needed)

### Via Netlify CLI

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables
netlify env:set HELCIM_API_TOKEN "your-api-token-here"
netlify env:set SITE_URL "https://grainhousecoffee.com"
```

### For Local Development

Create a `.env` file in your project root (this file should be in `.gitignore`):

```env
HELCIM_API_TOKEN=your-test-api-token
SITE_URL=http://localhost:8888
```

Then run `netlify dev` to test locally with environment variables.

## Step 4: Verify the Implementation

The Helcim integration consists of these key files:

### Netlify Functions (Server-Side)

- **`netlify/functions/helcim-create-session.js`** - Creates secure checkout sessions
  - Validates cart items against server-side product catalog
  - Calculates totals server-side (prevents price manipulation)
  - Calls Helcim API to get checkout token
  - Returns only client-safe data

- **`netlify/functions/helcim-webhook.js`** - Handles Helcim payment events
  - Receives payment success/failure/refund notifications
  - Verifies webhook signatures (if configured)

### Frontend Files

- **`stumptown_static/checkout.html`** - Checkout page with HelcimPay.js integration
- **`stumptown_static/checkout.js`** - Checkout logic and Helcim iframe handling

## Step 5: Test the Payment Gateway

### Test Mode

Helcim provides test credentials for testing:

1. In your Helcim Dashboard, ensure you're in **Test Mode**
2. Use these test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`

Use any:
- **Expiry date:** Future date (e.g., `12/34`)
- **CVV:** Any 3 digits (e.g., `123`)
- **ZIP:** Any valid postal code

### Testing Steps

1. Deploy your site to Netlify (or run `netlify dev` locally)
2. Add items to cart on the website
3. Go to checkout
4. Fill in customer and shipping information
5. Click "Complete Order" to load the HelcimPay.js modal
6. Enter test card details in the secure Helcim form
7. Complete the payment
8. Verify redirect to success page
9. Check your Helcim Dashboard → **Transactions** to see the test payment

### Local Testing with Netlify CLI

```bash
# Start local development server with functions
netlify dev

# Your site will be available at http://localhost:8888
# Functions are available at http://localhost:8888/.netlify/functions/
```

## Step 6: Go Live

When you're ready to accept real payments:

1. In Helcim Dashboard, switch from **Test Mode** to **Live Mode**
2. Create a new API Access Configuration for production (or use the same one)
3. Update the `HELCIM_API_TOKEN` environment variable in Netlify with your live API token
4. Verify `SITE_URL` points to your production domain
5. Trigger a new deploy on Netlify
6. Test with a small real transaction to verify everything works

## How It Works

### Payment Flow

1. **Customer fills checkout form** → Enters customer and shipping info
2. **Clicks "Complete Order"** → Frontend sends cart data to Netlify Function
3. **Server validates cart** → Calculates totals from authoritative product catalog
4. **Server calls Helcim API** → Creates checkout session, gets checkout token
5. **Token returned to browser** → Only client-safe data (no API secrets)
6. **HelcimPay.js modal opens** → Customer enters card in secure Helcim iframe
7. **Payment processed** → Helcim handles all PCI-sensitive operations
8. **Success callback** → Customer redirected to success page
9. **Webhook (optional)** → Helcim notifies server of payment completion

### Security Features

- **PCI Compliance:** All card data handled by Helcim's secure iframe
- **Server-Side Pricing:** Product prices calculated from server catalog (prevents price manipulation)
- **No Exposed Secrets:** API token only exists in Netlify Functions
- **CSP Headers:** Content Security Policy allows only Helcim domains
- **Webhook Verification:** Optional signature verification for webhooks

## Fees

Helcim uses interchange-plus pricing:
- **Interchange-plus 0.3% + $0.08** for most cards
- **Volume discounts** - rates decrease as you process more
- No monthly fees, no setup fees, no hidden fees

Example: A $50 order ≈ $0.23 fee (varies by card type)

## Content Security Policy

The `netlify.toml` includes CSP headers allowing Helcim domains:

```toml
Content-Security-Policy = "...
  script-src 'self' https://secure.helcim.app ...;
  connect-src 'self' https://api.helcim.com https://secure.helcim.app ...;
  frame-src https://secure.helcim.app https://js.helcim.com;
..."
```

**Note:** The HelcimPay.js script is loaded from `https://secure.helcim.app/helcim-pay/services/start.js`, which is covered by allowing `https://secure.helcim.app` in script-src.

## Support

- **Helcim Developer Docs:** [https://devdocs.helcim.com](https://devdocs.helcim.com)
- **HelcimPay.js Overview:** [https://devdocs.helcim.com/docs/overview-of-helcimpayjs](https://devdocs.helcim.com/docs/overview-of-helcimpayjs)
- **Helcim API Reference:** [https://devdocs.helcim.com/reference](https://devdocs.helcim.com/reference)
- **Netlify Functions Docs:** [https://docs.netlify.com/functions/overview](https://docs.netlify.com/functions/overview)

## Troubleshooting

### "Payment system not configured" error
- Check that `HELCIM_API_TOKEN` is set in Netlify environment variables
- Verify the token is correct (no extra spaces)
- Check Netlify Functions logs for detailed error messages

### "Failed to create checkout session" error
- Verify your Helcim API token has correct permissions
- Check if you're in Test vs Live mode
- Review the Netlify Functions logs: Site Dashboard → Functions → helcim-create-session

### HelcimPay.js modal doesn't appear
- Check browser console for JavaScript errors
- Verify CSP headers allow Helcim domains
- Ensure the Helcim script URL is correct: `https://secure.helcim.app/helcim-pay/services/start.js`

### Payment succeeds but order not created
- Check Netlify Functions logs for errors
- Verify webhook is configured in Helcim Dashboard (optional)
- Check browser console for errors after payment

### CORS errors
- Ensure your site URL matches what's configured in Helcim
- Verify the Netlify Function returns proper CORS headers

## Webhook Setup (Optional)

For real-time payment notifications:

1. In Helcim Dashboard, go to **Integrations** → **Webhooks**
2. Add a new webhook:
   - **URL:** `https://your-site.netlify.app/.netlify/functions/helcim-webhook`
   - **Events:** Select payment events you want to receive
3. Copy the webhook secret and add to Netlify environment variables:
   ```
   HELCIM_WEBHOOK_SECRET=your-webhook-secret
   ```

## Files Reference

| File | Purpose |
|------|---------|
| `netlify/functions/helcim-create-session.js` | Creates secure checkout sessions |
| `netlify/functions/helcim-webhook.js` | Handles payment webhooks |
| `stumptown_static/checkout.html` | Checkout page UI |
| `stumptown_static/checkout.js` | Checkout logic |
| `stumptown_static/success.html` | Payment success page |
| `stumptown_static/cancel.html` | Payment cancelled page |
| `netlify.toml` | Netlify config with CSP headers |
| `.env.example` | Example environment variables |



