// Netlify Serverless Function - Create Stripe Payment Intent
// This function securely creates a payment intent on the server side
// Never expose your Stripe secret key to the client!

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get allowed origins for CORS
 * @returns {string[]} - Array of allowed origins
 */
function getAllowedOrigins() {
  const origins = [
    'https://grainhousecoffee.com',
    'https://www.grainhousecoffee.com'
  ];
  // Allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:8080', 'http://localhost:8888', 'http://127.0.0.1:8080');
  }
  return origins;
}

exports.handler = async (event, context) => {
  // Get the origin from the request
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  // CORS headers with restricted origin
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
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
    const { amount, currency = 'usd', metadata = {} } = JSON.parse(event.body);

    // Validate amount
    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid amount' })
      };
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        created_at: new Date().toISOString()
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create payment intent'
      })
    };
  }
};



