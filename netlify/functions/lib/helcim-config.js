/**
 * Helcim Payment Gateway Configuration
 * 
 * Environment-based configuration for switching between Helcim sandbox and production.
 * Automatically detects environment and returns appropriate API settings.
 * 
 * Environment Variables:
 * - HELCIM_ENVIRONMENT: 'sandbox' or 'production' (default: auto-detect based on Netlify context)
 * - HELCIM_API_TOKEN: Your Helcim API token (sandbox or production)
 * - HELCIM_WEBHOOK_SECRET: Webhook verification token from Helcim
 * - SITE_URL: Your site URL for payment redirects
 * 
 * @module helcim-config
 */

/**
 * Helcim API base URLs for different environments
 * 
 * Note: Helcim uses the same API endpoint for both sandbox and production.
 * The differentiation is made through the API token used - sandbox tokens
 * only work with test card numbers and don't process real payments.
 * 
 * Reference: https://devdocs.helcim.com/docs/developer-testing
 */
const HELCIM_ENDPOINTS = {
  sandbox: 'https://api.helcim.com/v2',
  production: 'https://api.helcim.com/v2'
};

/**
 * Test card numbers for sandbox environment
 * Reference: https://devdocs.helcim.com/docs/developer-testing
 */
const TEST_CARDS = {
  success: {
    number: '4242424242424242',
    expiry: '12/25',
    cvv: '123',
    description: 'Always succeeds'
  },
  decline: {
    number: '4000000000000002',
    expiry: '12/25',
    cvv: '123',
    description: 'Always declines'
  },
  insufficientFunds: {
    number: '4000000000009995',
    expiry: '12/25',
    cvv: '123',
    description: 'Insufficient funds decline'
  }
};

/**
 * Determines if the current environment is sandbox based on various factors
 * 
 * @returns {boolean} True if running in sandbox mode
 */
function isSandbox() {
  // Check explicit environment override
  const explicitEnv = process.env.HELCIM_ENVIRONMENT;
  if (explicitEnv) {
    return explicitEnv.toLowerCase() === 'sandbox';
  }
  
  // Check Netlify context
  const netlifyContext = process.env.CONTEXT;
  if (netlifyContext === 'dev' || netlifyContext === 'branch-deploy' || netlifyContext === 'deploy-preview') {
    return true;
  }
  
  // Default to production for safety in production context
  if (netlifyContext === 'production') {
    return false;
  }
  
  // Default to sandbox if running locally (no CONTEXT set)
  return !netlifyContext;
}

/**
 * Gets the current Helcim configuration based on environment
 * 
 * @returns {Object} Configuration object with environment settings
 */
function getConfig() {
  const sandbox = isSandbox();
  const apiToken = process.env.HELCIM_API_TOKEN;
  const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET;
  const siteUrl = process.env.SITE_URL || 'http://localhost:8888';
  
  return {
    environment: sandbox ? 'sandbox' : 'production',
    isSandbox: sandbox,
    apiBaseUrl: HELCIM_ENDPOINTS[sandbox ? 'sandbox' : 'production'],
    apiToken: apiToken || null,
    webhookSecret: webhookSecret || null,
    siteUrl: siteUrl,
    isConfigured: !!apiToken,
    testCards: sandbox ? TEST_CARDS : null
  };
}

/**
 * Validates that all required configuration is present
 * 
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateConfig() {
  const config = getConfig();
  const errors = [];
  
  if (!config.apiToken) {
    errors.push('HELCIM_API_TOKEN is required');
  }
  
  if (!config.siteUrl) {
    errors.push('SITE_URL is required for payment redirects');
  }
  
  // Warn (don't error) if webhook secret is missing
  const warnings = [];
  if (!config.webhookSecret) {
    warnings.push('HELCIM_WEBHOOK_SECRET is not configured - webhook signature verification disabled');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * Gets Helcim API headers for authenticated requests
 * 
 * @returns {Object} HTTP headers for Helcim API calls
 */
function getApiHeaders() {
  const config = getConfig();
  
  if (!config.apiToken) {
    throw new Error('HELCIM_API_TOKEN is required for API calls');
  }
  
  return {
    'api-token': config.apiToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Logs configuration status (without exposing secrets)
 * Useful for debugging deployment issues
 */
function logConfigStatus() {
  const config = getConfig();
  
  console.log('Helcim Configuration Status:', {
    environment: config.environment,
    isSandbox: config.isSandbox,
    apiBaseUrl: config.apiBaseUrl,
    hasApiToken: !!config.apiToken,
    hasWebhookSecret: !!config.webhookSecret,
    siteUrl: config.siteUrl,
    netlifyContext: process.env.CONTEXT || 'not set'
  });
}

module.exports = {
  getConfig,
  validateConfig,
  getApiHeaders,
  isSandbox,
  logConfigStatus,
  HELCIM_ENDPOINTS,
  TEST_CARDS
};
