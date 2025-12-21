/**
 * Helcim Create Checkout Session
 * 
 * Creates a secure checkout session with Helcim API.
 * The API token is only accessible server-side via environment variable.
 * Returns client-safe data (checkout token/session ID) - NO secrets.
 */

const https = require('https');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get API token from environment (NEVER send to client)
    const apiToken = process.env.HELCIM_API_TOKEN;
    if (!apiToken) {
        console.error('HELCIM_API_TOKEN not configured');
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Payment system not configured',
                message: 'Server configuration error. Please contact support.'
            })
        };
    }

    try {
        // Parse request body
        const requestBody = JSON.parse(event.body);
        const { cart, customer, shipping, totals } = requestBody;

        // Validate required fields
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Cart is empty or invalid' })
            };
        }

        if (!customer || !customer.email || !customer.firstName || !customer.lastName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Customer information is incomplete' })
            };
        }

        if (!shipping || !shipping.address || !shipping.city || !shipping.state || !shipping.zip) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Shipping address is incomplete' })
            };
        }

        if (!totals || typeof totals.total === 'undefined') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Order totals are missing' })
            };
        }

        // Calculate amount in cents (Helcim uses cents)
        const amountCents = Math.round(totals.total * 100);

        // Prepare Helcim checkout session request
        const helcimPayload = {
            paymentType: 'purchase',
            amount: amountCents,
            currency: 'USD',
            customerCode: customer.email, // Use email as customer identifier
            invoiceNumber: `GH-${Date.now()}`, // Generate unique invoice number
            itemDescription: cart.map(item => `${item.name} (x${item.quantity})`).join(', '),
            billingName: `${customer.firstName} ${customer.lastName}`,
            billingEmail: customer.email,
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

        console.log('Creating Helcim checkout session:', {
            amount: amountCents,
            currency: 'USD',
            invoiceNumber: helcimPayload.invoiceNumber,
            itemCount: cart.length
        });

        // Call Helcim API to create checkout session
        const helcimResponse = await callHelcimAPI('/payment-sessions', helcimPayload, apiToken);

        if (!helcimResponse || !helcimResponse.checkoutToken) {
            console.error('Helcim API response missing checkout token:', helcimResponse);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Failed to create checkout session',
                    message: 'Unable to initialize payment. Please try again.'
                })
            };
        }

        // Return client-safe data ONLY (no API token, no sensitive data)
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                checkoutToken: helcimResponse.checkoutToken,
                sessionId: helcimResponse.sessionId,
                invoiceNumber: helcimPayload.invoiceNumber,
                amount: totals.total,
                currency: 'USD'
            })
        };

    } catch (error) {
        console.error('Error creating Helcim checkout session:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: 'An unexpected error occurred. Please try again.'
            })
        };
    }
};

/**
 * Call Helcim API with secure authentication
 */
function callHelcimAPI(endpoint, payload, apiToken) {
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
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json'
            }
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

        req.write(data);
        req.end();
    });
}
