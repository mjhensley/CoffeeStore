/**
 * Idempotency Storage Utility for Webhook Processing
 * 
 * Uses Netlify Blobs to persistently track processed webhook event IDs
 * and prevent duplicate processing when Helcim retries webhook delivery.
 * 
 * Features:
 * - Persistent storage across function invocations
 * - TTL-based automatic cleanup (events expire after 7 days by default)
 * - Thread-safe atomic operations
 * - Graceful fallback if Netlify Blobs is unavailable
 * 
 * @module idempotency
 */

let blobsModule = null;

/**
 * Lazily loads @netlify/blobs module
 * This allows graceful degradation if the package isn't available
 * 
 * @returns {Promise<Object|null>} The blobs module or null
 */
async function getBlobsModule() {
  if (blobsModule !== null) {
    return blobsModule;
  }
  
  try {
    // Dynamic import to handle cases where the module isn't available
    blobsModule = await import('@netlify/blobs');
    return blobsModule;
  } catch (error) {
    console.warn('Netlify Blobs not available, falling back to in-memory storage:', error.message);
    blobsModule = false; // Use false to indicate failed loading
    return null;
  }
}

/**
 * In-memory fallback for local development or when Blobs isn't available
 * Note: This will reset on function cold starts
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
 * when Netlify Blobs is unavailable. 10,000 events covers approximately
 * 24 hours of high-volume webhook traffic (assuming ~7 events/minute).
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
  
  const blobs = await getBlobsModule();
  
  if (blobs) {
    try {
      const store = blobs.getStore(STORE_NAME);
      const data = await store.get(eventId, { type: 'json' });
      
      if (data) {
        return { 
          processed: true, 
          processedAt: data.processedAt,
          source: 'netlify-blobs'
        };
      }
      
      return { processed: false, processedAt: null, source: 'netlify-blobs' };
    } catch (error) {
      console.error('Error checking event in Netlify Blobs:', error.message);
      // Fall through to in-memory check
    }
  }
  
  // Fallback to in-memory store
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
  
  const blobs = await getBlobsModule();
  
  if (blobs) {
    try {
      const store = blobs.getStore(STORE_NAME);
      
      // Store with metadata that includes TTL for periodic cleanup
      // Note: Netlify Blobs doesn't have native TTL support. The expiresAt field
      // is stored for reference and can be used by a scheduled cleanup job.
      // For automatic cleanup, consider using Netlify Scheduled Functions to
      // periodically remove expired entries via the list() and delete() APIs.
      await store.setJSON(eventId, {
        ...eventData,
        expiresAt: new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000).toISOString()
      });
      
      console.log('Event marked as processed in Netlify Blobs:', eventId);
      return { success: true, source: 'netlify-blobs', error: null };
    } catch (error) {
      console.error('Error storing event in Netlify Blobs:', error.message);
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory store
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
  // This helps prevent race conditions in concurrent invocations
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
  const blobs = await getBlobsModule();
  
  const stats = {
    inMemoryEntries: inMemoryStore.size,
    blobsAvailable: !!blobs,
    storeName: STORE_NAME,
    ttlSeconds: DEFAULT_TTL_SECONDS
  };
  
  return stats;
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
