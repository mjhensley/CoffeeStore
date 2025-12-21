# Quick Start: Checkout Integration

This guide helps you quickly integrate the checkout system into your frontend.

## Prerequisites

✅ Netlify Functions are deployed (automatic)  
✅ Environment variables configured in Netlify Dashboard  
✅ Helcim account with API token

## Step 1: Set Environment Variables

In **Netlify Dashboard → Site Settings → Environment Variables**, add:

```
HELCIM_API_TOKEN=your_helcim_api_token_here
SITE_URL=https://your-site.netlify.app
HELCIM_WEBHOOK_SECRET=your_webhook_secret_here
```

## Step 2: Frontend Integration

### Example: Basic Checkout Flow

```html
<!-- checkout.html -->
<form id="checkout-form">
  <!-- Customer Information -->
  <input type="email" id="email" required placeholder="Email">
  <input type="text" id="firstName" required placeholder="First Name">
  <input type="text" id="lastName" required placeholder="Last Name">
  <input type="tel" id="phone" placeholder="Phone (optional)">
  
  <!-- Shipping Address -->
  <input type="text" id="address" required placeholder="Street Address">
  <input type="text" id="city" required placeholder="City">
  <input type="text" id="state" required placeholder="State (e.g., OR)">
  <input type="text" id="zip" required placeholder="ZIP Code">
  
  <!-- Shipping Method -->
  <select id="shippingMethod">
    <option value="standard">Standard ($5.99)</option>
    <option value="express">Express ($12.99)</option>
    <option value="free">Free Shipping ($0.00)</option>
  </select>
  
  <button type="submit">Proceed to Payment</button>
</form>

<script>
// Get cart from localStorage (matching cart.js format)
function getCartItems() {
  const cartData = localStorage.getItem('grainhouse_cart');
  return cartData ? JSON.parse(cartData) : [];
}

// Handle checkout submission
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cart = getCartItems();
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  // Prepare checkout data
  const checkoutData = {
    cart: cart.map(item => ({
      id: item.id,
      quantity: item.quantity,
      size: item.size || '12oz',
      isSubscription: item.isSubscription || false
    })),
    customer: {
      email: document.getElementById('email').value,
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      phone: document.getElementById('phone').value || null
    },
    shipping: {
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value.toUpperCase(),
      zip: document.getElementById('zip').value,
      country: 'US'
    },
    shippingMethod: document.getElementById('shippingMethod').value
  };
  
  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  
  try {
    // Call checkout function
    const response = await fetch('/.netlify/functions/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Store invoice number for confirmation page
      sessionStorage.setItem('invoiceNumber', result.invoiceNumber);
      
      // Redirect to Helcim payment page
      window.location.href = `https://secure.helcim.app/checkout/${result.checkoutToken}`;
    } else {
      // Show error
      alert(`Checkout failed: ${result.error}`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Proceed to Payment';
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('An error occurred during checkout. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Proceed to Payment';
  }
});
</script>
```

## Step 3: Success Page

Create `success.html` to handle successful payments:

```html
<!-- success.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Order Confirmed - Grainhouse Coffee</title>
</head>
<body>
  <div class="success-container">
    <h1>🎉 Thank You for Your Order!</h1>
    <p>Your payment was successful.</p>
    <p id="invoice-info"></p>
    <p>You'll receive a confirmation email shortly.</p>
    <a href="/">Return to Home</a>
  </div>
  
  <script>
    // Display invoice number if available
    const invoiceNumber = sessionStorage.getItem('invoiceNumber');
    if (invoiceNumber) {
      document.getElementById('invoice-info').textContent = 
        `Order Number: ${invoiceNumber}`;
      
      // Clear cart
      localStorage.removeItem('grainhouse_cart');
      
      // Clear invoice from session
      sessionStorage.removeItem('invoiceNumber');
    }
  </script>
</body>
</html>
```

## Step 4: Configure Helcim Webhook

1. Log in to **Helcim Dashboard**
2. Navigate to **Integrations → Webhooks**
3. Click **Add Webhook**
4. Enter URL: `https://your-site.netlify.app/.netlify/functions/helcim-webhook`
5. Select events:
   - ✅ `payment.success`
   - ✅ `payment.failed`
   - ✅ `payment.refunded`
6. Save webhook

## Step 5: Test the Integration

### Test in Development

```bash
# Start local dev server
netlify dev

# In another terminal, test checkout
curl -X POST http://localhost:8888/.netlify/functions/checkout \
  -H "Content-Type: application/json" \
  -d @test-checkout-data.json
```

### Test in Production

1. Add a product to cart
2. Go to checkout page
3. Fill in customer information
4. Use Helcim test card: `4242 4242 4242 4242`
5. Verify successful payment
6. Check webhook receives event

## Step 6: Monitor & Debug

### Check Function Logs

```bash
# Local development
netlify dev
# Logs appear in terminal

# Production (Netlify Dashboard)
# Functions → Select function → View logs
```

### Common Issues

**Error: "Payment gateway not configured"**
- ✅ Check `HELCIM_API_TOKEN` is set in Netlify Dashboard
- ✅ Verify token is valid in Helcim Dashboard

**Error: "Invalid product: [id]"**
- ✅ Check product ID matches server catalog in `checkout.js`
- ✅ Update `PRODUCT_CATALOG` if needed

**Error: "Valid email is required"**
- ✅ Ensure email format is valid
- ✅ Check no extra spaces in input

**Webhook not receiving events**
- ✅ Verify webhook URL is correct in Helcim Dashboard
- ✅ Check function is deployed (visit URL directly)
- ✅ Test with Helcim's webhook testing tool

## Next Steps

- [ ] Style checkout form to match your site design
- [ ] Add order confirmation email (integrate with Resend or SendGrid)
- [ ] Implement order tracking
- [ ] Add subscription management
- [ ] Set up analytics tracking

## Resources

- [Checkout Foundation Docs](CHECKOUT_FOUNDATION.md)
- [Helcim API Docs](https://devdocs.helcim.com)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

---

Need help? Check the full documentation in `CHECKOUT_FOUNDATION.md`
