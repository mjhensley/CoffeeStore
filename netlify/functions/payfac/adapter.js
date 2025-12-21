/**
 * Payment Adapter Interface
 * 
 * This module defines the interface that all payment processor adapters must implement.
 * By adhering to this interface, you can easily swap between payment processors
 * (Stripe, Square, Adyen, etc.) without changing the core payment logic.
 * 
 * @module payfac/adapter
 */

/**
 * @typedef {Object} CheckoutSession
 * @property {string} redirectUrl - The URL to redirect the customer to for payment
 * @property {string} sessionId - Unique identifier for this checkout session
 */

/**
 * @typedef {Object} WebhookEvent
 * @property {boolean} verified - Whether the webhook signature was verified
 * @property {string} publicToken - The Snipcart public token from metadata
 * @property {string} transactionId - The payment processor's transaction ID
 * @property {string} status - Payment status (e.g., 'succeeded', 'failed')
 * @property {Object} rawEvent - The raw webhook event data
 */

/**
 * Base Payment Adapter Interface
 * 
 * All payment processor adapters must implement these methods.
 */
class PaymentAdapter {
  /**
   * Creates a hosted checkout session with the payment processor
   * 
   * @param {Object} params - Checkout session parameters
   * @param {number} params.amount - Amount in the smallest currency unit (e.g., cents)
   * @param {string} params.currency - Three-letter ISO currency code (e.g., 'usd')
   * @param {Object} params.metadata - Metadata to attach to the payment (must include publicToken)
   * @param {string} params.metadata.publicToken - Snipcart public token for this payment session
   * @param {string} params.successUrl - URL to redirect to on successful payment
   * @param {string} params.cancelUrl - URL to redirect to on cancelled payment
   * @returns {Promise<CheckoutSession>} The checkout session with redirect URL
   * @throws {Error} If checkout session creation fails
   */
  async createHostedCheckout({ amount, currency, metadata, successUrl, cancelUrl }) {
    throw new Error('createHostedCheckout() must be implemented by payment adapter');
  }

  /**
   * Verifies a webhook request from the payment processor
   * 
   * @param {Object} request - The webhook request object
   * @param {string} request.body - Raw request body (for signature verification)
   * @param {Object} request.headers - Request headers (contains signature)
   * @param {string} webhookSecret - The webhook signing secret
   * @returns {Promise<Object>} The verified webhook event object
   * @throws {Error} If webhook verification fails
   */
  async verifyWebhook(request, webhookSecret) {
    throw new Error('verifyWebhook() must be implemented by payment adapter');
  }

  /**
   * Extracts the Snipcart public token from a webhook event
   * 
   * @param {Object} event - The webhook event object (after verification)
   * @returns {string|null} The public token, or null if not found
   */
  extractPublicToken(event) {
    throw new Error('extractPublicToken() must be implemented by payment adapter');
  }

  /**
   * Extracts the payment processor's transaction ID from a webhook event
   * 
   * @param {Object} event - The webhook event object (after verification)
   * @returns {string} The transaction ID
   */
  getTransactionId(event) {
    throw new Error('getTransactionId() must be implemented by payment adapter');
  }

  /**
   * Gets the payment status from a webhook event
   * 
   * @param {Object} event - The webhook event object (after verification)
   * @returns {string} The payment status (e.g., 'succeeded', 'failed', 'pending')
   */
  getPaymentStatus(event) {
    throw new Error('getPaymentStatus() must be implemented by payment adapter');
  }
}

module.exports = { PaymentAdapter };
