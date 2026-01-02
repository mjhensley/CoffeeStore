# Webhook Domain Routing Fix - Summary

## Issue
The Helcim webhook integration was returning **307 Temporary Redirect** responses when calling:
- `curl -I https://grainhousecoffee.com/webhooks/payment` → 307 redirect to `www.grainhousecoffee.com`
- `curl -I https://grainhousecoffee.com/api/helcim-webhook` → 307 redirect to `www.grainhousecoffee.com`

Following the redirect chain resulted in **404 Not Found** on the www domain.

## Root Cause Analysis

### Primary Cause: Vercel Dashboard Domain Configuration
The `www.grainhousecoffee.com` domain was configured as the **Primary Domain** in Vercel Dashboard. When a domain is marked as Primary:

1. **Vercel performs domain-level routing BEFORE processing vercel.json**
2. All requests to non-Primary domains (apex) get 307 redirected to the Primary domain (www)
3. This redirect happens at the edge, before any rewrites or API routes are evaluated
4. The vercel.json redirect from www→apex cannot override this because it runs AFTER the domain-level redirect

### Secondary Finding: Code and Configuration Already Complete
Upon investigation, the repository already contained:
- ✅ `api/helcim-webhook.js` - Production-ready webhook handler
- ✅ `api/lib/idempotency.js` - Vercel KV integration with 7-day TTL
- ✅ `vercel.json` - Correct rewrites for `/webhooks/payment` → `/api/helcim-webhook`
- ✅ `vercel.json` - www→apex redirect (but ineffective due to dashboard config)

## Solution

### 1. Added Missing Dependency
```json
// package.json
{
  "dependencies": {
    "@vercel/kv": "^2.0.0"  // NEW - Required for durable idempotency
  }
}
```

### 2. Updated Documentation with Critical Dashboard Steps

**VERCEL_MIGRATION.md** - Added critical domain configuration section:
- Step-by-step Vercel Dashboard instructions to set apex as Primary
- DNS configuration guidance
- Webhook-specific troubleshooting

**WEBHOOK_TROUBLESHOOTING.md** - Comprehensive rewrite for Vercel:
- 307 redirect issue and fix (dashboard action required)
- All test commands for Vercel
- Correct webhook URLs
- Idempotency and signature verification documentation

### 3. Vercel Dashboard Action Required (CRITICAL)

**This fix REQUIRES a Vercel Dashboard change:**

1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Click the three-dot menu (⋯) next to `grainhousecoffee.com`
3. Select **"Set as Primary"**
4. Verify configuration shows:
   ```
   grainhousecoffee.com          [Primary] ✓ Valid
   www.grainhousecoffee.com      Redirects to grainhousecoffee.com ✓ Valid
   ```

## Summary: What Was Changed

### Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `package.json` | Added `@vercel/kv` | Enable durable idempotency storage |
| `VERCEL_MIGRATION.md` | Major update | Added domain configuration steps |
| `WEBHOOK_TROUBLESHOOTING.md` | Major rewrite | Vercel-specific troubleshooting |

### Configuration Already Present (No Changes Needed)

| Component | Location | Status |
|-----------|----------|--------|
| Webhook Handler | `api/helcim-webhook.js` | ✅ Complete |
| Idempotency Module | `api/lib/idempotency.js` | ✅ Complete |
| Webhook Rewrites | `vercel.json` | ✅ Complete |
| www→apex Redirect | `vercel.json` | ✅ Complete |

## Deployment Verification Commands

### PowerShell (Windows)
```powershell
# Test apex webhook HEAD (should be 200, no redirect)
curl.exe -I "https://grainhousecoffee.com/webhooks/payment"

# Test direct API endpoint (should be 200)
curl.exe -I "https://grainhousecoffee.com/api/helcim-webhook"

# Test www redirect to apex (should be 308, then 200)
curl.exe -I -L "https://www.grainhousecoffee.com/webhooks/payment"

# Test webhook GET health check
curl.exe "https://grainhousecoffee.com/webhooks/payment"
```

### Bash (Linux/Mac)
```bash
# Test apex webhook HEAD (should be 200, no redirect)
curl -I https://grainhousecoffee.com/webhooks/payment

# Test direct API endpoint (should be 200)
curl -I https://grainhousecoffee.com/api/helcim-webhook

# Test www redirect to apex (should be 308, then 200)
curl -I -L https://www.grainhousecoffee.com/webhooks/payment

# Test webhook GET health check
curl https://grainhousecoffee.com/webhooks/payment
```

### POST Test (Development Only)
To test POST without a valid signature (will return 401, proving function is running):
```bash
curl -X POST https://grainhousecoffee.com/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"type":"payment.success","transactionId":"test123"}'
```

**Note**: In production, you cannot simulate webhook POSTs without the valid `HELCIM_WEBHOOK_SECRET` because signature verification is enforced.

## Are There Additional Suggestions or Missing Pieces?

**Yes - One Critical Dashboard Action Required:**

The code and configuration changes in this PR are complete, but the 307 redirect will persist until the Vercel Dashboard domain configuration is updated:

| Action | Location | Who | Required |
|--------|----------|-----|----------|
| Set apex as Primary | Vercel Dashboard → Domains | **Dashboard Admin** | **YES - CRITICAL** |
| Redeploy after PR merge | Vercel | Automatic | Automatic |
| Link Vercel KV storage | Vercel Dashboard → Storage | Dashboard Admin | Recommended |

### Why Can't This Be Fixed in Code?

Vercel's domain-level Primary Domain routing operates at the CDN edge layer, which is:
1. Configured exclusively through the Dashboard API/UI
2. Evaluated BEFORE vercel.json rewrites/redirects
3. Not overridable by any project configuration file

The vercel.json redirect `www → apex` only applies AFTER the request reaches the origin, which never happens when apex is redirected to www at the edge.

## Done Criteria Checklist

After deploying this PR and making the Dashboard change:

- [ ] `curl -I https://grainhousecoffee.com/webhooks/payment` returns **200 OK** (not 307)
- [ ] `curl -I https://grainhousecoffee.com/api/helcim-webhook` returns **200 OK**
- [ ] `curl -I https://www.grainhousecoffee.com/webhooks/payment` returns **308** redirect to apex
- [ ] Helcim webhook URL validation succeeds
- [ ] Vercel KV is linked (optional but recommended for durable idempotency)
- [ ] Test payment webhook delivery works end-to-end

## Security Summary

No security vulnerabilities were introduced or discovered in this change:

- **Signature Verification**: Already implemented using HMAC-SHA256 with timing-safe comparison
- **Replay Attack Prevention**: 5-minute timestamp window validation
- **Idempotency**: Vercel KV with 7-day TTL prevents duplicate processing
- **No Secrets Exposed**: No credentials committed to repository
- **Dependency Security**: `@vercel/kv@2.0.0` checked - no known vulnerabilities
