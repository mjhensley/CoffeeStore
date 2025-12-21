#!/usr/bin/env node
/**
 * Test script for payment gateway components
 */

const { PaymentAdapter } = require('../netlify/functions/payfac/adapter.js');
const mockAdapter = require('../netlify/functions/payfac/mock.js');

console.log('\n--- Testing Payment Gateway Components ---\n');

// Test 1: Load modules
console.log('Test 1: Loading modules...');
console.log('✓ PaymentAdapter interface loaded');
console.log('✓ Mock adapter loaded');

// Test 2: Check interface implementation
console.log('\nTest 2: Checking interface implementation...');
if (mockAdapter.createHostedCheckout && 
    mockAdapter.verifyWebhook && 
    mockAdapter.extractPublicToken && 
    mockAdapter.getTransactionId &&
    mockAdapter.getPaymentStatus) {
  console.log('✓ Mock adapter implements all required methods');
} else {
  console.error('✗ Mock adapter missing required methods');
  process.exit(1);
}

// Test 3: Mock checkout creation
async function testMockCheckout() {
  console.log('\nTest 3: Testing mock checkout creation...');
  try {
    const checkout = await mockAdapter.createHostedCheckout({
      amount: 5000,
      currency: 'usd',
      metadata: {
        publicToken: 'test_token_123'
      },
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    });
    
    if (checkout.redirectUrl && checkout.sessionId) {
      console.log('✓ Mock checkout creation works');
      console.log('  - Session ID:', checkout.sessionId);
      console.log('  - Redirect URL:', checkout.redirectUrl);
      return checkout.sessionId;
    } else {
      console.error('✗ Mock checkout missing required fields');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Mock checkout failed:', error.message);
    process.exit(1);
  }
}

// Test 4: Mock webhook verification
async function testMockWebhook(sessionId) {
  console.log('\nTest 4: Testing mock webhook verification...');
  try {
    const mockWebhookEvent = mockAdapter.simulateSuccessWebhook(sessionId);
    console.log('✓ Mock webhook simulation works');
    
    const verified = await mockAdapter.verifyWebhook({
      body: JSON.stringify(mockWebhookEvent),
      headers: {}
    }, 'test_secret');
    
    const publicToken = mockAdapter.extractPublicToken(verified);
    const transactionId = mockAdapter.getTransactionId(verified);
    const status = mockAdapter.getPaymentStatus(verified);
    
    if (publicToken === 'test_token_123' && transactionId && status === 'succeeded') {
      console.log('✓ Mock webhook verification works');
      console.log('  - Public token extracted:', publicToken);
      console.log('  - Transaction ID:', transactionId);
      console.log('  - Status:', status);
    } else {
      console.error('✗ Webhook data extraction failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Mock webhook verification failed:', error.message);
    process.exit(1);
  }
}

// Test 5: Error handling
async function testErrorHandling() {
  console.log('\nTest 5: Testing error handling...');
  
  try {
    await mockAdapter.createHostedCheckout({
      amount: 0,
      currency: 'usd',
      metadata: { publicToken: 'test' }
    });
    console.error('✗ Should have thrown error for invalid amount');
    process.exit(1);
  } catch (error) {
    console.log('✓ Correctly rejects invalid amount');
  }
  
  try {
    await mockAdapter.createHostedCheckout({
      amount: 5000,
      currency: 'usd',
      metadata: {}
    });
    console.error('✗ Should have thrown error for missing publicToken');
    process.exit(1);
  } catch (error) {
    console.log('✓ Correctly rejects missing publicToken');
  }
}

// Run all tests
(async () => {
  try {
    const sessionId = await testMockCheckout();
    await testMockWebhook(sessionId);
    await testErrorHandling();
    console.log('\n✓ All tests passed!\n');
  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
    process.exit(1);
  }
})();
