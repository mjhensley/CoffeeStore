/**
 * Helcim Webhook Handler
 * 
 * Receives and processes Helcim payment events.
 * Verifies webhook authenticity and logs order completion.
 * This endpoint should be configured in Helcim dashboard.
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse webhook payload
        const payload = JSON.parse(event.body);
        
        console.log('Received Helcim webhook:', {
            type: payload.type,
            transactionId: payload.transactionId,
            amount: payload.amount,
            status: payload.status
        });

        // Verify webhook signature if Helcim provides one
        // Note: Check Helcim documentation for their webhook signature method
        const signature = event.headers['x-helcim-signature'] || event.headers['X-Helcim-Signature'];
        if (signature && process.env.HELCIM_WEBHOOK_SECRET) {
            const isValid = verifyHelcimSignature(event.body, signature, process.env.HELCIM_WEBHOOK_SECRET);
            if (!isValid) {
                console.error('Invalid webhook signature');
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: 'Invalid signature' })
                };
            }
        }

        // Handle different webhook event types
        switch (payload.type) {
            case 'payment.success':
            case 'transaction.approved':
                await handlePaymentSuccess(payload);
                break;
            
            case 'payment.failed':
            case 'transaction.declined':
                await handlePaymentFailure(payload);
                break;
            
            case 'payment.refunded':
                await handlePaymentRefund(payload);
                break;
            
            default:
                console.log('Unhandled webhook type:', payload.type);
        }

        // Acknowledge receipt of webhook
        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('Webhook processing error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook processing failed' })
        };
    }
};

/**
 * Verify Helcim webhook signature
 */
function verifyHelcimSignature(payload, signature, secret) {
    try {
        const hash = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        return hash === signature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(payload) {
    console.log('Payment successful:', {
        transactionId: payload.transactionId,
        amount: payload.amount,
        currency: payload.currency,
        customerEmail: payload.customerEmail,
        invoiceNumber: payload.invoiceNumber
    });

    // Here you can:
    // 1. Store order in database
    // 2. Send order confirmation email
    // 3. Update inventory
    // 4. Trigger fulfillment process
    
    // For now, just log the successful payment
    // In production, integrate with your order management system
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(payload) {
    console.log('Payment failed:', {
        transactionId: payload.transactionId,
        reason: payload.declineReason || payload.errorMessage,
        customerEmail: payload.customerEmail
    });

    // Here you can:
    // 1. Log failed attempt
    // 2. Send notification to customer
    // 3. Update analytics
}

/**
 * Handle payment refund
 */
async function handlePaymentRefund(payload) {
    console.log('Payment refunded:', {
        transactionId: payload.transactionId,
        amount: payload.amount,
        reason: payload.reason
    });

    // Here you can:
    // 1. Update order status
    // 2. Send refund confirmation email
    // 3. Update inventory
}
