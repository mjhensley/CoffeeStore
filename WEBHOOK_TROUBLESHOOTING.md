# Helcim Webhook Integration - Troubleshooting Guide

## Overview
This guide helps troubleshoot common issues with the Helcim webhook integration, particularly the **400 Error** that occurs during webhook URL validation.

## Common Issue: 400 Error During Webhook Setup

### Problem
When configuring a webhook URL in the Helcim Dashboard, you receive a **400 Bad Request** error, and the webhook URL cannot be validated.

### Root Cause
Helcim validates webhook URLs by sending a **HEAD request** to the endpoint before allowing you to save the webhook configuration. If your webhook endpoint doesn't properly handle HEAD requests, Helcim will receive an error response and reject the URL.

### Solution
The webhook handler must support the following HTTP methods:

1. **HEAD** - Used by Helcim to validate the webhook URL exists and is accessible
2. **GET** - Health check endpoint to verify operational status
3. **POST** - Receives actual webhook events from Helcim
4. **OPTIONS** - CORS preflight support for cross-origin requests

### Implementation Details

The fixed `helcim-webhook.js` now properly handles all required methods:

```javascript
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Helcim-Signature',
        'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle HEAD request - Critical for Helcim validation
    if (event.httpMethod === 'HEAD') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Handle GET request - Health check
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: 'ready',
                message: 'Helcim webhook endpoint is operational',
                timestamp: new Date().toISOString()
            })
        };
    }

    // Handle POST request - Actual webhooks
    if (event.httpMethod === 'POST') {
        // Process webhook payload...
    }

    // Handle OPTIONS request - CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }
};
```

## Testing Your Webhook Endpoint

### 1. Test HEAD Request (Validation)
```bash
curl -I https://your-site.netlify.app/.netlify/functions/helcim-webhook
```

Expected response:
```
HTTP/2 200
access-control-allow-origin: *
access-control-allow-methods: GET, POST, HEAD, OPTIONS
content-type: application/json
```

### 2. Test GET Request (Health Check)
```bash
curl https://your-site.netlify.app/.netlify/functions/helcim-webhook
```

Expected response:
```json
{
  "status": "ready",
  "message": "Helcim webhook endpoint is operational",
  "timestamp": "2025-12-21T20:00:00.000Z"
}
```

### 3. Test POST Request (Webhook Event)
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/helcim-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment.success","transactionId":"test123"}'
```

Expected response:
```json
{
  "received": true,
  "timestamp": "2025-12-21T20:00:00.000Z"
}
```

## Webhook Configuration Steps

1. **Deploy the Fixed Code**
   - Ensure the updated `helcim-webhook.js` is deployed to your Netlify site
   - Wait for the deployment to complete

2. **Test the Endpoint**
   - Use the HEAD request test above to verify it responds with 200 OK
   - Use the GET request test to verify the health check works

3. **Configure in Helcim Dashboard**
   - Go to Helcim Dashboard → Integrations → Webhooks
   - Add webhook URL: `https://your-site.netlify.app/.netlify/functions/helcim-webhook`
   - Select the events you want to receive (payment.success, payment.failed, etc.)
   - Save the configuration

4. **Verify Webhook is Active**
   - Check that Helcim shows the webhook as "Active"
   - Test with a payment transaction to verify events are received

## Edge Function Configuration

The webhook endpoint should **bypass bot protection** edge functions to ensure Helcim's requests aren't blocked.

Check your `netlify.toml` configuration:

```toml
[[edge_functions]]
  path = "/.netlify/functions/*"
  function = "security-check"
```

The bot protection edge function (in `netlify/edge-functions/bot-protection.js`) should exclude webhook endpoints to prevent blocking Helcim's requests:

```javascript
// Skip for all Netlify functions
if (path.startsWith('/.netlify/')) {
  return context.next();
}
```

This configuration is already in place in the repository.

## Monitoring Webhook Events

### Check Netlify Function Logs
1. Go to Netlify Dashboard → Functions
2. Select `helcim-webhook`
3. View recent invocations and logs

### Webhook Event Logging
The handler logs all webhook events (without sensitive data):

```javascript
console.log('Helcim webhook received:', {
    type: payload.type || payload.event,
    transactionId: payload.transactionId || payload.id,
    timestamp: new Date().toISOString()
});
```

## Security Considerations

### Webhook Signature Verification (Optional)
To verify webhooks are genuinely from Helcim, you can set up signature verification:

1. Get your webhook secret from Helcim Dashboard
2. Set environment variable: `HELCIM_WEBHOOK_SECRET=your_secret_here`
3. The handler will require the `X-Helcim-Signature` header to be present

**Important Note**: The current implementation provides **basic protection** by requiring the signature header to be present when `HELCIM_WEBHOOK_SECRET` is configured, but it does not cryptographically verify the signature value itself. This means:
- If no secret is set, all webhooks are accepted (development mode)
- If a secret is set, requests must include the `X-Helcim-Signature` header (basic filtering)
- Full HMAC-SHA256 signature verification should be implemented for production use

**Implementation Note**: Most webhook providers (including Stripe, GitHub, etc.) use HMAC-SHA256 for signature verification. While the exact header format and payload construction method for Helcim signatures should be verified in their official documentation, a typical implementation would look like:

```javascript
const crypto = require('crypto');

function verifyHelcimSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

Consult Helcim's developer documentation for the exact signature format, payload encoding, and header name they use.

⚠️ **Security Warning**: Without full signature verification, malicious actors who know your webhook URL could potentially send fake webhook events. For production use, you should:
1. Implement full HMAC-SHA256 signature verification based on Helcim's documentation
2. Use IP allowlisting to restrict access to Helcim's IP addresses only
3. Monitor webhook logs for suspicious activity
4. Never expose sensitive business logic based solely on webhook data without additional validation

### CORS Configuration
The webhook handler allows cross-origin requests from any origin (`*`). This is acceptable for webhooks because:
- POST requests from Helcim's servers don't originate from browsers (no CORS preflight needed)
- The endpoint only accepts POST requests for actual webhook processing
- GET requests only return non-sensitive health check data
- HEAD requests are used for URL validation only

However, note that without full signature verification, the endpoint is vulnerable to unauthorized POST requests from any source.

## Troubleshooting Checklist

- [ ] Webhook endpoint deployed and accessible
- [ ] HEAD request returns 200 OK
- [ ] GET request returns health check JSON
- [ ] Edge functions not blocking webhook endpoint
- [ ] Correct webhook URL configured in Helcim
- [ ] Function logs show webhook invocations
- [ ] No syntax errors in helcim-webhook.js

## Common Errors and Solutions

### Error: "Method not allowed"
**Symptom**: 405 error when testing webhook
**Solution**: Ensure you're using POST for webhook events, HEAD/GET for validation

### Error: "Invalid JSON payload"
**Symptom**: Webhook receives but can't parse payload
**Solution**: Check that Helcim is sending valid JSON (view function logs)

### Error: "Signature verification required"
**Symptom**: 401 error on webhook delivery
**Solution**: Either remove HELCIM_WEBHOOK_SECRET environment variable or ensure Helcim is sending X-Helcim-Signature header

### Error: 403 Forbidden
**Symptom**: Webhook blocked before reaching function
**Solution**: Check edge function bot protection isn't blocking Helcim's requests

## Additional Resources

- [Helcim API Documentation](https://devdocs.helcim.com)
- [Helcim Webhooks Guide](https://devdocs.helcim.com/docs/webhooks)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [HTTP Status Codes Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

## Support

If you continue to experience issues:
1. Check Netlify function logs for errors
2. Test the endpoint using the curl commands above
3. Verify the deployment is complete
4. Contact Helcim support if issues persist with their validation process
