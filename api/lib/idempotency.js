/**
 * Idempotency Storage Utility for Webhook Processing (Vercel-compatible)
 * 
 * Provides durable idempotency protection for webhook processing using
 * Vercel KV (Upstash Redis) with automatic fallback to in-memory storage.
 * 
 * Features:
 * - Automatic Vercel KV detection and usage when configured
 * - Graceful fallback to in-memory storage when KV is unavailable
 * - 7-day TTL for automatic cleanup
 * - Thread-safe operations
 * 
 * ============================================================
 * VERCEL KV SETUP INSTRUCTIONS (REQUIRED FOR PRODUCTION)
 * ============================================================
 * 
 * 1. Enable Vercel KV in your project:
 *    - Go to Vercel Dashboard → Your Project → Storage → Create Database
 *    - Select "KV" (powered by Upstash Redis)
 *    - Link to your project (this auto-sets environment variables)
 * 
 * 2. Required Environment Variables (auto-set by Vercel KV linking):
 *    - KV_REST_API_URL (Upstash Redis REST API URL)
 *    - KV_REST_API_TOKEN (Upstash Redis REST API token)
 * 
 * 3. Redeploy your project after linking KV storage.
 * 
 * Note: The @vercel/kv package is dynamically imported and optional.
 * If not available, the module falls back to in-memory storage with
 * a warning logged on each invocation.
 * 
 * @module idempotency
 */

/**
 * Prefix for all webhook idempotency keys in KV storage
 */
const STORE_PREFIX = 'webhook:';

/**
 * Store name for webhook idempotency data (used in logging)
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
 * In-memory fallback store for when Vercel KV is not available
 * WARNING: This will reset on serverless function cold starts
 */
const inMemoryStore = new Map();

/**
 * Cached KV module reference (null = unavailable or not checked, object = available)
 * kvChecked tracks whether we've attempted to load KV
 */
let kvModule = null;
let kvChecked = false;

/**
 * Attempts to load and initialize the Vercel KV module
 * @returns {Promise<Object|null>} The kv object or null if unavailable
 */
async function getKV() {
  if (kvChecked) {
    return kvModule;
  }
  
  kvChecked = true;
  
  // Check if KV environment variables are configured
  const hasKVConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  
  if (!hasKVConfig) {
    console.warn('Vercel KV not configured (missing KV_REST_API_URL or KV_REST_API_TOKEN). Using in-memory fallback.');
    kvModule = null;
    return null;
  }
  
  try {
    // Dynamic import of @vercel/kv
    const { kv } = await import('@vercel/kv');
    kvModule = kv;
    console.log('Vercel KV initialized successfully for idempotency storage');
    return kv;
  } catch (error) {
    console.warn('Failed to load @vercel/kv module, using in-memory fallback:', error.message);
    kvModule = null;
    return null;
  }
}

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
  
  const kv = await getKV();
  
  // Try Vercel KV first if available
  if (kv) {
    try {
      const data = await kv.get(`${STORE_PREFIX}${eventId}`);
      if (data) {
        return { 
          processed: true, 
          processedAt: data.processedAt,
          source: 'vercel-kv'
        };
      }
      return { processed: false, processedAt: null, source: 'vercel-kv' };
    } catch (error) {
      console.error('Error checking event in Vercel KV:', error.message);
      // Fall through to in-memory check
    }
  }
  
  // Fallback to in-memory check
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
  
  const kv = await getKV();
  
  // Try Vercel KV first if available
  if (kv) {
    try {
      await kv.set(`${STORE_PREFIX}${eventId}`, eventData, { ex: DEFAULT_TTL_SECONDS });
      console.log('Event marked as processed in Vercel KV:', eventId);
      return { success: true, source: 'vercel-kv', error: null };
    } catch (error) {
      console.error('Error storing event in Vercel KV:', error.message);
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
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
  const kv = await getKV();
  const hasKV = !!kv;
  
  return {
    inMemoryEntries: inMemoryStore.size,
    storeName: STORE_NAME,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    storageType: hasKV ? 'vercel-kv' : 'in-memory',
    durable: hasKV,
    kvConfigured: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    warning: hasKV ? null : 'In-memory storage is NOT durable - resets on cold starts. For production, enable Vercel KV.',
    upgradeInstructions: hasKV ? null : 'See api/lib/idempotency.js header for Vercel KV setup instructions'
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
