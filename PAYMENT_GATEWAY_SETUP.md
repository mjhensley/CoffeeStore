# Payment Gateway Setup Guide

This guide will help you set up a real payment gateway to receive actual money from customers.

## Overview

The payment gateway uses **Stripe**, a secure payment processor that handles:
- Credit/debit card payments
- Automatic fraud detection (minimal, built-in)
- PCI compliance (you never handle raw card data)
- Secure payment processing

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Sign up" and create an account
3. Complete the business verification process
4. Add your bank account details to receive payments

## Step 2: Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. You'll see two keys:
   - **Publishable key** (starts with `pk_`) - Safe to expose in frontend
   - **Secret key** (starts with `sk_`) - **NEVER expose this!**

## Step 3: Configure Your Site

### Frontend Configuration (config.js)

1. Copy `config.example.js` to `config.js`:
   ```bash
   cp stumptown_static/config.example.js stumptown_static/config.js
   ```

2. Open `stumptown_static/config.js` and add your Stripe publishable key:
   ```javascript
   const CONFIG = {
       stripePublishableKey: 'pk_test_...', // Your publishable key
       googlePlacesApiKey: 'YOUR_GOOGLE_PLACES_API_KEY_HERE' // Optional
   };
   ```

### Backend Configuration (Netlify Environment Variables)

1. Go to your [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add the following:
   - **Key:** `STRIPE_SECRET_KEY`
   - **Value:** Your Stripe secret key (starts with `sk_`)
   - **Scopes:** Production, Deploy previews, Branch deploys (as needed)

## Step 4: Install Stripe Package for Netlify Functions

The Netlify Functions need the Stripe Node.js package. Create a `package.json` in the `netlify/functions` directory:

```bash
cd netlify/functions
npm init -y
npm install stripe
```

Or add this to your root `package.json`:

```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

## Step 5: Test the Payment Gateway

### Test Mode

Stripe provides test cards for testing:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires authentication:** `4000 0025 0000 3155`

Use any:
- **Expiry date:** Future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Testing Steps

1. Make sure your site is deployed to Netlify
2. Add items to cart
3. Go to checkout
4. Enter test card details
5. Complete the payment
6. Check your Stripe Dashboard → **Payments** to see the test payment

## Step 6: Go Live

When you're ready to accept real payments:

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Get your **Live** API keys (different from test keys)
3. Update `config.js` with your live publishable key
4. Update Netlify environment variable with your live secret key
5. Redeploy your site

## How It Works

### Payment Flow

1. **Customer fills checkout form** → Enters shipping info
2. **Selects payment method** → Credit card or PayPal
3. **Clicks "Pay now"** → Frontend creates payment intent
4. **Stripe Elements** → Securely collects card details (never touches your server)
5. **Payment confirmation** → Stripe processes payment
6. **Order creation** → Server confirms payment and creates order
7. **Email sent** → Customer receives confirmation email

### Security Features

- **PCI Compliance:** Stripe handles all card data, you never see it
- **Fraud Detection:** Stripe's Radar automatically detects suspicious transactions
- **3D Secure:** Supports additional authentication when required
- **Encryption:** All data is encrypted in transit and at rest

## Fees

Stripe charges:
- **2.9% + $0.30** per successful card charge
- No monthly fees
- No setup fees
- No hidden fees

Example: A $50 order = $1.75 fee, you receive $48.25

## Support

- **Stripe Documentation:** [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support:** Available in your dashboard
- **Test Mode:** Use test cards to avoid real charges during development

## Troubleshooting

### Payment fails with "Payment intent not found"
- Check that `STRIPE_SECRET_KEY` is set in Netlify environment variables
- Verify the key is correct (starts with `sk_`)

### "Stripe is not defined" error
- Check that Stripe.js is loading (check browser console)
- Verify `stripePublishableKey` is set in `config.js`

### Payment succeeds but order not created
- Check Netlify Functions logs
- Verify `send-order-email` function is working
- Check browser console for errors

## Next Steps

- Set up webhooks for real-time payment notifications
- Add order management system
- Integrate with shipping providers
- Set up refund handling
- Add subscription support (for coffee subscriptions)



