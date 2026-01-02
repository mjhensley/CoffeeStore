/**
 * Helcim Webhook Handler (Vercel API Route)
 * 
 * Handles payment event webhooks from Helcim payment gateway with
 * cryptographic signature verification using HMAC SHA-256.
 * 
 * Supported URLs:
 *   - /api/helcim-webhook (Vercel API route)
 *   - /.netlify/functions/helcim-webhook (rewritten via vercel.json)
 *   - /webhooks/* (rewritten via vercel.json)
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
 * 2. Add webhook URL: https://grainhousecoffee.com/api/helcim-webhook
 *    OR: https://grainhousecoffee.com/webhooks/payment
 * 3. Helcim will validate the URL with a HEAD request
 * 4. Copy the Verifier Token from Helcim and set it as HELCIM_WEBHOOK_SECRET
 */

const crypto = require('crypto');
const { isEventProcessed, markEventProcessed } = require('./lib/idempotency');
const { getConfig, logConfigStatus } = require('./lib/helcim-config');

/**
 * Maximum allowed age for webhook timestamps (in seconds).
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300; // 5 minutes

/**
 * Verifies the Helcim webhook signature using HMAC SHA-256.
 */
function verifyHelcimSignature(webhookId, timestamp, body, receivedSignature, secret) {
  try {
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

    let signatureValue = receivedSignature;
    if (receivedSignature.startsWith('v1,')) {
      signatureValue = receivedSignature.substring(3);
    } else if (receivedSignature.includes(',')) {
      const parts = receivedSignature.split(',');
      signatureValue = parts[parts.length - 1];
    }

    const signedContent = `${webhookId}.${timestamp}.${body}`;

    let secretKey;
    try {
      secretKey = Buffer.from(secret, 'base64');
      if (secretKey.length === 0 && secret.length > 0) {
        return { valid: false, error: 'Invalid webhook secret format (empty after base64 decode)' };
      }
    } catch (decodeError) {
      console.error('Failed to decode webhook secret as base64:', decodeError.message);
      return { valid: false, error: 'Invalid webhook secret format' };
    }

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(signedContent, 'utf8');
    const computedSignature = hmac.digest('base64');

    const receivedBuffer = Buffer.from(signatureValue, 'utf8');
    const computedBuffer = Buffer.from(computedSignature, 'utf8');

    if (receivedBuffer.length !== computedBuffer.length) {
      const dummyBuffer = Buffer.alloc(computedBuffer.length);
      crypto.timingSafeEqual(dummyBuffer, computedBuffer);
      return { valid: false, error: 'Signature mismatch' };
    }

    const signaturesMatch = crypto.timingSafeEqual(receivedBuffer, computedBuffer);
    
    if (!signaturesMatch) {
      return { valid: false, error: 'Signature mismatch' };
    }

    return { valid: true, error: null };

  } catch (error) {
    console.error('Signature verification error:', error.message);
    return { valid: false, error: 'Signature verification failed' };
  }
}

/**
 * Validates the webhook timestamp to prevent replay attacks.
 */
function validateTimestamp(timestamp) {
  try {
    if (!timestamp || typeof timestamp !== 'string') {
      return { valid: false, error: 'Missing or invalid timestamp' };
    }

    const webhookTime = parseInt(timestamp, 10);
    if (isNaN(webhookTime)) {
      return { valid: false, error: 'Timestamp is not a valid number' };
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = currentTime - webhookTime;

    if (timeDifference < -60) {
      return { valid: false, error: 'Timestamp is too far in the future' };
    }

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

/**
 * Get raw body from request for signature verification
 */
async function getRawBody(req) {
  // If body is already a string, return it
  if (typeof req.body === 'string') {
    return req.body;
  }
  
  // If body is an object (parsed JSON), stringify it
  // Note: This may not be exact match - for production, configure Vercel to not parse JSON
  if (typeof req.body === 'object' && req.body !== null) {
    return JSON.stringify(req.body);
  }
  
  return '';
}

// =============================================================================
// MAIN HANDLER (Vercel API Route)
// =============================================================================

module.exports = async function handler(req, res) {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, webhook-signature, webhook-timestamp, webhook-id',
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Handle HEAD request - Helcim uses this to validate the webhook URL
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  // Handle GET request - Also used for validation/health check
  if (req.method === 'GET') {
    const checkValue = req.query && req.query.check;
    if (checkValue) {
      if (typeof checkValue === 'string' && checkValue.length <= 256) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(checkValue);
      }
      return res.status(400).json({
        error: 'Invalid check parameter',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(200).json({
      status: 'ready',
      message: 'Helcim webhook endpoint is operational',
      timestamp: new Date().toISOString()
    });
  }

  // Handle POST request - Actual webhook events from Helcim
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || 'not provided';
    console.log('Webhook POST received - Content-Type:', contentType);
    
    // Signature verification
    const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const signature = req.headers['webhook-signature'] || req.headers['Webhook-Signature'];
      const timestamp = req.headers['webhook-timestamp'] || req.headers['Webhook-Timestamp'];
      const webhookId = req.headers['webhook-id'] || req.headers['Webhook-Id'];

      console.log('Webhook signature verification - Headers received:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasWebhookId: !!webhookId
      });

      if (!signature || !timestamp || !webhookId) {
        console.warn('Webhook signature verification failed - Missing required headers', {
          signature: !!signature,
          timestamp: !!timestamp,
          webhookId: !!webhookId
        });
        return res.status(401).json({
          error: 'Missing required signature headers',
          timestamp: new Date().toISOString()
        });
      }

      const timestampValidation = validateTimestamp(timestamp);
      if (!timestampValidation.valid) {
        console.warn('Webhook timestamp validation failed:', timestampValidation.error);
        return res.status(401).json({
          error: 'Timestamp validation failed',
          message: timestampValidation.error,
          timestamp: new Date().toISOString()
        });
      }

      const rawBody = await getRawBody(req);
      const signatureValidation = verifyHelcimSignature(
        webhookId,
        timestamp,
        rawBody,
        signature,
        webhookSecret
      );

      if (!signatureValidation.valid) {
        console.warn('Webhook signature verification failed:', signatureValidation.error);
        return res.status(401).json({
          error: 'Signature verification failed',
          message: signatureValidation.error,
          timestamp: new Date().toISOString()
        });
      }

      console.log('Webhook signature verified successfully', {
        webhookId: webhookId,
        timestamp: timestamp
      });
    } else {
      console.warn('HELCIM_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    // Parse payload
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch (parseError) {
      console.error('Invalid JSON in webhook payload');
      return res.status(200).json({
        received: true,
        error: 'Invalid JSON payload',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Idempotency protection
      const webhookIdHeader = req.headers['webhook-id'] || req.headers['Webhook-Id'];
      const webhookEventId = webhookIdHeader || payload.id || payload.transactionId || payload.eventId || null;
      
      if (webhookEventId) {
        const idempotencyCheck = await isEventProcessed(webhookEventId);
        
        if (idempotencyCheck.processed) {
          console.log('Duplicate webhook detected, skipping:', webhookEventId, {
            originalProcessedAt: idempotencyCheck.processedAt,
            storageSource: idempotencyCheck.source
          });
          return res.status(200).json({
            received: true,
            duplicate: true,
            originalProcessedAt: idempotencyCheck.processedAt,
            timestamp: new Date().toISOString()
          });
        }
        
        console.log('Processing new webhook event:', webhookEventId);
      } else {
        console.warn('Webhook received without identifiable event ID - unable to ensure idempotency', {
          payloadKeys: Object.keys(payload),
          timestamp: new Date().toISOString()
        });
      }

      // Log webhook metadata
      console.log('Helcim webhook received:', {
        type: payload.type || payload.event,
        transactionId: payload.transactionId || payload.id,
        timestamp: new Date().toISOString()
      });

      // Handle different webhook event types
      const eventType = payload.type || payload.event || '';
      
      const orderDetails = {
        transactionId: payload.transactionId || payload.id,
        invoiceNumber: payload.invoiceNumber || payload.invoice,
        amount: payload.amount,
        currency: payload.currency || 'USD',
        customerEmail: payload.customerCode || payload.email,
        timestamp: new Date().toISOString(),
      };
      
      switch (eventType) {
        case 'payment.success':
        case 'transaction.approved':
          console.log('Payment successful - Processing order:', orderDetails);
          console.log('ORDER_CONFIRMED:', JSON.stringify({
            type: 'order_confirmed',
            ...orderDetails,
            status: 'paid',
          }));
          break;

        case 'payment.failed':
        case 'transaction.declined':
          console.log('Payment failed - Transaction ID:', orderDetails.transactionId);
          console.log('PAYMENT_FAILED:', JSON.stringify({
            type: 'payment_failed',
            ...orderDetails,
            status: 'declined',
            reason: payload.declineReason || payload.message || 'Unknown',
          }));
          break;

        case 'payment.refunded':
          console.log('Payment refunded - Transaction ID:', orderDetails.transactionId);
          console.log('PAYMENT_REFUNDED:', JSON.stringify({
            type: 'payment_refunded',
            ...orderDetails,
            status: 'refunded',
            refundAmount: payload.refundAmount || payload.amount,
          }));
          break;

        default:
          console.log('Unhandled webhook event type:', eventType, 'Payload:', JSON.stringify(payload));
      }

      // Mark event as processed
      if (webhookEventId) {
        const markResult = await markEventProcessed(webhookEventId, {
          eventType: eventType,
          transactionId: payload.transactionId || payload.id
        });
        console.log('Event marked as processed:', webhookEventId, {
          storageSource: markResult.source,
          success: markResult.success
        });
      }

      return res.status(200).json({
        received: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      
      return res.status(200).json({
        received: true,
        error: 'Processing error logged',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    allowed: ['GET', 'POST', 'HEAD', 'OPTIONS']
  });
};

// Vercel config to get raw body for signature verification
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
