/**
 * Idempotency Storage Utility for Webhook Processing (Vercel-compatible)
 * 
 * Uses in-memory storage with notes for Vercel KV (Upstash) upgrade.
 * This provides basic idempotency protection for webhook processing.
 * 
 * ⚠️ PRODUCTION WARNING ⚠️
 * The current in-memory implementation is NOT suitable for production use.
 * In-memory storage resets on serverless function cold starts, which means
 * duplicate webhooks may be processed after deployments or scale events.
 * 
 * For production, upgrade to Vercel KV (Upstash Redis) - see instructions below.
 * 
 * Features:
 * - In-memory storage (resets on cold starts - suitable for development/testing only)
 * - TTL-based automatic cleanup
 * - Easy upgrade path to Vercel KV
 * 
 * ============================================================
 * VERCEL KV SETUP INSTRUCTIONS
 * ============================================================
 * 
 * 1. Enable Vercel KV in your project:
 *    - Go to Vercel Dashboard → Your Project → Storage → Create Database
 *    - Select "KV" (powered by Upstash Redis)
 *    - Link to your project (this sets environment variables automatically)
 * 
 * 2. Install the @vercel/kv package:
 *    npm install @vercel/kv
 * 
 * 3. Uncomment the Vercel KV implementation below and comment out
 *    the in-memory implementation.
 * 
 * 4. Redeploy your project.
 * 
 * Required Environment Variables (auto-set by Vercel KV):
 *    - KV_URL (or KV_REST_API_URL)
 *    - KV_REST_API_TOKEN
 * 
 * @module idempotency
 */

// ============================================================
// VERCEL KV IMPLEMENTATION (Uncomment when KV is configured)
// ============================================================
// const { kv } = require('@vercel/kv');
// 
// const STORE_PREFIX = 'webhook:';
// const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
// 
// async function isEventProcessed(eventId) {
//   if (!eventId) {
//     return { processed: false, processedAt: null, source: 'invalid-id' };
//   }
//   
//   try {
//     const data = await kv.get(`${STORE_PREFIX}${eventId}`);
//     if (data) {
//       return { 
//         processed: true, 
//         processedAt: data.processedAt,
//         source: 'vercel-kv'
//       };
//     }
//     return { processed: false, processedAt: null, source: 'vercel-kv' };
//   } catch (error) {
//     console.error('Error checking event in Vercel KV:', error.message);
//     return { processed: false, processedAt: null, source: 'vercel-kv-error' };
//   }
// }
// 
// async function markEventProcessed(eventId, metadata = {}) {
//   if (!eventId) {
//     return { success: false, source: 'invalid', error: 'Event ID is required' };
//   }
//   
//   const processedAt = new Date().toISOString();
//   const eventData = { eventId, processedAt, ...metadata };
//   
//   try {
//     await kv.set(`${STORE_PREFIX}${eventId}`, eventData, { ex: DEFAULT_TTL_SECONDS });
//     return { success: true, source: 'vercel-kv', error: null };
//   } catch (error) {
//     console.error('Error storing event in Vercel KV:', error.message);
//     return { success: false, source: 'vercel-kv', error: error.message };
//   }
// }
// ============================================================

/**
 * In-memory fallback for local development or when KV isn't available
 * WARNING: This will reset on serverless function cold starts
 * Use Vercel KV for production environments
 */
const inMemoryStore = new Map();

/**
 * Store name for webhook idempotency data
 */
const STORE_NAME = 'webhook-idempotency';

/**
 * Default TTL for stored event IDs (7 days in seconds)
 */
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Maximum entries to keep in in-memory fallback store
 * This limit prevents memory exhaustion during high-volume periods
 */
const MAX_IN_MEMORY_ENTRIES = 10000;

/**
 * Checks if a webhook event has already been processed
 * 
 * @param {string} eventId - The unique webhook event ID
 * @returns {Promise<{processed: boolean, processedAt: string|null, source: string}>}
 */
async function isEventProcessed(eventId) {
  if (!eventId) {
    return { processed: false, processedAt: null, source: 'invalid-id' };
  }
  
  // In-memory check
  const inMemoryData = inMemoryStore.get(eventId);
  if (inMemoryData) {
    return {
      processed: true,
      processedAt: inMemoryData.processedAt,
      source: 'in-memory'
    };
  }
  
  return { processed: false, processedAt: null, source: 'in-memory' };
}

/**
 * Marks a webhook event as processed
 * 
 * @param {string} eventId - The unique webhook event ID
 * @param {Object} metadata - Optional metadata about the event
 * @returns {Promise<{success: boolean, source: string, error: string|null}>}
 */
async function markEventProcessed(eventId, metadata = {}) {
  if (!eventId) {
    return { success: false, source: 'invalid', error: 'Event ID is required' };
  }
  
  const processedAt = new Date().toISOString();
  const eventData = {
    eventId,
    processedAt,
    ...metadata
  };
  
  // Store in memory
  inMemoryStore.set(eventId, eventData);
  
  // Clean up old entries to prevent memory leaks
  cleanupInMemoryStore();
  
  console.log('Event marked as processed in memory (temporary):', eventId);
  return { success: true, source: 'in-memory', error: null };
}

/**
 * Cleans up expired entries from the in-memory store
 * Called automatically when adding new entries
 */
function cleanupInMemoryStore() {
  const maxAge = DEFAULT_TTL_SECONDS * 1000;
  const now = Date.now();
  
  for (const [key, value] of inMemoryStore.entries()) {
    const processedTime = new Date(value.processedAt).getTime();
    if (now - processedTime > maxAge) {
      inMemoryStore.delete(key);
    }
  }
  
  // Limit total entries to prevent unbounded memory growth
  if (inMemoryStore.size > MAX_IN_MEMORY_ENTRIES) {
    // Remove oldest entries to get back under the limit
    const entries = Array.from(inMemoryStore.entries())
      .sort((a, b) => new Date(a[1].processedAt) - new Date(b[1].processedAt));
    
    const toRemove = entries.slice(0, inMemoryStore.size - MAX_IN_MEMORY_ENTRIES);
    for (const [key] of toRemove) {
      inMemoryStore.delete(key);
    }
  }
}

/**
 * Process a webhook with idempotency protection
 * 
 * @param {string} eventId - The unique webhook event ID
 * @param {Function} processor - Async function to process the webhook
 * @param {Object} metadata - Optional metadata about the event
 * @returns {Promise<{processed: boolean, duplicate: boolean, result: any, error: string|null}>}
 */
async function processWithIdempotency(eventId, processor, metadata = {}) {
  // Check if already processed
  const checkResult = await isEventProcessed(eventId);
  
  if (checkResult.processed) {
    console.log('Duplicate webhook detected, skipping:', eventId, 'originally processed:', checkResult.processedAt);
    return {
      processed: false,
      duplicate: true,
      result: null,
      error: null,
      originalProcessedAt: checkResult.processedAt
    };
  }
  
  // Mark as processing (optimistic lock)
  await markEventProcessed(eventId, { ...metadata, status: 'processing' });
  
  try {
    // Execute the processor
    const result = await processor();
    
    // Update status to completed
    await markEventProcessed(eventId, { ...metadata, status: 'completed' });
    
    return {
      processed: true,
      duplicate: false,
      result,
      error: null
    };
  } catch (error) {
    // Mark as failed but still processed to prevent infinite retries
    await markEventProcessed(eventId, { 
      ...metadata, 
      status: 'failed',
      error: error.message 
    });
    
    console.error('Webhook processing failed:', eventId, error.message);
    
    return {
      processed: true,
      duplicate: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Gets statistics about the idempotency store
 * Useful for monitoring and debugging
 * 
 * @returns {Promise<Object>} Store statistics
 */
async function getStoreStats() {
  return {
    inMemoryEntries: inMemoryStore.size,
    storeName: STORE_NAME,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    storageType: 'in-memory',
    durable: false,
    warning: 'In-memory storage is NOT durable - resets on cold starts. For production, enable Vercel KV.',
    upgradeInstructions: 'See api/lib/idempotency.js header for Vercel KV setup instructions'
  };
}

module.exports = {
  isEventProcessed,
  markEventProcessed,
  processWithIdempotency,
  getStoreStats,
  STORE_NAME,
  DEFAULT_TTL_SECONDS,
  MAX_IN_MEMORY_ENTRIES
};
