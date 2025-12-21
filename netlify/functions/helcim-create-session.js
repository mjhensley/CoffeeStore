/**
 * Helcim Create Checkout Session
 * 
 * Creates a secure checkout session with Helcim API.
 * The API token is only accessible server-side via environment variable.
 * Returns client-safe data (checkout token/session ID) - NO secrets.
 * 
 * SECURITY: All prices are calculated server-side from PRODUCT_CATALOG.
 * Client-submitted totals are IGNORED.
 */

const https = require('https');

// ============================================
// AUTHORITATIVE PRODUCT CATALOG (Server-Side)
// All prices in CENTS to avoid floating-point errors
// ============================================
const PRODUCT_CATALOG = {
    // Signature Blends
    'hair-bender': 3700,
    'holler-mountain': 3875,
    'french-roast': 3325,
    'founders-blend': 3500,
    'homestead': 3500,
    'hundred-mile': 3500,
    'evergreen': 3500,
    
    // Single Origins
    'ethiopia-mordecofe': 4475,
    'ethiopia-duromina': 4200,
    'ethiopia-suke-quto': 4400,
    'guatemala-injerto': 3800,
    'guatemala-bella-vista': 4100,
    'colombia-el-jordan': 3900,
    'colombia-cantillo': 4100,
    'costa-rica-montes': 4300,
    'indonesia-bies': 4000,
    'honduras-puente': 3900,
    'roasters-pick': 3900,
    
    // Decaf
    'trapper-creek-decaf': 3950,
    
    // Cold Brew
    'cold-brew-concentrate': 2825,
    'cold-brew-original': 875,
    'cold-brew-decaf': 2825,
    'cold-brew-nitro': 975,
    'cold-brew-oatly-original': 1075,
    'cold-brew-oatly-chocolate': 1075,
    'ethiopia-cold-brew': 3125,
    'french-roast-cold-brew': 2925,
    
    // Gear
    'aeropress': 3995,
    'aeropress-filters': 895,
    'chemex-6cup': 4995,
    'chemex-filters': 1495,
    'hario-v60': 2600,
    'hario-v60-filters': 895,
    'hario-kettle': 9500,
    'hario-grinder': 3995,
    'baratza-encore': 16900,
    'kalita-wave': 4400,
    'kalita-filters': 1200,
    'french-press': 3995,
    'bonavita-brewer': 16900,
    'ratio-six': 34900,
    'oxo-cold-brewer': 2995,
    'scale': 2995,
    'origami-dripper': 4600,
    'origami-filters': 995,
    
    // Merch
    'diner-mug': 1600,
    'rose-gold-mug': 1700,
    'kinto-tumbler': 3500,
    'kinto-mug': 2995,
    'fellow-mug': 3500,
    'tote-bag': 2500,
    'snow-bunny-tote': 2500,
    'good-luck-hat': 2995,
    'forest-beanie': 2500,
    'patch': 800,
    'camp-mug': 2000,
    'cold-brew-koozie': 700,
    'cold-brew-glass': 1495,
    'puzzle': 2995,
    'mug-ornament': 995,
    
    // Bundles
    'blend-trio': 9950,
    'passport-trio': 11225,
    'adventure-bundle': 7495,
    'day-night-bundle': 6925,
    'home-barista-bundle': 12900,
    'evergreen-bundle': 6250,
    'cold-brew-delight': 2995,
    'oatly-variety': 2100,
    'holiday-host': 7995,
    
    // Gift Cards
    'gift-card-25': 2500,
    'gift-card-50': 5000,
    'gift-card-100': 10000,
    'gift-subscription-3mo': 7495
};

// Size multipliers for coffee bags (base is 12oz)
const SIZE_MULTIPLIERS = {
    '12oz': 1,
    '2lb': 2.35,
    '5lb': 5.25
};

// Shipping rates in cents
const SHIPPING_RATES = {
    'standard': 599,      // $5.99 standard shipping
    'expedited': 1299,    // $12.99 expedited shipping
    'ups-ground': 1554,   // $15.54 UPS Ground
    'ups-2day': 2397,     // $23.97 UPS 2nd Day
    'ups-overnight': 3153 // $31.53 UPS Next Day
};

// Tax rate (7%)
const TAX_RATE = 0.07;

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API token from environment (NEVER send to client)
    const apiToken = process.env.HELCIM_API_TOKEN;
    if (!apiToken) {
        console.error('HELCIM_API_TOKEN not configured');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Payment system not configured',
                message: 'Server configuration error. Please contact support.'
            })
        };
    }

    try {
        // Parse request body
        const requestBody = JSON.parse(event.body);
        const { cart, customer, shipping, shippingMethod } = requestBody;

        // ============================================
        // VALIDATION STEP 1: Cart Items
        // ============================================
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Cart is empty or invalid' })
            };
        }

        // Validate each cart item
        for (const item of cart) {
            // Check product ID exists in catalog
            if (!item.id || !PRODUCT_CATALOG[item.id]) {
                console.error('Invalid product ID:', item.id);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid product in cart',
                        message: `Product "${item.id}" not found in catalog`
                    })
                };
            }

            // Validate quantity (1-99)
            if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 99 || !Number.isInteger(item.quantity)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid quantity',
                        message: 'Quantity must be a whole number between 1 and 99'
                    })
                };
            }
        }

        // ============================================
        // VALIDATION STEP 2: Customer Information
        // ============================================
        if (!customer || !customer.firstName || !customer.lastName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Customer information is incomplete' })
            };
        }

        // Email validation (optional field, but if provided must be valid)
        if (customer.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customer.email)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid email address' })
                };
            }
        }

        // ============================================
        // VALIDATION STEP 3: Shipping Address
        // ============================================
        if (!shipping || !shipping.address || !shipping.city || !shipping.state || !shipping.zip) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Shipping address is incomplete' })
            };
        }

        // ============================================
        // SERVER-SIDE PRICE CALCULATION
        // ============================================
        // Calculate subtotal from cart using PRODUCT_CATALOG prices
        let subtotalCents = 0;
        
        for (const item of cart) {
            const basePrice = PRODUCT_CATALOG[item.id];
            let itemPrice = basePrice;
            
            // Apply size multiplier if specified
            if (item.size && SIZE_MULTIPLIERS[item.size]) {
                itemPrice = Math.round(basePrice * SIZE_MULTIPLIERS[item.size]);
            }
            
            // Add to subtotal (price * quantity)
            subtotalCents += itemPrice * item.quantity;
        }
        
        // Get shipping cost (default to ups-ground if not specified or invalid)
        const shippingMethodKey = shippingMethod || 'ups-ground';
        let shippingCents = SHIPPING_RATES[shippingMethodKey];
        
        // Validate shipping method exists
        if (!shippingCents) {
            console.warn('Invalid shipping method:', shippingMethodKey, '- using ups-ground');
            shippingCents = SHIPPING_RATES['ups-ground'];
        }
        
        // Calculate tax (7% of subtotal only, not shipping)
        const taxCents = Math.round(subtotalCents * TAX_RATE);
        
        // Calculate total
        const totalCents = subtotalCents + shippingCents + taxCents;
        
        // ============================================
        // VALIDATION STEP 4: Reasonable Total
        // ============================================
        // Sanity check: total should be between $1 and $10,000
        if (totalCents < 100 || totalCents > 1000000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid order total',
                    message: 'Order total must be between $1.00 and $10,000.00'
                })
            };
        }
        
        // Log server-calculated totals for audit
        console.log('Server-calculated totals:', {
            subtotal: (subtotalCents / 100).toFixed(2),
            shipping: (shippingCents / 100).toFixed(2),
            tax: (taxCents / 100).toFixed(2),
            total: (totalCents / 100).toFixed(2)
        });

        // Prepare Helcim checkout session request
        const helcimPayload = {
            paymentType: 'purchase',
            amount: totalCents,  // Use server-calculated total
            currency: 'USD',
            customerCode: customer.email || `GUEST-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            invoiceNumber: `GH-${Date.now()}`, // Generate unique invoice number
            itemDescription: cart.map(item => `${item.name} (x${item.quantity})`).join(', '),
            billingName: `${customer.firstName} ${customer.lastName}`,
            billingPhone: customer.phone || '',
            shippingName: `${customer.firstName} ${customer.lastName}`,
            shippingStreet1: shipping.address,
            shippingStreet2: shipping.address2 || '',
            shippingCity: shipping.city,
            shippingProvince: shipping.state,
            shippingPostalCode: shipping.zip,
            shippingCountry: shipping.country || 'US',
            // Return URLs
            checkoutSuccessUrl: `${process.env.SITE_URL || 'https://grainhousecoffee.com'}/success.html`,
            checkoutCancelUrl: `${process.env.SITE_URL || 'https://grainhousecoffee.com'}/cancel.html`
        };
        
        // Only add billingEmail if provided
        if (customer.email) {
            helcimPayload.billingEmail = customer.email;
        }

        console.log('Creating Helcim checkout session:', {
            amount: totalCents,
            currency: 'USD',
            invoiceNumber: helcimPayload.invoiceNumber,
            itemCount: cart.length
        });

        // Call Helcim API to create checkout session with timeout
        const helcimResponse = await callHelcimAPI('/helcim-pay/initialize', helcimPayload, apiToken);

        if (!helcimResponse || !helcimResponse.checkoutToken) {
            console.error('Helcim API response missing checkout token:', helcimResponse);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Failed to create checkout session',
                    message: 'Unable to initialize payment. Please try again.'
                })
            };
        }

        // Return client-safe data ONLY (no API token, no sensitive data)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                checkoutToken: helcimResponse.checkoutToken,
                sessionId: helcimResponse.sessionId,
                invoiceNumber: helcimPayload.invoiceNumber,
                // Return server-calculated totals for display verification
                serverCalculatedTotals: {
                    subtotal: subtotalCents / 100,
                    shipping: shippingCents / 100,
                    tax: taxCents / 100,
                    total: totalCents / 100
                },
                amount: totalCents / 100,
                currency: 'USD'
            })
        };

    } catch (error) {
        console.error('Error creating Helcim checkout session:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: 'An unexpected error occurred. Please try again.'
            })
        };
    }
};

/**
 * Call Helcim API with secure authentication and timeout
 */
function callHelcimAPI(endpoint, payload, apiToken, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);

        const options = {
            hostname: 'api.helcim.com',
            port: 443,
            path: `/v2${endpoint}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'api-token': apiToken,
                'Accept': 'application/json'
            },
            timeout: timeoutMs
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        console.error('Helcim API error:', res.statusCode, response);
                        reject(new Error(`Helcim API error: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.error('Failed to parse Helcim response:', body);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Helcim API request failed:', error);
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Helcim API request timeout'));
        });

        req.write(data);
        req.end();
    });
}
