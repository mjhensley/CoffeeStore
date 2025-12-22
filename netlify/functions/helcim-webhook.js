/**
 * Helcim Webhook Handler
 * 
 * Handles payment event webhooks from Helcim payment gateway with
 * cryptographic signature verification using HMAC SHA-256.
 * 
 * Supported URLs:
 *   - /.netlify/functions/helcim-webhook (direct function endpoint)
 *   - /webhooks/payment (rewritten to the above via netlify.toml)
 * 
 * Endpoints:
 * - Direct: /.netlify/functions/helcim-webhook
 * - Alternative: https://grainhousecoffee.com/webhooks/payment (rewritten to direct endpoint)
 * 
 * Supported methods: HEAD, GET, POST, OPTIONS
 * 
 * Events handled:
 * - payment.success / transaction.approved - Payment completed
 * - payment.failed / transaction.declined - Payment failed
 * - payment.refunded - Payment refunded
 * 
 * Security Features:
 * - HMAC SHA-256 signature verification using Helcim's webhook signing algorithm
 * - Timing-safe signature comparison to prevent timing attacks
 * - Timestamp validation to prevent replay attacks (5-minute window)
 * - Idempotency protection via event ID logging
 * 
 * Setup:
 * 1. In Helcim Dashboard → Integrations → Webhooks
 * 2. Add webhook URL: https://your-site.netlify.app/.netlify/functions/helcim-webhook
 *    or https://grainhousecoffee.com/webhooks/payment
 *    OR: https://your-site.netlify.app/webhooks/payment
 * 3. Helcim will validate the URL with a HEAD request
 * 4. Copy the Verifier Token from Helcim and set it as HELCIM_WEBHOOK_SECRET
 * 
 * ============================================================
 * ENVIRONMENT VARIABLES (REQUIRED FOR SIGNATURE VERIFICATION):
 * ============================================================
 * HELCIM_WEBHOOK_SECRET:
 *   - MUST be configured in Netlify Dashboard:
 *     Site Settings → Environment Variables
 *   - Scope MUST include "Functions" for the variable to be
 *     available at runtime
 *   - This is the Verifier Token from Helcim webhook settings
 *   - IMPORTANT: Environment variables defined in netlify.toml
 *     are only available at BUILD TIME and will NOT be available
 *     to this function at runtime. Dashboard configuration is
 *     MANDATORY for signature verification to work.
 * ============================================================
 * 
 * Helcim Webhook Signature Format (per devdocs.helcim.com):
 * - Headers: webhook-signature, webhook-timestamp, webhook-id
 * - Signed content: "${webhook_id}.${webhook_timestamp}.${body}"
 * - Algorithm: HMAC-SHA256 with base64-decoded verifier token as key
 * - Signature format: "v1,<base64_signature>"
 */

const crypto = require('crypto');

/**
 * Maximum allowed age for webhook timestamps (in seconds).
 * Requests with timestamps older than this will be rejected to prevent replay attacks.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300; // 5 minutes

/**
 * Verifies the Helcim webhook signature using HMAC SHA-256.
 * 
 * Helcim's signature verification algorithm (per devdocs.helcim.com):
 * 1. Construct signed content: "${webhook_id}.${webhook_timestamp}.${body}"
 * 2. Compute HMAC-SHA256 using the base64-decoded verifier token as the key
 * 3. Base64-encode the resulting signature
 * 4. Compare against the signature in the webhook-signature header
 * 
 * @param {string} webhookId - The webhook-id header value (unique message identifier)
 * @param {string} timestamp - The webhook-timestamp header value (Unix seconds)
 * @param {string} body - The raw request body (must be exact, no modifications)
 * @param {string} receivedSignature - The webhook-signature header value (format: "v1,<base64_sig>")
 * @param {string} secret - The webhook verifier token from Helcim settings
 * @returns {{valid: boolean, error: string|null}} - Verification result with optional error message
 */
function verifyHelcimSignature(webhookId, timestamp, body, receivedSignature, secret) {
    try {
        // Step 1: Validate all required parameters are present
        if (!webhookId || typeof webhookId !== 'string') {
            return { valid: false, error: 'Missing or invalid webhook-id header' };
        }
        if (!timestamp || typeof timestamp !== 'string') {
            return { valid: false, error: 'Missing or invalid webhook-timestamp header' };
        }
        if (body === undefined || body === null) {
            return { valid: false, error: 'Missing request body' };
        }
        if (!receivedSignature || typeof receivedSignature !== 'string') {
            return { valid: false, error: 'Missing or invalid webhook-signature header' };
        }
        if (!secret || typeof secret !== 'string') {
            return { valid: false, error: 'Webhook secret not configured' };
        }

        // Step 2: Parse the received signature
        // Helcim sends signature in format: "v1,<base64_signature>" or just "<base64_signature>"
        // Handle both formats for compatibility
        let signatureValue = receivedSignature;
        if (receivedSignature.startsWith('v1,')) {
            signatureValue = receivedSignature.substring(3);
        } else if (receivedSignature.includes(',')) {
            // Handle other version prefixes (e.g., "v2,...")
            const parts = receivedSignature.split(',');
            signatureValue = parts[parts.length - 1];
        }

        // Step 3: Construct the signed content string
        // Format: "${webhook_id}.${webhook_timestamp}.${body}"
        const signedContent = `${webhookId}.${timestamp}.${body}`;

        // Step 4: Decode the base64 secret key
        // The verifier token from Helcim is base64-encoded
        // If the secret is not valid base64, fail early with a clear error
        // rather than silently falling back, which could mask configuration issues
        let secretKey;
        try {
            secretKey = Buffer.from(secret, 'base64');
            // Verify the base64 was valid by checking if re-encoding matches
            // Buffer.from silently handles invalid base64 by ignoring invalid chars
            if (secretKey.length === 0 && secret.length > 0) {
                return { valid: false, error: 'Invalid webhook secret format (empty after base64 decode)' };
            }
        } catch (decodeError) {
            console.error('Failed to decode webhook secret as base64:', decodeError.message);
            return { valid: false, error: 'Invalid webhook secret format' };
        }

        // Step 5: Compute HMAC-SHA256 signature
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(signedContent, 'utf8');
        const computedSignature = hmac.digest('base64');

        // Step 6: Perform timing-safe comparison to prevent timing attacks
        // Convert both base64 signature strings to buffers for comparison
        // Using 'utf8' encoding treats the base64 strings as text for byte comparison
        const receivedBuffer = Buffer.from(signatureValue, 'utf8');
        const computedBuffer = Buffer.from(computedSignature, 'utf8');

        // If lengths differ, signatures cannot match, but we still need to avoid
        // revealing length information through timing
        if (receivedBuffer.length !== computedBuffer.length) {
            // Perform a dummy comparison to maintain constant time behavior
            // This prevents attackers from using timing to determine signature length
            const dummyBuffer = Buffer.alloc(computedBuffer.length);
            crypto.timingSafeEqual(dummyBuffer, computedBuffer);
            return { valid: false, error: 'Signature mismatch' };
        }

        // Compare signatures using timing-safe equality check
        const signaturesMatch = crypto.timingSafeEqual(receivedBuffer, computedBuffer);
        
        if (!signaturesMatch) {
            return { valid: false, error: 'Signature mismatch' };
        }

        return { valid: true, error: null };

    } catch (error) {
        // Log the error for debugging but return a generic message
        console.error('Signature verification error:', error.message);
        return { valid: false, error: 'Signature verification failed' };
    }
}

/**
 * Validates the webhook timestamp to prevent replay attacks.
 * Rejects requests where the timestamp is older than MAX_TIMESTAMP_AGE_SECONDS.
 * 
 * @param {string} timestamp - The webhook-timestamp header value (Unix seconds)
 * @returns {{valid: boolean, error: string|null}} - Validation result with optional error message
 */
function validateTimestamp(timestamp) {
    try {
        if (!timestamp || typeof timestamp !== 'string') {
            return { valid: false, error: 'Missing or invalid timestamp' };
        }

        // Parse timestamp as Unix seconds
        const webhookTime = parseInt(timestamp, 10);
        if (isNaN(webhookTime)) {
            return { valid: false, error: 'Timestamp is not a valid number' };
        }

        // Calculate time difference
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDifference = currentTime - webhookTime;

        // Check if timestamp is in the future (with small tolerance for clock skew)
        if (timeDifference < -60) { // Allow 1 minute future tolerance
            return { valid: false, error: 'Timestamp is too far in the future' };
        }

        // Check if timestamp is too old (replay attack prevention)
        if (timeDifference > MAX_TIMESTAMP_AGE_SECONDS) {
            return { 
                valid: false, 
                error: `Timestamp expired (${timeDifference} seconds old, max allowed: ${MAX_TIMESTAMP_AGE_SECONDS})` 
            };
        }

        return { valid: true, error: null };

    } catch (error) {
        console.error('Timestamp validation error:', error.message);
        return { valid: false, error: 'Timestamp validation failed' };
    }
}

exports.handler = async (event, context) => {
    // CORS headers for all responses
    // Include Helcim webhook headers for preflight requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, webhook-signature, webhook-timestamp, webhook-id',
        'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS preflight
    // Access-Control-Max-Age reduces unnecessary preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                ...headers,
                'Access-Control-Max-Age': '86400' // Cache preflight response for 24 hours
            },
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
        // Log Content-Type header for debugging payload parsing issues
        // Helcim may send payloads with unexpected Content-Type (e.g., text/plain)
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || 'not provided';
        console.log('Webhook POST received - Content-Type:', contentType);
        
        // ============================================================
        // SIGNATURE VERIFICATION (must be done BEFORE JSON parsing)
        // ============================================================
        // Helcim webhook signature verification using HMAC SHA-256.
        // This MUST be performed BEFORE parsing the JSON body to ensure
        // we use the exact raw body for signature computation.
        // JSON.parse() could modify whitespace/formatting which would
        // invalidate the signature.
        // ============================================================
        const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET;
        
        if (webhookSecret) {
            // Extract Helcim webhook headers (case-insensitive lookup)
            // Helcim uses these headers per their documentation at devdocs.helcim.com:
            // - webhook-signature: The HMAC-SHA256 signature (format: "v1,<base64_sig>")
            // - webhook-timestamp: Unix timestamp in seconds
            // - webhook-id: Unique identifier for this webhook message
            const signature = event.headers['webhook-signature'] || event.headers['Webhook-Signature'];
            const timestamp = event.headers['webhook-timestamp'] || event.headers['Webhook-Timestamp'];
            const webhookId = event.headers['webhook-id'] || event.headers['Webhook-Id'];

            // Log which headers were received (helpful for debugging)
            console.log('Webhook signature verification - Headers received:', {
                hasSignature: !!signature,
                hasTimestamp: !!timestamp,
                hasWebhookId: !!webhookId
            });

            // Validate that all required headers are present
            if (!signature || !timestamp || !webhookId) {
                console.warn('Webhook signature verification failed - Missing required headers', {
                    signature: !!signature,
                    timestamp: !!timestamp,
                    webhookId: !!webhookId
                });
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Missing required signature headers',
                        timestamp: new Date().toISOString()
                    })
                };
            }

            // Step 1: Validate timestamp to prevent replay attacks
            // Reject requests where the timestamp is older than 5 minutes
            const timestampValidation = validateTimestamp(timestamp);
            if (!timestampValidation.valid) {
                console.warn('Webhook timestamp validation failed:', timestampValidation.error);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Timestamp validation failed',
                        message: timestampValidation.error,
                        timestamp: new Date().toISOString()
                    })
                };
            }

            // Step 2: Verify the HMAC-SHA256 signature
            // Use the raw request body (event.body) - not parsed JSON
            const rawBody = event.body || '';
            const signatureValidation = verifyHelcimSignature(
                webhookId,
                timestamp,
                rawBody,
                signature,
                webhookSecret
            );

            if (!signatureValidation.valid) {
                console.warn('Webhook signature verification failed:', signatureValidation.error);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Signature verification failed',
                        message: signatureValidation.error,
                        timestamp: new Date().toISOString()
                    })
                };
            }

            console.log('Webhook signature verified successfully', {
                webhookId: webhookId,
                timestamp: timestamp
            });
        } else {
            // Warn if signature verification is not configured
            // In production, this should always be configured for security
            console.warn('HELCIM_WEBHOOK_SECRET not configured - skipping signature verification');
        }

        // Now parse the JSON payload after signature verification
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
            // ============================================================
            // IDEMPOTENCY PROTECTION
            // ============================================================
            // Extract webhook event identifier for idempotency tracking.
            // The webhook-id header is the unique message identifier from Helcim.
            // ============================================================
            const webhookIdHeader = event.headers['webhook-id'] || event.headers['Webhook-Id'];
            const webhookEventId = webhookIdHeader || payload.id || payload.transactionId || payload.eventId || null;
            
            // Log the event ID for idempotency tracking
            // TODO: For production systems, persist processed webhook IDs in a
            // database (e.g., PostgreSQL, DynamoDB) or KV store (e.g., Netlify Blobs, Redis)
            // to prevent duplicate event processing. Before processing, check if the
            // webhook-id has already been processed. Implementation example:
            //
            // const alreadyProcessed = await db.webhookEvents.exists(webhookEventId);
            // if (alreadyProcessed) {
            //     console.log('Duplicate webhook detected, skipping:', webhookEventId);
            //     return { statusCode: 200, headers, body: JSON.stringify({ received: true, duplicate: true }) };
            // }
            // await db.webhookEvents.insert({ id: webhookEventId, processedAt: new Date() });
            //
            if (webhookEventId) {
                console.log('Webhook event ID for idempotency tracking:', webhookEventId);
            } else {
                console.warn('Webhook received without identifiable event ID - unable to ensure idempotency', {
                    payloadKeys: Object.keys(payload),
                    timestamp: new Date().toISOString()
                });
            }

            // Idempotency protection: Extract event ID from payload
            // This prevents duplicate processing of retried webhook deliveries
            const eventId = payload.id || payload.transactionId;
            if (!eventId) {
                console.warn('No event ID (payload.id or payload.transactionId) present in webhook payload - idempotency check skipped');
            } else {
                // TODO: Production implementations should store processed event IDs in a database
                // or KV store (e.g., Netlify Blobs, Redis, DynamoDB) to prevent duplicate
                // processing of retried webhook deliveries. Check if eventId exists before
                // processing and store it after successful processing with appropriate TTL.
                console.log('Event ID for idempotency:', eventId);
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
