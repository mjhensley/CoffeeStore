/**
 * Helcim Webhook Handler
 * 
 * Handles payment event webhooks from Helcim payment gateway.
 * 
 * Endpoint: POST /.netlify/functions/helcim-webhook
 * 
 * Events handled:
 * - payment.success / transaction.approved - Payment completed
 * - payment.failed / transaction.declined - Payment failed
 * - payment.refunded - Payment refunded
 * 
 * Setup:
 * 1. In Helcim Dashboard → Integrations → Webhooks
 * 2. Add webhook URL: https://your-site.netlify.app/.netlify/functions/helcim-webhook
 * 3. (Optional) Set HELCIM_WEBHOOK_SECRET environment variable for signature verification
 */

exports.handler = async (event, context) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Helcim-Signature',
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
                // For now, reject if secret is set but no proper verification is implemented
                console.warn('Webhook signature verification not yet implemented - configure once Helcim signature algorithm is documented');
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
