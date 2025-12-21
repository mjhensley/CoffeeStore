/**
 * Mock Payment Adapter
 * 
 * This is a mock implementation of the payment adapter interface for development and testing.
 * It simulates a payment processor without requiring any real payment processor credentials.
 * 
 * **IMPORTANT**: This is for development/testing only. Replace with a real adapter in production.
 * 
 * @module payfac/mock
 */

const { PaymentAdapter } = require('./adapter');

/**
 * Mock Payment Adapter
 * Simulates payment processor behavior for testing
 */
class MockPaymentAdapter extends PaymentAdapter {
  constructor() {
    super();
    // In-memory storage for mock checkout sessions (simulates processor database)
    this.sessions = new Map();
  }

  /**
   * Creates a mock hosted checkout session
   * 
   * In a real implementation, this would call the payment processor's API
   * to create a checkout session and return a real redirect URL.
   * 
   * @param {Object} params - Checkout session parameters
   * @returns {Promise<Object>} Mock checkout session with redirect URL
   */
  async createHostedCheckout({ amount, currency, metadata, successUrl, cancelUrl }) {
    // Validate required parameters
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!currency) {
      throw new Error('Currency is required');
    }
    if (!metadata || !metadata.publicToken) {
      throw new Error('Public token is required in metadata');
    }

    // Generate a mock session ID
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store session data (simulates processor's database)
    this.sessions.set(sessionId, {
      amount,
      currency,
      metadata,
      successUrl,
      cancelUrl,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // In a real implementation, this would be the processor's hosted checkout URL
    // For mock, we construct a URL that points to a mock payment page
    // This could be hosted on your site for testing purposes
    const mockRedirectUrl = `${process.env.SITE_URL || 'http://localhost:8888'}/mock-payment.html?session=${sessionId}`;

    console.log('[Mock Adapter] Created checkout session:', {
      sessionId,
      amount: amount / 100, // Log in dollars for readability
      currency,
      publicToken: metadata.publicToken
    });

    return {
      redirectUrl: mockRedirectUrl,
      sessionId: sessionId
    };
  }

  /**
   * Verifies a mock webhook request
   * 
   * In a real implementation, this would verify the webhook signature
   * using the processor's SDK or cryptographic verification.
   * 
   * @param {Object} request - The webhook request
   * @param {string} webhookSecret - Mock webhook secret (not used in mock)
   * @returns {Promise<Object>} The webhook event
   */
  async verifyWebhook(request, webhookSecret) {
    try {
      // Parse the webhook body
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      
      // In mock mode, we accept all webhooks as valid
      // In production, this would verify cryptographic signatures
      console.log('[Mock Adapter] Webhook received:', body.type || 'unknown');
      
      return body;
    } catch (error) {
      throw new Error(`Invalid webhook payload: ${error.message}`);
    }
  }

  /**
   * Extracts public token from mock webhook event
   * 
   * @param {Object} event - The webhook event
   * @returns {string|null} The public token
   */
  extractPublicToken(event) {
    // Mock events store publicToken in metadata
    return event.metadata?.publicToken || event.publicToken || null;
  }

  /**
   * Gets transaction ID from mock webhook event
   * 
   * @param {Object} event - The webhook event
   * @returns {string} The transaction ID
   */
  getTransactionId(event) {
    // Mock events use sessionId as transaction ID
    return event.sessionId || event.id || `mock_txn_${Date.now()}`;
  }

  /**
   * Gets payment status from mock webhook event
   * 
   * @param {Object} event - The webhook event
   * @returns {string} The payment status
   */
  getPaymentStatus(event) {
    return event.status || 'succeeded';
  }

  /**
   * Helper method to simulate a successful payment webhook
   * This can be called programmatically for testing
   * 
   * @param {string} sessionId - The checkout session ID
   * @returns {Object} Mock webhook event
   */
  simulateSuccessWebhook(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      type: 'payment.succeeded',
      sessionId: sessionId,
      status: 'succeeded',
      metadata: session.metadata,
      publicToken: session.metadata.publicToken,
      amount: session.amount,
      currency: session.currency,
      createdAt: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new MockPaymentAdapter();
