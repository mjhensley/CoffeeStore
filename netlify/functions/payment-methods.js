/**
 * Netlify Function: Payment Methods
 * 
 * This function implements the Snipcart Custom Payment Gateway API.
 * It returns a list of custom payment methods to display in Snipcart's checkout.
 * 
 * Snipcart calls this endpoint to fetch available payment methods.
 * 
 * @see https://docs.snipcart.com/v3/custom-payment-gateway/technical-reference
 */

const { validatePublicToken } = require('./lib/snipcart');

/**
 * Get allowed origins for CORS
 */
function getAllowedOrigins() {
  const origins = [
    'https://app.snipcart.com',
    'https://cdn.snipcart.com'
  ];
  
  // Add site URL if configured
  if (process.env.SITE_URL) {
    origins.push(process.env.SITE_URL);
  }
  
  // Allow localhost in development
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

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract public token from query parameters
    const publicToken = event.queryStringParameters?.publicToken;

    if (!publicToken) {
      console.error('[Payment Methods] No public token provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Public token is required' })
      };
    }

    // Validate the public token with Snipcart
    const isValid = await validatePublicToken(publicToken);
    
    if (!isValid) {
      console.error('[Payment Methods] Invalid public token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid public token' })
      };
    }

    // Get the site URL for constructing the checkout URL
    const siteUrl = process.env.SITE_URL || 'http://localhost:8888';
    const checkoutUrl = `${siteUrl}/custom-checkout.html`;

    // Return the custom payment method(s)
    // This follows the Snipcart Custom Payment Gateway specification
    const paymentMethods = [
      {
        id: 'custom_gateway',
        name: 'Credit Card',
        checkoutUrl: checkoutUrl,
        iconUrl: `${siteUrl}/images/credit-card-icon.svg` // Optional: add your own icon
      }
    ];

    console.log('[Payment Methods] Returning payment methods:', {
      token: publicToken.substring(0, 20) + '...',
      checkoutUrl: checkoutUrl,
      methodCount: paymentMethods.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(paymentMethods)
    };

  } catch (error) {
    console.error('[Payment Methods] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch payment methods',
        message: error.message 
      })
    };
  }
};
