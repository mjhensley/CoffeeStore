/**
 * Helcim Webhook Handler
 * 
 * Handles payment event webhooks from Helcim payment gateway.
 * 
 * Endpoint: /.netlify/functions/helcim-webhook
 * Supported methods: HEAD, GET, POST, OPTIONS
 * 
 * Events handled:
 * - payment.success / transaction.approved - Payment completed
 * - payment.failed / transaction.declined - Payment failed
 * - payment.refunded - Payment refunded
 * 
 * Setup:
 * 1. In Helcim Dashboard → Integrations → Webhooks
 * 2. Add webhook URL: https://your-site.netlify.app/.netlify/functions/helcim-webhook
 * 3. Helcim will validate the URL with a HEAD request
 * 4. (Optional) Set HELCIM_WEBHOOK_SECRET for signature verification (not yet implemented)
 */

exports.handler = async (event, context) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Helcim-Signature, webhook-signature, webhook-timestamp, webhook-id',
        'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
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

    // Handle HEAD request - Helcim uses this to validate the webhook URL
    // This is what fixes the 400 error during webhook configuration
    if (event.httpMethod === 'HEAD') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Handle GET request - Also used for validation/health check
    if (event.httpMethod === 'GET') {
        // Check if this is a Helcim URL verification request
        // Helcim sends a GET request with ?check=<random_string> and expects the value echoed back
        const checkValue = event.queryStringParameters && event.queryStringParameters.check;
        if (checkValue) {
            // Validate check parameter: only limit by length for safety (max 256 chars)
            // Allow any characters since Helcim may include dots, plus signs, or other URL-safe characters
            if (typeof checkValue === 'string' && checkValue.length <= 256) {
                return {
                    statusCode: 200,
                    headers: {
                        ...headers,
                        'Content-Type': 'text/plain'
                    },
                    body: checkValue
                };
            }
            // Invalid check parameter (too long or not a string), return 400
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid check parameter',
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: 'ready',
                message: 'Helcim webhook endpoint is operational',
                timestamp: new Date().toISOString()
            })
        };
    }

    // Handle POST request - Actual webhook events from Helcim
    if (event.httpMethod === 'POST') {
        let payload;
        
        try {
            // Safely parse the webhook payload
            payload = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('Invalid JSON in webhook payload');
            // Return 200 to prevent retries of malformed payloads
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    received: true,
                    error: 'Invalid JSON payload',
                    timestamp: new Date().toISOString()
                })
            };
        }

        try {

            // Optional: Verify webhook signature if HELCIM_WEBHOOK_SECRET is set
            // NOTE: Signature verification algorithm is not yet implemented.
            // When secret is configured, we require a signature header to be present
            // (providing basic protection), but do not verify its correctness yet.
            const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET;
            if (webhookSecret) {
                const signature = event.headers['x-helcim-signature'] || event.headers['X-Helcim-Signature'];
                
                if (!signature) {
                    console.warn('Webhook secret configured but no signature found - rejecting request');
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Signature verification required',
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                
                // TODO: Implement actual signature verification based on Helcim's documentation
                // The signature algorithm/format needs to be obtained from Helcim docs
                console.warn('Webhook signature verification not yet implemented - signature presence checked but not verified');
            }

            // Log only non-sensitive webhook metadata
            console.log('Helcim webhook received:', {
                type: payload.type || payload.event,
                transactionId: payload.transactionId || payload.id,
                timestamp: new Date().toISOString()
            });

            // Handle different webhook event types
            const eventType = payload.type || payload.event || '';
            
            switch (eventType) {
                case 'payment.success':
                case 'transaction.approved':
                    console.log('Payment successful - Transaction ID:', payload.transactionId || payload.id);
                    // TODO: Update order status, send confirmation email, etc.
                    break;

                case 'payment.failed':
                case 'transaction.declined':
                    console.log('Payment failed - Transaction ID:', payload.transactionId || payload.id);
                    // TODO: Update order status, notify customer, etc.
                    break;

                case 'payment.refunded':
                    console.log('Payment refunded - Transaction ID:', payload.transactionId || payload.id);
                    // TODO: Update order status, notify customer, etc.
                    break;

                default:
                    console.log('Unknown webhook event type:', eventType);
            }

            // Always return 200 OK to acknowledge receipt
            // This prevents Helcim from retrying the webhook
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    received: true,
                    timestamp: new Date().toISOString()
                })
            };

        } catch (error) {
            console.error('Webhook processing error:', error);
            
            // Return 200 even on error to prevent retries
            // Log the error for investigation
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    received: true,
                    error: 'Processing error logged',
                    timestamp: new Date().toISOString()
                })
            };
        }
    }

    // Method not allowed
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
            error: 'Method not allowed',
            allowed: ['GET', 'POST', 'HEAD', 'OPTIONS']
        })
    };
};
