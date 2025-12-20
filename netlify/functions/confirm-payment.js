// Netlify Serverless Function - Confirm Payment and Process Order
// This function confirms the payment and creates the order record

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
    const { paymentIntentId, orderData } = JSON.parse(event.body);

    // Validate required fields
    if (!paymentIntentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payment intent ID is required' })
      };
    }

    // Retrieve the payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment not completed',
          status: paymentIntent.status
        })
      };
    }

    // Generate order number
    const orderNumber = `GH-${Date.now().toString(36).toUpperCase()}`;

    // Here you would typically:
    // 1. Save order to database
    // 2. Update inventory
    // 3. Send confirmation email
    // 4. Create shipping label
    // etc.

    // For now, we'll return success with order details
    // You can extend this to save to a database (e.g., MongoDB, PostgreSQL, etc.)
    
    const order = {
      orderNumber,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      status: 'confirmed',
      customer: orderData?.customer || {},
      items: orderData?.items || [],
      shipping: orderData?.shipping || {},
      createdAt: new Date().toISOString()
    };

    // Send order confirmation email (if orderData is provided)
    if (orderData?.customer?.email) {
      try {
        // Call the send-order-email function
        const emailResponse = await fetch(`${process.env.URL || 'http://localhost:8888'}/.netlify/functions/send-order-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: orderData.customer.email,
            customerName: `${orderData.customer.firstName || ''} ${orderData.customer.lastName || ''}`.trim(),
            items: orderData.items || [],
            subtotal: order.amount,
            orderNumber: orderNumber
          })
        });
        
        if (!emailResponse.ok) {
          console.warn('Failed to send order confirmation email');
        }
      } catch (emailError) {
        console.error('Error sending order email:', emailError);
        // Don't fail the order if email fails
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: order
      })
    };

  } catch (error) {
    console.error('Payment confirmation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to confirm payment'
      })
    };
  }
};



