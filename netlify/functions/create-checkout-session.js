/**
 * Netlify Function: Create Checkout Session
 * 
 * This function creates a hosted checkout session with the payment processor.
 * It validates the public token, fetches payment details from Snipcart,
 * and returns a redirect URL for the customer.
 * 
 * Flow:
 * 1. Validate publicToken with Snipcart
 * 2. Fetch payment session details (amount, currency) from Snipcart
 * 3. Create hosted checkout with payment adapter
 * 4. Return redirect URL to frontend
 * 
 * **IMPORTANT**: Always fetch amounts server-side. Never trust client-provided amounts.
 */

const { validatePublicToken, getPaymentSession } = require('./lib/snipcart');
const paymentAdapter = require('./payfac/mock'); // Import the payment adapter

/**
 * Get allowed origins for CORS
 */
function getAllowedOrigins() {
  const origins = [
    'https://app.snipcart.com',
    'https://cdn.snipcart.com'
  ];
  
  if (process.env.SITE_URL) {
    origins.push(process.env.SITE_URL);
  }
  
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:8888', 'http://localhost:8080', 'http://127.0.0.1:8888');
  }
  
  return origins;
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { publicToken } = JSON.parse(event.body || '{}');

    if (!publicToken) {
      console.error('[Create Checkout] No public token provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Public token is required' })
      };
    }

    // Step 1: Validate the public token with Snipcart
    console.log('[Create Checkout] Validating public token...');
    const isValid = await validatePublicToken(publicToken);
    
    if (!isValid) {
      console.error('[Create Checkout] Invalid public token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid public token' })
      };
    }

    // Step 2: Fetch payment session details from Snipcart
    // CRITICAL: Always get the amount from Snipcart server-side, never trust client
    console.log('[Create Checkout] Fetching payment session from Snipcart...');
    const session = await getPaymentSession(publicToken);

    if (!session || !session.invoice) {
      console.error('[Create Checkout] Invalid session data');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payment session' })
      };
    }

    // Extract invoice details (server-side source of truth)
    const amount = session.invoice.total;
    const currency = session.invoice.currency || 'usd';

    console.log('[Create Checkout] Session details:', {
      amount: amount,
      currency: currency,
      itemCount: session.invoice.items?.length || 0
    });

    // Convert amount to smallest currency unit (e.g., cents for USD)
    const amountInCents = Math.round(amount * 100);

    // Step 3: Create hosted checkout session with payment adapter
    const siteUrl = process.env.SITE_URL || 'http://localhost:8888';
    
    console.log('[Create Checkout] Creating hosted checkout session...');
    const checkout = await paymentAdapter.createHostedCheckout({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        publicToken: publicToken,
        orderSource: 'snipcart',
        createdAt: new Date().toISOString()
      },
      successUrl: `${siteUrl}/payment-success.html?token=${publicToken}`,
      cancelUrl: `${siteUrl}/payment-cancelled.html?token=${publicToken}`
    });

    console.log('[Create Checkout] Checkout session created:', {
      sessionId: checkout.sessionId,
      hasRedirectUrl: !!checkout.redirectUrl
    });

    // Step 4: Return redirect URL to frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        redirectUrl: checkout.redirectUrl,
        sessionId: checkout.sessionId
      })
    };

  } catch (error) {
    console.error('[Create Checkout] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create checkout session',
        message: error.message 
      })
    };
  }
};
