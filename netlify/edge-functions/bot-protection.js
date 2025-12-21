/**
 * Bot Protection Edge Function
 * Runs at Netlify's edge network to block bots before they reach the site
 * Detects common bots, blocks blacklisted IPs/fingerprints, rate limits
 */

// In-memory cache for blocked entities (resets on deploy)
// For production, use Netlify Blobs or a KV store
const blockedIPs = new Set();
const blockedFingerprints = new Set();
const requestCounts = new Map();

// Whitelisted IPs that should never be blocked
const whitelistedIPs = new Set([
  '104.203.14.168', // Whitelisted per user request
]);

// Known bot User-Agent patterns (reduced list - only block obvious bots)
const BOT_PATTERNS = [
  // Obvious automation tools
  /wget/i, /curl/i,
  /httpclient/i, /libwww/i, /lwp/i, /httpunit/i,
  /phantom/i, /headless/i, /puppeteer/i, /playwright/i,
  /selenium/i, /webdriver/i, /chromedriver/i, /geckodriver/i,
  
  // Malicious patterns
  /zgrab/i, /masscan/i, /nmap/i, /nikto/i, /sqlmap/i, /wpscan/i,
  /acunetix/i, /nessus/i, /qualys/i, /burpsuite/i, /zap/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /ffuf/i,
];

// Allow these legitimate bots (for SEO)
const ALLOWED_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /slackbot/i,
  /facebot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /applebot/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
];

// Suspicious header patterns
const SUSPICIOUS_HEADERS = [
  'x-forwarded-for', // Too many proxy hops
  'via',
];

// Rate limit config - relaxed to avoid blocking legitimate users
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 300, // Max requests per minute per IP (increased from 100)
  blockDuration: 60000, // 1 minute block (reduced from 5 minutes)
};

/**
 * Check if the request is from a bot
 * 
 * This function only blocks requests that positively match known bot patterns.
 * It does NOT block based on missing headers or browser fingerprinting to avoid
 * blocking legitimate users on mobile browsers, privacy browsers, Samsung Internet,
 * Opera, Brave, UC Browser, WebViews, and other legitimate browsers.
 */
function isBot(request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Allow missing or short user agents - some legitimate browsers/devices may have them
  if (!userAgent) {
    return { isBot: false, reason: 'missing-ua-allowed' };
  }
  
  // Check for allowed bots first (let them through)
  for (const pattern of ALLOWED_BOTS) {
    if (pattern.test(userAgent)) {
      return { isBot: false, reason: 'allowed-bot' };
    }
  }
  
  // Check for bot patterns - only block if positively matches known bot signatures
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, reason: 'bot-ua-pattern' };
    }
  }
  
  // Allow all other requests - don't block based on missing headers or
  // browser fingerprinting as this catches too many legitimate users
  return { isBot: false, reason: 'passed' };
}

/**
 * Get client IP from request
 */
function getClientIP(request) {
  // Netlify provides the real IP
  return request.headers.get('x-nf-client-connection-ip') ||
         request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Check rate limiting
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip;
  
  // Clean up old entries
  for (const [k, v] of requestCounts.entries()) {
    if (now - v.windowStart > RATE_LIMIT.windowMs * 2) {
      requestCounts.delete(k);
    }
  }
  
  // Check if IP is temporarily blocked
  const record = requestCounts.get(key);
  if (record && record.blocked && now < record.blockedUntil) {
    return { blocked: true, reason: 'rate-limited' };
  }
  
  // Clear block if duration has passed
  if (record && record.blocked && now >= record.blockedUntil) {
    record.blocked = false;
    record.count = 1;
    record.windowStart = now;
    return { blocked: false };
  }
  
  // Update request count
  if (!record || now - record.windowStart > RATE_LIMIT.windowMs) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return { blocked: false };
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT.maxRequests) {
    record.blocked = true;
    record.blockedUntil = now + RATE_LIMIT.blockDuration;
    // Don't permanently add to blockedIPs - only use temporary blocking
    return { blocked: true, reason: 'rate-limit-exceeded' };
  }
  
  return { blocked: false };
}

/**
 * Generate a simple device fingerprint from headers
 */
function generateFingerprint(request) {
  const ua = request.headers.get('user-agent') || '';
  const lang = request.headers.get('accept-language') || '';
  const encoding = request.headers.get('accept-encoding') || '';
  const platform = request.headers.get('sec-ch-ua-platform') || '';
  
  // Create a simple hash
  const str = `${ua}|${lang}|${encoding}|${platform}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Create blocked response
 */
function blockedResponse(reason) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <title>Access Denied</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
    h1 { color: #333; margin: 0 0 10px; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Access Denied</h1>
    <p>Automated requests are not allowed.</p>
    <p style="font-size: 12px; color: #999; margin-top: 20px;">If you believe this is an error, please contact us.</p>
  </div>
</body>
</html>`,
    {
      status: 403,
      headers: {
        'Content-Type': 'text/html',
        'X-Block-Reason': reason,
        'Cache-Control': 'no-store',
      },
    }
  );
}

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Skip bot check for static assets (images, fonts, etc.)
  if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|css|js|map)$/i)) {
    return context.next();
  }
  
  // Skip for Netlify functions
  if (path.startsWith('/.netlify/')) {
    return context.next();
  }
  
  const ip = getClientIP(request);
  const fingerprint = generateFingerprint(request);
  
  // Skip all checks for whitelisted IPs
  if (whitelistedIPs.has(ip)) {
    return context.next();
  }
  
  // Check if IP or fingerprint is blocked
  if (blockedIPs.has(ip)) {
    return blockedResponse('blocked-ip');
  }
  
  if (blockedFingerprints.has(fingerprint)) {
    return blockedResponse('blocked-fingerprint');
  }
  
  // Check rate limiting
  const rateCheck = checkRateLimit(ip);
  if (rateCheck.blocked) {
    return blockedResponse(rateCheck.reason);
  }
  
  // Check for bot patterns
  const botCheck = isBot(request);
  if (botCheck.isBot) {
    // Block the current request but don't permanently add to block lists
    // Only rate limiting should add to permanent block lists to avoid
    // blocking legitimate users who might have unusual user agents
    return blockedResponse(botCheck.reason);
  }
  
  // Add security headers to response
  const response = await context.next();
  
  // Clone headers and add security
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-XSS-Protection', '1; mode=block');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export const config = {
  path: "/*",
  excludedPath: ["/images/*", "/*.png", "/*.jpg", "/*.jpeg", "/*.gif", "/*.svg", "/*.ico", "/*.css", "/*.js", "/*.woff", "/*.woff2"]
};

