# 5-Minute Verification Checklist

Use this checklist to verify the site optimization changes are working correctly.

## Pre-Flight Checks (30 seconds)

### 1. Console Check (localhost only)
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Look for "🔍 Site Sanity Check" message
- [ ] Verify all items show ✅:
  - ✅ Global JS: Loaded
  - ✅ Snipcart: Loaded
  - ✅ Product Pricing: Loaded
  - ✅ Cart System: Loaded
- [ ] No red error messages

### 2. Navigation Check (30 seconds)
- [ ] Open homepage
- [ ] Verify navigation bar appears at top
- [ ] Verify logo "Grainhouse Coffee" is visible
- [ ] Verify cart button with badge is visible
- [ ] Click mobile menu button (on mobile width or resize browser)
- [ ] Menu should slide in from left
- [ ] Click overlay or X button - menu should close
- [ ] Press Escape key - menu should close

### 3. Footer Check (30 seconds)
- [ ] Scroll to bottom of any page
- [ ] Verify footer appears with:
  - Brand name and description
  - Shop, Learn, Support links
  - Newsletter signup form
  - Trust badges (4 badges)
  - Payment methods logo
  - Copyright and legal links
- [ ] Click a footer link - should navigate correctly

## Critical Flow Test (2 minutes)

### 4. Product → Cart → Checkout Flow
- [ ] Go to `/collections.html`
- [ ] Click on any product card
- [ ] Verify product page loads
- [ ] **VERIFY:** NO "Ordered X times" text appears
- [ ] Select size (if applicable)
- [ ] Click "Add to Cart" button
- [ ] Verify cart badge updates (shows "1" or number)
- [ ] Click cart button in navigation
- [ ] **VERIFY:** Snipcart sidebar opens (not full page)
- [ ] In cart sidebar, click "Checkout" button
- [ ] **VERIFY:** Redirects to `/checkout.html` page
- [ ] **VERIFY:** Items appear in checkout page

### 5. Checkout Page Test
- [ ] On `/checkout.html` page
- [ ] **VERIFY:** Snipcart checkout form loads
- [ ] **VERIFY:** Product images appear in order summary
- [ ] **VERIFY:** Prices are correct
- [ ] **VERIFY:** Shipping options are available
- [ ] **VERIFY:** No blank white flash on page load

## Mobile Test (1 minute)

### 6. Mobile Responsiveness
- [ ] Resize browser to 375px width (iPhone size)
- [ ] **VERIFY:** Navigation collapses to mobile menu
- [ ] **VERIFY:** Product cards stack properly (2 columns)
- [ ] **VERIFY:** No horizontal scroll
- [ ] **VERIFY:** Touch targets are large enough (44px minimum)
- [ ] **VERIFY:** Mobile menu opens/closes smoothly
- [ ] **VERIFY:** Footer stacks vertically

### 7. Mobile Product Flow
- [ ] On mobile width, go to product page
- [ ] **VERIFY:** Product image displays correctly
- [ ] **VERIFY:** Size selector is usable
- [ ] **VERIFY:** "Add to Cart" button is easily tappable
- [ ] **VERIFY:** Cart opens correctly on mobile

## Performance Check (30 seconds)

### 8. Layout Stability
- [ ] Open homepage
- [ ] **VERIFY:** No content jumping/shifting as page loads
- [ ] **VERIFY:** Images load without causing layout shifts
- [ ] **VERIFY:** Navigation stays in place (no jumping)

### 9. Loading Speed
- [ ] Open Network tab in DevTools
- [ ] Reload page
- [ ] **VERIFY:** Critical CSS loads first (inline)
- [ ] **VERIFY:** Fonts load asynchronously
- [ ] **VERIFY:** Snipcart scripts load without blocking

## Cross-Environment Test (30 seconds)

### 10. Localhost vs Production
- [ ] Test on `http://localhost:8080`
- [ ] **VERIFY:** All features work
- [ ] **VERIFY:** Debug mode shows in console (localhost only)
- [ ] Test on `https://grainhousecoffee.com` (if available)
- [ ] **VERIFY:** All features work
- [ ] **VERIFY:** No console errors

## Known Issues to Watch For

### ⚠️ If you see these, they need fixing:
- ❌ "Ordered X times" text on product pages → Should be removed
- ❌ Horizontal scroll on mobile → Check CSS overflow settings
- ❌ Cart badge doesn't hide when empty → Check MutationObserver
- ❌ Layout shifts when images load → Add width/height to images
- ❌ Snipcart fails to load → Check API key and CSP settings
- ❌ Checkout button doesn't go to `/checkout.html` → Check cart.js

## Quick Fixes

### If cart badge doesn't update:
1. Check browser console for errors
2. Verify Snipcart script loaded
3. Check that `.snipcart-items-count` element exists

### If mobile menu doesn't work:
1. Check that `mobileMenuBtn`, `mobileNav`, `mobileNavOverlay` elements exist
2. Verify shared scripts are loaded
3. Check for JavaScript errors in console

### If checkout doesn't redirect:
1. Verify `cart.js` is loaded
2. Check that checkout button has ID `cart-checkout-btn`
3. Verify `checkout.html` file exists

## Success Criteria

✅ **All checks pass** = Site is optimized and ready
⚠️ **1-2 checks fail** = Minor issues, review specific areas
❌ **3+ checks fail** = Review shared components and script loading

---

**Time to complete:** ~5 minutes
**Frequency:** After any major changes, before deployment

