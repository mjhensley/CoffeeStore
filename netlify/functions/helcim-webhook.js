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
 * Receives and processes payment event notifications from Helcim.
 * Validates webhook signatures and handles various payment events.
 * 
 * Endpoint: POST /.netlify/functions/helcim-webhook
 * 
 * Security Features:
 * - Webhook signature verification (when HELCIM_WEBHOOK_SECRET is set)
 * - Event type validation
 * - Idempotency handling to prevent duplicate processing
 * - No sensitive payment data logged
 */

const crypto = require('crypto');

// =============================================================================
// WEBHOOK EVENT TYPES
// =============================================================================
const EVENT_TYPES = {
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  TRANSACTION_APPROVED: 'transaction.approved',
  TRANSACTION_DECLINED: 'transaction.declined',
};

// In-memory cache for processed events (prevents duplicate processing)
// In production, use a database or KV store
const processedEvents = new Map(); // Changed to Map to store timestamps
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Clean up old processed events (call periodically)
 */
function cleanupOldEvents() {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > CACHE_TTL) {
      processedEvents.delete(eventId);
    }
  }
}

/**
 * Verify webhook signature from Helcim
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) {
    // If no secret is configured, skip verification (dev mode)
    console.warn('Webhook secret not configured - skipping signature verification');
    return true;
  }

  if (!signature) {
    console.error('Missing webhook signature');
    return false;
  }

  try {
    // Helcim uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return false;
  }
}

/**
 * Check if event has already been processed (idempotency)
 */
function isEventProcessed(eventId) {
  const timestamp = processedEvents.get(eventId);
  if (!timestamp) return false;
  
  // Check if event is still within TTL
  if (Date.now() - timestamp > CACHE_TTL) {
    processedEvents.delete(eventId);
    return false;
  }
  
  return true;
}

/**
 * Mark event as processed
 */
function markEventProcessed(eventId) {
  processedEvents.set(eventId, Date.now());
  
  // Periodically clean up old events (every 100 events)
  if (processedEvents.size % 100 === 0) {
    cleanupOldEvents();
  }
}

/**
 * Process successful payment
 */
async function handlePaymentSuccess(event) {
  console.log('Payment successful:', {
    eventId: event.id,
    transactionId: event.transactionId,
    invoiceNumber: event.invoiceNumber,
    amount: event.amount,
    timestamp: new Date().toISOString(),
  });

  // TODO: Implement order fulfillment logic
  // - Save order to database
  // - Send confirmation email to customer
  // - Update inventory
  // - Trigger shipping workflow

  return {
    success: true,
    message: 'Payment processed successfully',
  };
}

/**
 * Process failed payment
 */
async function handlePaymentFailed(event) {
  console.log('Payment failed:', {
    eventId: event.id,
    transactionId: event.transactionId,
    invoiceNumber: event.invoiceNumber,
    reason: event.reason || 'Unknown',
    timestamp: new Date().toISOString(),
  });

  // TODO: Implement failure handling logic
  // - Send failure notification email
  // - Log failure for analytics
  // - Update order status

  return {
    success: true,
    message: 'Payment failure processed',
  };
}

/**
 * Process refund event
 */
async function handlePaymentRefunded(event) {
  console.log('Payment refunded:', {
    eventId: event.id,
    transactionId: event.transactionId,
    invoiceNumber: event.invoiceNumber,
    amount: event.amount,
    timestamp: new Date().toISOString(),
  });

  // TODO: Implement refund handling logic
  // - Update order status
  // - Send refund confirmation email
  // - Update inventory if applicable

  return {
    success: true,
    message: 'Refund processed successfully',
  };
}

/**
 * Route webhook event to appropriate handler
 */
async function processWebhookEvent(event) {
  const eventType = event.type || event.event;

  switch (eventType) {
    case EVENT_TYPES.PAYMENT_SUCCESS:
    case EVENT_TYPES.TRANSACTION_APPROVED:
      return await handlePaymentSuccess(event);

    case EVENT_TYPES.PAYMENT_FAILED:
    case EVENT_TYPES.TRANSACTION_DECLINED:
      return await handlePaymentFailed(event);

    case EVENT_TYPES.PAYMENT_REFUNDED:
      return await handlePaymentRefunded(event);

    default:
      console.warn('Unknown webhook event type:', eventType);
      return {
        success: true,
        message: 'Event type not handled',
      };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Helcim-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        error: 'Method not allowed. Use POST.',
      }),
    };
  }

  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET;

    // Get signature from headers (Helcim sends this)
    const signature = event.headers['x-helcim-signature'] || 
                     event.headers['X-Helcim-Signature'];

    // Verify webhook signature
    if (webhookSecret && !verifyWebhookSignature(event.body, signature, webhookSecret)) {
      console.error('Webhook signature verification failed');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid webhook signature',
        }),
      };
    }

    // Parse webhook payload
    let webhookEvent;
    try {
      webhookEvent = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in webhook payload',
        }),
      };
    }

    // Validate event structure
    if (!webhookEvent.id && !webhookEvent.transactionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid webhook event: missing id',
        }),
      };
    }

    // Check for duplicate events (idempotency)
    const eventId = webhookEvent.id || webhookEvent.transactionId;
    if (isEventProcessed(eventId)) {
      console.log('Duplicate webhook event received:', eventId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Event already processed',
        }),
      };
    }

    // Mark event as being processed
    markEventProcessed(eventId);

    // Process the webhook event
    const result = await processWebhookEvent(webhookEvent);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Webhook processing error:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error processing webhook',
      }),
    };
  }
};
