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

// Known bot User-Agent patterns (comprehensive list)
const BOT_PATTERNS = [
  // Common bots
  /bot/i, /crawler/i, /spider/i, /scraper/i, /wget/i, /curl/i, /python/i,
  /java\/|java-http/i, /perl/i, /ruby/i, /php\//i, /go-http-client/i,
  /httpclient/i, /libwww/i, /lwp/i, /httpunit/i, /nutch/i, /silk/i,
  /slurp/i, /phantom/i, /headless/i, /puppeteer/i, /playwright/i,
  /selenium/i, /webdriver/i, /chromedriver/i, /geckodriver/i,
  
  // SEO/Marketing bots (block aggressive ones)
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i, /rogerbot/i,
  /seokicks/i, /blexbot/i, /linkdexbot/i, /megaindex/i, /majestic/i,
  /screaming.frog/i, /siteexplorer/i, /twitterbot/i, /facebookexternalhit/i,
  
  // Malicious patterns
  /zgrab/i, /masscan/i, /nmap/i, /nikto/i, /sqlmap/i, /wpscan/i,
  /acunetix/i, /nessus/i, /qualys/i, /burpsuite/i, /zap/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /ffuf/i,
  
  // Fake browsers (missing proper browser tokens)
  /^mozilla\/\d/i, // Just "Mozilla/5.0" with nothing else
  /^$/,  // Empty user agent
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

// Rate limit config
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // Max requests per minute per IP
  blockDuration: 300000, // 5 minutes block
};

/**
 * Check if the request is from a bot
 */
function isBot(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const accept = request.headers.get('accept') || '';
  const secChUa = request.headers.get('sec-ch-ua') || '';
  const secFetchDest = request.headers.get('sec-fetch-dest') || '';
  const secFetchMode = request.headers.get('sec-fetch-mode') || '';
  
  // Empty or missing user agent = likely bot
  if (!userAgent || userAgent.length < 10) {
    return { isBot: true, reason: 'missing-ua' };
  }
  
  // Check for allowed bots first (let them through)
  for (const pattern of ALLOWED_BOTS) {
    if (pattern.test(userAgent)) {
      return { isBot: false, reason: 'allowed-bot' };
    }
  }
  
  // Check for bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, reason: 'bot-ua-pattern' };
    }
  }
  
  // Check for missing browser indicators
  const isBrowserLike = 
    (userAgent.includes('Chrome/') || userAgent.includes('Firefox/') || 
     userAgent.includes('Safari/') || userAgent.includes('Edge/') || 
     userAgent.includes('MSIE') || userAgent.includes('Trident/'));
  
  // Real browsers send Accept-Language and Accept headers
  if (isBrowserLike) {
    // Real Chrome sends sec-ch-ua
    if (userAgent.includes('Chrome/') && !secChUa) {
      // Could be an older Chrome or headless browser
      // Check for other browser signals
      if (!acceptLanguage || !accept.includes('text/html')) {
        return { isBot: true, reason: 'missing-browser-headers' };
      }
    }
    
    // Real browsers accessing HTML pages send proper accept headers
    if (!accept.includes('text/html') && !accept.includes('*/*') && 
        !request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i)) {
      return { isBot: true, reason: 'suspicious-accept' };
    }
  } else {
    // Not claiming to be a browser, but accessing the site
    return { isBot: true, reason: 'non-browser-ua' };
  }
  
  // Check for suspicious header combinations
  const connection = request.headers.get('connection') || '';
  if (connection.toLowerCase() === 'close' && !userAgent.includes('Safari/')) {
    // Most bots use Connection: close, real browsers use keep-alive
    // Safari sometimes uses close, so we exclude it
    // This is a soft signal, not a hard block
  }
  
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
  
  // Update request count
  if (!record || now - record.windowStart > RATE_LIMIT.windowMs) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return { blocked: false };
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT.maxRequests) {
    record.blocked = true;
    record.blockedUntil = now + RATE_LIMIT.blockDuration;
    blockedIPs.add(ip);
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
    // Block and record
    blockedIPs.add(ip);
    blockedFingerprints.add(fingerprint);
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

