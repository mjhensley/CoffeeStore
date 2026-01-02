# Helcim Webhook Integration - Troubleshooting Guide

## Overview
This guide helps troubleshoot common issues with the Helcim webhook integration on **Vercel** hosting.

## Webhook URLs

The following URLs are valid webhook endpoints (all route to the same handler):

| URL | Purpose |
|-----|---------|
| `https://grainhousecoffee.com/webhooks/payment` | **Primary** - Use this in Helcim Dashboard |
| `https://grainhousecoffee.com/api/helcim-webhook` | Direct API route |
| `https://grainhousecoffee.com/.netlify/functions/helcim-webhook` | Legacy Netlify compatibility |

## Common Issue: 307 Redirect Breaking Webhooks

### Problem
When configuring a webhook URL in the Helcim Dashboard, the webhook validation or delivery fails because:
- `curl -I https://grainhousecoffee.com/webhooks/payment` returns **307 redirect** to www
- Following the redirect leads to **404 Not Found**

### Root Cause
In Vercel Dashboard, `www.grainhousecoffee.com` is configured as the **Primary Domain**. This causes:
1. All requests to apex (`grainhousecoffee.com`) are redirected to www
2. The redirect is a 307 (temporary), not following POST body
3. Webhooks end up at www domain which may not have the route configured

### Solution: Configure Apex as Primary Domain

**This requires Vercel Dashboard access (cannot be fixed via code alone):**

1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Find `grainhousecoffee.com` in the domain list
3. Click the three-dot menu (⋯) next to it
4. Select **"Set as Primary"**
5. Verify configuration shows:
   ```
   grainhousecoffee.com          [Primary] ✓ Valid
   www.grainhousecoffee.com      Redirects to grainhousecoffee.com ✓ Valid
   ```
6. Wait 1-2 minutes for DNS propagation
7. Test: `curl -I https://grainhousecoffee.com/webhooks/payment` should return **200 OK**

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

### 1. Test HEAD Request (Helcim URL Validation)
```bash
# On Windows PowerShell:
curl.exe -I "https://grainhousecoffee.com/webhooks/payment"

# On Linux/Mac:
curl -I https://grainhousecoffee.com/webhooks/payment
```

Expected response:
```
HTTP/2 200
access-control-allow-origin: *
access-control-allow-methods: GET, POST, HEAD, OPTIONS
content-type: application/json
```

**If you see 307 redirect instead**, the apex domain is not set as Primary. See "307 Redirect Breaking Webhooks" section above.

### 2. Test GET Request (Health Check)
```bash
curl https://grainhousecoffee.com/webhooks/payment
```

Expected response:
```json
{
  "status": "ready",
  "message": "Helcim webhook endpoint is operational",
  "timestamp": "2025-12-21T20:00:00.000Z"
}
```

### 3. Test Check Parameter (Helcim Echo Validation)
```bash
curl "https://grainhousecoffee.com/api/helcim-webhook?check=test123"
```

Expected response:
```
test123
```

### 4. Test POST Request (Simulated Webhook - Expects 401 without valid signature)
```bash
curl -X POST https://grainhousecoffee.com/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"type":"payment.success","transactionId":"test123"}'
```

Expected response (when HELCIM_WEBHOOK_SECRET is configured):
```json
{
  "error": "Missing required signature headers",
  "timestamp": "..."
}
```
HTTP Status: **401** - This proves the function is running and signature verification is active.

### 5. Test OPTIONS Request (CORS Preflight)
```bash
curl -X OPTIONS https://grainhousecoffee.com/api/helcim-webhook \
  -H "Origin: https://secure.helcim.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,webhook-signature,webhook-timestamp,webhook-id" -I
```

Expected response:
```
HTTP/2 204
access-control-allow-origin: *
access-control-allow-methods: GET, POST, HEAD, OPTIONS
access-control-max-age: 86400
```

## Webhook Configuration Steps

1. **Ensure Apex Domain is Primary in Vercel**
   - Go to Vercel Dashboard → Project → Settings → Domains
   - Set `grainhousecoffee.com` as Primary (not www)
   - This prevents 307 redirects that break webhooks

2. **Test the Endpoint**
   - Use the HEAD request test above to verify it responds with 200 OK
   - If you get 307, fix the domain configuration first

3. **Configure in Helcim Dashboard**
   - Go to Helcim Dashboard → Integrations → Webhooks
   - Add webhook URL: `https://grainhousecoffee.com/webhooks/payment`
   - Select the events you want to receive (payment.success, payment.failed, etc.)
   - Copy the **Verifier Token** from Helcim

4. **Set Webhook Secret in Vercel**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add `HELCIM_WEBHOOK_SECRET` with the Verifier Token value
   - Redeploy the project after adding the variable

5. **Validate in Helcim**
   - Click "Validate URL" in Helcim webhook settings
   - Should succeed with 200 OK
   - If validation fails, check Vercel function logs

6. **Verify Webhook is Active**
   - Check that Helcim shows the webhook as "Active"
   - Test with a sandbox payment transaction to verify events are received

## Edge Function Configuration

**Note**: This project has been migrated to Vercel. Edge functions are not currently used for webhook protection on Vercel.

The webhook endpoint automatically bypasses any edge function processing and routes directly to the Vercel API handler at `/api/helcim-webhook.js`.

## Monitoring Webhook Events

### Check Vercel Function Logs
1. Go to Vercel Dashboard → Project → Deployments
2. Click on the latest deployment
3. Click "Functions" tab
4. Select `api/helcim-webhook` to view logs

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

### Webhook Signature Verification (Required for Production)

The webhook handler implements **full HMAC-SHA256 signature verification** per Helcim's documentation:

1. **Get your webhook secret from Helcim Dashboard**:
   - Go to Integrations → Webhooks
   - Create/edit webhook and copy the **Verifier Token**
   
2. **Set environment variable in Vercel**:
   - `HELCIM_WEBHOOK_SECRET` = the Verifier Token (base64 encoded)

3. **How signature verification works**:
   - Helcim sends three headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
   - The handler computes: `HMAC-SHA256(base64_decode(secret), "${webhook-id}.${webhook-timestamp}.${body}")`
   - Signature is compared using timing-safe comparison to prevent timing attacks
   - Timestamp is validated to be within 5 minutes to prevent replay attacks

4. **If verification fails**, the handler returns:
   - **401 Unauthorized** - Missing or invalid signature headers
   - **401 Unauthorized** - Timestamp expired (replay attack prevention)
   - **401 Unauthorized** - Signature mismatch

**⚠️ Important**: If `HELCIM_WEBHOOK_SECRET` is not configured, signature verification is skipped with a warning logged. This is acceptable for development but **MUST be configured for production**.

## Idempotency Protection

The webhook handler implements **idempotency protection** using Vercel KV (Upstash Redis):

- **Event ID**: Uses `webhook-id` header, or falls back to `payload.id` / `payload.transactionId`
- **Storage**: Vercel KV with 7-day TTL
- **Fallback**: In-memory storage if Vercel KV is not configured (not durable)
- **Duplicate handling**: Returns `200 OK` with `duplicate: true` for already-processed events

To enable durable idempotency:
1. Go to Vercel Dashboard → Storage → Create Database → KV
2. Link the KV database to your project
3. Redeploy - environment variables are auto-configured

## Troubleshooting Checklist

- [ ] **Apex domain is Primary** in Vercel Dashboard (prevents 307 redirects)
- [ ] Webhook endpoint returns **200 OK** for HEAD requests
- [ ] `HELCIM_WEBHOOK_SECRET` is set in Vercel environment variables
- [ ] Webhook URL in Helcim is `https://grainhousecoffee.com/webhooks/payment`
- [ ] Helcim webhook validation succeeds
- [ ] Vercel KV is linked for durable idempotency

## Common Errors and Solutions

### Error: 307 Redirect (apex to www)
**Symptom**: `curl -I https://grainhousecoffee.com/webhooks/payment` shows 307 redirect
**Solution**: Set apex domain as Primary in Vercel Dashboard → Domains

### Error: 404 Not Found
**Symptom**: Webhook URL returns 404 after redirect
**Solution**: 
1. Fix domain configuration (apex as Primary)
2. Verify `api/helcim-webhook.js` exists
3. Check Vercel deployment logs for function bundling errors

### Error: 401 Unauthorized - Missing headers
**Symptom**: Webhook delivery fails with "Missing required signature headers"
**Solution**: Ensure Helcim is sending `webhook-id`, `webhook-timestamp`, `webhook-signature` headers

### Error: 401 Unauthorized - Signature mismatch
**Symptom**: Webhook delivery fails with "Signature verification failed"
**Solution**: 
1. Verify `HELCIM_WEBHOOK_SECRET` matches Helcim's Verifier Token exactly
2. The secret should be base64 encoded
3. Check for whitespace in environment variable
4. Regenerate the webhook in Helcim and update the secret

### Error: 405 Method Not Allowed
**Symptom**: Error when testing webhook
**Solution**: Use the correct HTTP method - POST for webhook events, HEAD/GET for validation

### Error: Timestamp expired
**Symptom**: 401 error with "Timestamp expired" message
**Solution**: Check server clock synchronization. Webhooks must be processed within 5 minutes of being sent.

## Additional Resources

- [Helcim API Documentation](https://devdocs.helcim.com)
- [Helcim Webhooks Guide](https://devdocs.helcim.com/docs/webhooks)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel KV Storage](https://vercel.com/docs/storage/vercel-kv)
- [HTTP Status Codes Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

## Support

If you continue to experience issues:
1. Check Vercel function logs for errors
2. Test the endpoint using the curl commands above
3. Verify the domain configuration in Vercel Dashboard
4. Ensure environment variables are set correctly
5. Contact Helcim support if issues persist with their validation process
