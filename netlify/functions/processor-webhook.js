/**
 * Netlify Function: Processor Webhook
 * 
 * This function handles webhooks from the payment processor.
 * When a payment succeeds, this function:
 * 1. Verifies the webhook signature
 * 2. Extracts the publicToken from metadata
 * 3. Confirms the payment with Snipcart
 * 4. Implements idempotent handling to prevent duplicate processing
 * 
 * This is CRITICAL to prevent orders from remaining in "pending" state.
 * 
 * **SECURITY**: Always verify webhook signatures before processing.
 */

const { confirmPayment, markPaymentFailed } = require('./lib/snipcart');
const paymentAdapter = require('./payfac/mock'); // Import the payment adapter

/**
 * In-memory store for processed webhooks (for idempotency)
 * 
 * **IMPORTANT FOR PRODUCTION**: This in-memory approach is suitable for the mock adapter
 * and light testing, but for production environments you should use a persistent store:
 * - Redis with TTL (recommended)
 * - Database with timestamp-based cleanup
 * - Distributed cache like Memcached
 * 
 * The serverless nature of Netlify Functions means each invocation might get a fresh
 * instance, so this in-memory approach provides basic deduplication within a function's
 * lifecycle but is not guaranteed across all invocations.
 * 
 * Most payment processors handle webhook retries intelligently and Snipcart's API is
 * idempotent, so the risk of duplicate processing is low even without perfect deduplication.
 */
const processedWebhooks = new Map(); // Using Map to store timestamp for optional cleanup

/**
 * Checks if a webhook has already been processed (idempotent handling)
 * 
 * @param {string} webhookId - Unique identifier for the webhook
 * @returns {boolean} True if already processed
 */
function isWebhookProcessed(webhookId) {
  const processed = processedWebhooks.has(webhookId);
  
  // Simple time-based cleanup: Remove entries older than 10 minutes
  // This is safe in serverless as it only cleans within this function instance
  if (!processed) {
    const now = Date.now();
    for (const [id, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
        processedWebhooks.delete(id);
      }
    }
  }
  
  return processed;
}

/**
 * Marks a webhook as processed
 * 
 * @param {string} webhookId - Unique identifier for the webhook
 */
function markWebhookProcessed(webhookId) {
  processedWebhooks.set(webhookId, Date.now());
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('[Processor Webhook] Received webhook');

    // Step 1: Verify the webhook signature
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'mock_webhook_secret';
    
    let webhookEvent;
    try {
      webhookEvent = await paymentAdapter.verifyWebhook({
        body: event.body,
        headers: event.headers
      }, webhookSecret);
    } catch (verifyError) {
      console.error('[Processor Webhook] Verification failed:', verifyError.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Webhook verification failed' })
      };
    }

    console.log('[Processor Webhook] Webhook verified');

    // Step 2: Extract transaction details
    const transactionId = paymentAdapter.getTransactionId(webhookEvent);
    const paymentStatus = paymentAdapter.getPaymentStatus(webhookEvent);
    const publicToken = paymentAdapter.extractPublicToken(webhookEvent);

    console.log('[Processor Webhook] Transaction details:', {
      transactionId: transactionId,
      status: paymentStatus,
      hasPublicToken: !!publicToken
    });

    // Step 3: Idempotent handling - check if already processed
    const webhookId = transactionId;
    if (isWebhookProcessed(webhookId)) {
      console.log('[Processor Webhook] Already processed, returning success');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          received: true,
          message: 'Webhook already processed' 
        })
      };
    }

    // Step 4: Extract public token
    if (!publicToken) {
      console.error('[Processor Webhook] No public token in webhook metadata');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Public token not found in webhook' })
      };
    }

    // Step 5: Handle payment based on status
    if (paymentStatus === 'succeeded') {
      // Payment succeeded - confirm with Snipcart
      console.log('[Processor Webhook] Confirming payment with Snipcart...');
      
      try {
        await confirmPayment(publicToken, transactionId);
        console.log('[Processor Webhook] Payment confirmed successfully');
        
        // Mark as processed
        markWebhookProcessed(webhookId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            received: true,
            message: 'Payment confirmed with Snipcart'
          })
        };
      } catch (confirmError) {
        console.error('[Processor Webhook] Failed to confirm payment:', confirmError.message);
        
        // Still return 200 to prevent webhook retries, but log the error
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            received: true,
            message: 'Webhook received but confirmation failed'
          })
        };
      }
    } else if (paymentStatus === 'failed') {
      // Payment failed - mark as failed in Snipcart
      console.log('[Processor Webhook] Marking payment as failed in Snipcart...');
      
      try {
        await markPaymentFailed(publicToken, 'Payment declined by processor');
        console.log('[Processor Webhook] Payment marked as failed');
        
        // Mark as processed
        markWebhookProcessed(webhookId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            received: true,
            message: 'Payment failure recorded'
          })
        };
      } catch (failError) {
        console.error('[Processor Webhook] Failed to mark payment as failed:', failError.message);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            received: true,
            message: 'Webhook received but update failed'
          })
        };
      }
    } else {
      // Other status (e.g., pending, processing)
      console.log('[Processor Webhook] Payment status:', paymentStatus);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          received: true,
          message: `Payment status: ${paymentStatus}`
        })
      };
    }

  } catch (error) {
    console.error('[Processor Webhook] Error:', error);
    
    // Return 200 to prevent webhook retries for server errors
    // The payment processor will keep retrying 4xx errors but not 5xx
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        received: true,
        message: 'Webhook received but processing encountered an error'
      })
    };
  }
};
