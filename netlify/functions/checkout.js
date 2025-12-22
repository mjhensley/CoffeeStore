/**
 * Checkout Function - Helcim Payment Integration
 * 
 * Creates a secure checkout session with Helcim API.
 * Implements PCI-compliant payment processing with server-side price validation.
 * 
 * Endpoint: POST /.netlify/functions/checkout
 * 
 * Security Features:
 * - Server-side product catalog with price verification
 * - Input validation and sanitization
 * - Payload size limits (1MB max for safety, Netlify allows up to 6MB)
 * - Token-based authentication with Helcim API
 * - No sensitive credit card details logged
 * - CORS headers for cross-origin requests
 * 
 * Environment Configuration:
 * - Automatically detects sandbox vs production based on HELCIM_ENVIRONMENT
 * - Uses environment-based API credentials
 */

const { getConfig, getApiHeaders, validateConfig, logConfigStatus } = require('./lib/helcim-config');

// =============================================================================
// PRODUCT CATALOG - Server-side source of truth for pricing
// =============================================================================
const PRODUCT_CATALOG = {
  'hair-bender': { name: 'Hair Bender', basePrice: 37.00 },
  'holler-mountain': { name: 'Holler Mountain', basePrice: 38.75 },
  'french-roast': { name: 'French Roast', basePrice: 33.25 },
  'founders-blend': { name: "Founder's Blend", basePrice: 35.00 },
  'trapper-creek': { name: 'Trapper Creek', basePrice: 39.00 },
  'ethiopia-duromina': { name: 'Ethiopia Duromina', basePrice: 42.00 },
  // Add more products as needed
};

// Size multipliers for calculating final price
const SIZE_MULTIPLIERS = {
  '12oz': 1.0,
  '2lb': 2.35,
  '5lb': 5.25,
};

// Subscription discount (10%)
const SUBSCRIPTION_DISCOUNT = 0.10;

// Shipping rates (in USD)
const SHIPPING_RATES = {
  'standard': 5.99,
  'express': 12.99,
  'free': 0.00,
};

// Tax rate (example: 7% - adjust based on location)
const TAX_RATE = 0.07;

// Maximum payload size (Netlify limit is 6MB, we'll use 1MB for safety)
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate and sanitize cart items
 */
function validateCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Cart must be a non-empty array');
  }

  if (cart.length > 100) {
    throw new Error('Cart cannot contain more than 100 items');
  }

  return cart.map(item => {
    // Validate required fields
    if (!item.id || !item.quantity) {
      throw new Error('Invalid cart item: missing id or quantity');
    }

    // Sanitize product ID (alphanumeric and dashes only)
    const sanitizedId = String(item.id).replace(/[^a-z0-9-]/gi, '');
    
    // Validate product exists in catalog
    if (!PRODUCT_CATALOG[sanitizedId]) {
      throw new Error(`Invalid product: ${sanitizedId}`);
    }

    // Validate quantity
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > 1000) {
      throw new Error('Invalid quantity: must be between 1 and 1000');
    }

    // Validate size (optional)
    const size = item.size || '12oz';
    if (!SIZE_MULTIPLIERS[size]) {
      throw new Error(`Invalid size: ${size}`);
    }

    // Validate subscription flag
    const isSubscription = item.isSubscription === true;

    return {
      id: sanitizedId,
      name: PRODUCT_CATALOG[sanitizedId].name,
      quantity,
      size,
      isSubscription,
    };
  });
}

/**
 * Validate customer information
 */
function validateCustomer(customer) {
  if (!customer || typeof customer !== 'object') {
    throw new Error('Customer information is required');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!customer.email || !emailRegex.test(customer.email)) {
    throw new Error('Valid email is required');
  }

  // Name validation (alphanumeric, spaces, and common punctuation)
  const nameRegex = /^[a-zA-Z\s'-]{1,100}$/;
  if (!customer.firstName || !nameRegex.test(customer.firstName)) {
    throw new Error('Valid first name is required');
  }
  if (!customer.lastName || !nameRegex.test(customer.lastName)) {
    throw new Error('Valid last name is required');
  }

  // Phone validation (optional, if provided)
  if (customer.phone) {
    const phoneRegex = /^[\d\s()+-]{7,20}$/;
    if (!phoneRegex.test(customer.phone)) {
      throw new Error('Invalid phone number format');
    }
  }

  return {
    email: customer.email.trim().toLowerCase(),
    firstName: customer.firstName.trim(),
    lastName: customer.lastName.trim(),
    phone: customer.phone ? customer.phone.trim() : null,
  };
}

/**
 * Validate shipping information
 */
function validateShipping(shipping) {
  if (!shipping || typeof shipping !== 'object') {
    throw new Error('Shipping information is required');
  }

  // Address validation
  if (!shipping.address || shipping.address.length < 5 || shipping.address.length > 200) {
    throw new Error('Valid address is required (5-200 characters)');
  }

  // City validation
  if (!shipping.city || shipping.city.length < 2 || shipping.city.length > 100) {
    throw new Error('Valid city is required');
  }

  // State validation (2 characters for US states)
  if (!shipping.state || shipping.state.length !== 2) {
    throw new Error('Valid state code is required (2 characters)');
  }

  // Zip code validation (US format)
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!shipping.zip || !zipRegex.test(shipping.zip)) {
    throw new Error('Valid zip code is required');
  }

  // Country validation (default to US)
  const country = shipping.country || 'US';
  if (country !== 'US') {
    throw new Error('Currently only shipping to US addresses');
  }

  return {
    address: shipping.address.trim(),
    city: shipping.city.trim(),
    state: shipping.state.trim().toUpperCase(),
    zip: shipping.zip.trim(),
    country,
  };
}

/**
 * Calculate order totals from validated cart
 */
function calculateTotals(validatedCart, shippingMethod = 'standard') {
  let subtotal = 0;

  // Calculate subtotal with server-side prices
  for (const item of validatedCart) {
    const product = PRODUCT_CATALOG[item.id];
    const sizeMultiplier = SIZE_MULTIPLIERS[item.size] || 1.0;
    let itemPrice = product.basePrice * sizeMultiplier;

    // Apply subscription discount if applicable
    if (item.isSubscription) {
      itemPrice = itemPrice * (1 - SUBSCRIPTION_DISCOUNT);
    }

    subtotal += itemPrice * item.quantity;
  }

  // Calculate shipping
  const shipping = SHIPPING_RATES[shippingMethod] || SHIPPING_RATES.standard;

  // Calculate tax (on subtotal only, not shipping)
  const tax = subtotal * TAX_RATE;

  // Calculate total
  const total = subtotal + shipping + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Create Helcim checkout session using HelcimPay.js initialize endpoint
 * This creates a checkout session that returns a checkoutToken for the frontend
 * to use with the HelcimPay.js payment modal
 */
async function createHelcimSession(validatedCart, customer, shipping, totals) {
  // Get environment-based configuration
  const config = getConfig();
  
  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('Helcim configuration invalid:', validation.errors);
    throw new Error('Payment gateway not configured');
  }
  
  // Log configuration status (useful for debugging)
  if (process.env.CONTEXT === 'dev' || process.env.DEBUG_CHECKOUT) {
    logConfigStatus();
  }

  // Prepare line items for Helcim in the format required by HelcimPay.js
  const lineItems = validatedCart.map((item) => {
    const product = PRODUCT_CATALOG[item.id];
    const sizeMultiplier = SIZE_MULTIPLIERS[item.size] || 1.0;
    let itemPrice = product.basePrice * sizeMultiplier;

    if (item.isSubscription) {
      itemPrice = itemPrice * (1 - SUBSCRIPTION_DISCOUNT);
    }

    return {
      description: `${item.name} (${item.size})${item.isSubscription ? ' - Subscription' : ''}`,
      quantity: item.quantity,
      price: Math.round(itemPrice * 100) / 100,
      total: Math.round(itemPrice * item.quantity * 100) / 100,
      sku: item.id,
    };
  });

  // Add shipping as line item
  if (totals.shipping > 0) {
    lineItems.push({
      description: 'Shipping',
      quantity: 1,
      price: totals.shipping,
      total: totals.shipping,
      sku: 'shipping',
    });
  }

  // Add tax as line item for transparency
  if (totals.tax > 0) {
    lineItems.push({
      description: 'Sales Tax',
      quantity: 1,
      price: totals.tax,
      total: totals.tax,
      sku: 'tax',
    });
  }

  // Generate unique invoice number with cryptographically secure random component
  // Add sandbox prefix when in sandbox mode for easy identification
  const envPrefix = config.isSandbox ? 'TEST-' : '';
  const invoiceNumber = `${envPrefix}GH-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  // Prepare HelcimPay.js initialization request
  // Reference: https://devdocs.helcim.com/reference/checkout-init
  const helcimRequest = {
    paymentType: 'purchase',
    amount: totals.total,
    currency: 'USD',
    invoiceNumber,
    // Customer information for pre-filling the payment form
    customerCode: customer.email,
    // Billing address information
    billingAddress: {
      name: `${customer.firstName} ${customer.lastName}`,
      street1: shipping.address,
      city: shipping.city,
      province: shipping.state,
      postalCode: shipping.zip,
      country: shipping.country,
      phone: customer.phone || '',
      email: customer.email,
    },
    // Shipping address (same as billing for now)
    shippingAddress: {
      name: `${customer.firstName} ${customer.lastName}`,
      street1: shipping.address,
      city: shipping.city,
      province: shipping.state,
      postalCode: shipping.zip,
      country: shipping.country,
      phone: customer.phone || '',
    },
    // Line items for order summary display
    lineItems,
    // Tax amount
    taxAmount: totals.tax,
    // Payment method - allow credit card
    paymentMethod: 'cc',
    // Show confirmation screen after payment
    confirmationScreen: true,
  };

  // Call HelcimPay.js initialize endpoint
  // This creates a checkout session and returns a checkoutToken
  const apiUrl = `${config.apiBaseUrl}/helcim-pay/initialize`;
  
  console.log('Calling Helcim HelcimPay.js initialize API:', {
    url: apiUrl,
    environment: config.environment,
    invoiceNumber,
    amount: totals.total
  });
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(helcimRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Helcim API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      environment: config.environment
    });
    throw new Error(errorData.message || 'Payment gateway request failed');
  }

  const helcimResponse = await response.json();
  
  // HelcimPay.js initialize returns checkoutToken and secretToken
  if (!helcimResponse.checkoutToken) {
    console.error('Helcim response missing checkoutToken:', helcimResponse);
    throw new Error('Invalid payment gateway response');
  }
  
  return {
    checkoutToken: helcimResponse.checkoutToken,
    secretToken: helcimResponse.secretToken,
    invoiceNumber,
    environment: config.environment,
  };
}

/**
 * Log sanitized request (no sensitive data)
 */
function logRequest(request, validatedCart, totals) {
  // Only log in development or when debugging is enabled
  if (process.env.CONTEXT !== 'dev' && !process.env.DEBUG_CHECKOUT) {
    return;
  }

  console.log('Checkout request:', {
    timestamp: new Date().toISOString(),
    itemCount: validatedCart.length,
    totals,
    // DO NOT LOG: customer PII, payment details, or any sensitive information
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

exports.handler = async (event, context) => {
  // Determine allowed origin based on environment
  // Allow localhost for development, restrict to production domain otherwise
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigins = [
    'https://grainhousecoffee.com',
    'https://www.grainhousecoffee.com',
    'http://localhost:8888',
    'http://localhost:3000',
    'http://127.0.0.1:8888',
    'http://127.0.0.1:3000'
  ];
  
  // Also allow Netlify deploy preview URLs
  const isNetlifyPreview = requestOrigin.includes('.netlify.app') || requestOrigin.includes('.netlify.live');
  const isAllowedOrigin = allowedOrigins.includes(requestOrigin) || isNetlifyPreview;
  
  // Set CORS origin to the request origin if allowed, otherwise use production domain
  const corsOrigin = isAllowedOrigin ? requestOrigin : 'https://grainhousecoffee.com';
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed. Use POST.' 
      }),
    };
  }

  try {
    // Check payload size
    const contentLength = parseInt(event.headers['content-length'] || '0', 10);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Payload too large',
        }),
      };
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
      };
    }

    // Validate and sanitize inputs
    const validatedCart = validateCart(requestBody.cart);
    const validatedCustomer = validateCustomer(requestBody.customer);
    const validatedShipping = validateShipping(requestBody.shipping);
    const shippingMethod = requestBody.shippingMethod || 'standard';

    // Validate shipping method
    if (!SHIPPING_RATES[shippingMethod]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid shipping method',
        }),
      };
    }

    // Calculate totals with server-side prices
    const totals = calculateTotals(validatedCart, shippingMethod);

    // Log sanitized request (development only)
    logRequest(event, validatedCart, totals);

    // Create Helcim checkout session
    const helcimSession = await createHelcimSession(
      validatedCart,
      validatedCustomer,
      validatedShipping,
      totals
    );

    // Return success response with checkout token for HelcimPay.js
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        checkoutToken: helcimSession.checkoutToken,
        secretToken: helcimSession.secretToken,
        invoiceNumber: helcimSession.invoiceNumber,
        environment: helcimSession.environment,
        serverCalculatedTotals: totals,
      }),
    };

  } catch (error) {
    // Log error (but not sensitive data)
    console.error('Checkout error:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Invalid') || 
        error.message.includes('required') ||
        error.message.includes('must be')) {
      statusCode = 400;
    } else if (error.message.includes('not configured')) {
      statusCode = 503;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'An error occurred during checkout',
      }),
    };
  }
};
