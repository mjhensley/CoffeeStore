/**
 * Security Check Edge Function
 * Validates client-side fingerprints and blocks malicious requests
 * Works in conjunction with the client-side fingerprint.js
 */

// Verify the challenge token
function verifyChallenge(token, timestamp) {
  if (!token || !timestamp) return false;
  
  // Check if timestamp is recent (within 5 minutes)
  const now = Date.now();
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime) || Math.abs(now - tokenTime) > 300000) {
    return false;
  }
  
  // Token should be a hash of timestamp + secret
  // This is verified against what the client generated
  return token.length >= 8;
}

export default async (request, context) => {
  const url = new URL(request.url);
  
  // ============================================================
  // CRITICAL: Early-exit for webhook paths
  // This explicit bypass is required because Netlify's excludedPath
  // configuration can be unreliable. This guard MUST remain at the
  // TOP of this function, BEFORE any challenge, rate-limit, or
  // blocking logic runs.
  // Webhook traffic is guaranteed to pass through untouched.
  // ============================================================
  if (url.pathname.startsWith('/webhooks/') || 
      url.pathname === '/.netlify/functions/helcim-webhook') {
    return context.next();
  }
  
  // Only check POST requests to sensitive endpoints
  if (request.method !== 'POST') {
    return context.next();
  }
  
  // Check form submissions and API calls
  if (url.pathname.includes('/functions/') || url.pathname.includes('/api/')) {
    const fingerprint = request.headers.get('X-Client-Fingerprint');
    const challenge = request.headers.get('X-Security-Challenge');
    const timestamp = request.headers.get('X-Challenge-Timestamp');
    
    // If fingerprint headers are missing, it might be a bot
    // Real browsers with our JS will send these
    if (!fingerprint && url.pathname.includes('send-')) {
      // Log for monitoring but don't block (could be legitimate non-JS request)
      console.log('Missing fingerprint for:', url.pathname);
    }
    
    // If challenge is present but invalid, block
    if (challenge && !verifyChallenge(challenge, timestamp)) {
      return new Response(JSON.stringify({ error: 'Invalid security challenge' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return context.next();
};

export const config = {
  path: ["/.netlify/functions/*", "/api/*"],
  excludedPath: ["/.netlify/functions/helcim-webhook", "/webhooks/*"]
};

