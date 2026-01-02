/**
 * Health Check API Route (Vercel)
 * 
 * Returns configuration status without exposing secrets.
 * Useful for debugging deployment issues.
 * 
 * Endpoint: GET /api/health
 */

const { getStoreStats } = require('./lib/idempotency');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables without exposing values
    const helcimConfigured = !!process.env.HELCIM_API_TOKEN;
    const webhookSecretConfigured = !!process.env.HELCIM_WEBHOOK_SECRET;
    const resendConfigured = !!process.env.RESEND_API_KEY;
    const siteUrl = process.env.SITE_URL || 'not-set';
    const kvConfigured = !!(process.env.KV_URL || process.env.KV_REST_API_URL);
    
    // Check if we're in development or production
    const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
    
    // Get idempotency storage stats
    let idempotencyStats;
    try {
      idempotencyStats = await getStoreStats();
    } catch (e) {
      idempotencyStats = { error: 'Unable to get stats' };
    }
    
    const status = {
      status: 'healthy',
      platform: 'vercel',
      timestamp: new Date().toISOString(),
      environment: env,
      configuration: {
        helcimApiToken: helcimConfigured ? 'configured' : 'missing',
        helcimWebhookSecret: webhookSecretConfigured ? 'configured' : 'missing',
        resendApiKey: resendConfigured ? 'configured' : 'missing',
        siteUrl: siteUrl !== 'not-set' ? 'configured' : 'not-set',
        vercelKv: kvConfigured ? 'configured' : 'not-configured (using in-memory fallback)'
      },
      services: {
        api: 'operational',
        checkout: helcimConfigured ? 'ready' : 'not-configured',
        webhooks: webhookSecretConfigured ? 'ready' : 'signature-verification-disabled',
        contactForm: resendConfigured ? 'ready' : 'not-configured',
        idempotency: idempotencyStats.durable === false ? 'in-memory (non-durable)' : 'ready'
      },
      idempotencyStorage: idempotencyStats,
      endpoints: {
        checkout: '/api/checkout',
        webhook: '/api/helcim-webhook',
        webhookAlias: '/webhooks/payment',
        contactEmail: '/api/send-contact-email',
        health: '/api/health'
      },
      legacyRewrites: {
        '/.netlify/functions/checkout': '/api/checkout',
        '/.netlify/functions/helcim-webhook': '/api/helcim-webhook',
        '/.netlify/functions/send-contact-email': '/api/send-contact-email',
        '/.netlify/functions/health': '/api/health',
        '/webhooks/*': '/api/helcim-webhook'
      }
    };

    return res.status(200).json(status);

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'unhealthy',
      platform: 'vercel',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};
