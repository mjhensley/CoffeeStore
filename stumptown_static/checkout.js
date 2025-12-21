/**
 * Checkout Logic - Helcim Integration
 * 
 * Orchestrates the checkout flow with Helcim payment processing.
 * All sensitive operations happen server-side via Netlify Functions.
 */

(function() {
    'use strict';

    // State
    let cart = [];
    let helcimInstance = null;
    let checkoutToken = null;

    // DOM Elements
    const loadingState = document.getElementById('loadingState');
    const emptyCartState = document.getElementById('emptyCartState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const checkoutContainer = document.getElementById('checkoutContainer');
    const checkoutForm = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');

    // Tax rate (7%)
    const TAX_RATE = 0.07;

    /**
     * Initialize checkout page
     */
    function init() {
        console.log('🚀 Initializing Helcim checkout...');
        
        // Load cart from localStorage
        loadCart();
        
        // Check if cart is empty
        if (cart.length === 0) {
            showEmptyCart();
            return;
        }
        
        // Render order summary
        renderOrderSummary();
        
        // Calculate totals
        updateTotals();
        
        // Setup event listeners
        setupEventListeners();
        
        // Show checkout form
        showCheckout();
        
        console.log('✅ Checkout initialized with', cart.length, 'items');
    }

    /**
     * Load cart from localStorage
     */
    function loadCart() {
        try {
            const cartData = localStorage.getItem('grainhouse_cart');
            if (cartData) {
                cart = JSON.parse(cartData);
            }
        } catch (error) {
            console.error('❌ Failed to load cart:', error);
            cart = [];
        }
    }

    /**
     * Render order summary
     */
    function renderOrderSummary() {
        const orderItems = document.getElementById('orderItems');
        
        orderItems.innerHTML = cart.map(item => `
            <div class="summary-item">
                <img src="${item.image || 'images/coffee-placeholder.jpg'}" 
                     alt="${item.name}" 
                     class="summary-item-image">
                <div class="summary-item-details">
                    <div class="summary-item-name">${item.name}</div>
                    <div class="summary-item-qty">Quantity: ${item.quantity}</div>
                </div>
                <div class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');
    }

    /**
     * Calculate and update totals
     */
    function updateTotals() {
        // Calculate subtotal in cents to avoid floating point errors
        const subtotalCents = cart.reduce((sum, item) => {
            return sum + Math.round(item.price * 100) * item.quantity;
        }, 0);
        
        // Get selected shipping cost
        const selectedShipping = document.querySelector('input[name="shipping"]:checked');
        const shippingOption = selectedShipping?.closest('.shipping-option');
        const shippingCents = Math.round(parseFloat(shippingOption?.dataset.price || 5.99) * 100);
        
        // Calculate tax (7% of subtotal only)
        const taxCents = Math.round(subtotalCents * TAX_RATE);
        
        // Calculate total
        const totalCents = subtotalCents + shippingCents + taxCents;
        
        // Convert back to dollars for display
        const subtotal = subtotalCents / 100;
        const shipping = shippingCents / 100;
        const tax = taxCents / 100;
        const total = totalCents / 100;
        
        // Update display
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('shippingCost').textContent = `$${shipping.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
        
        return { subtotal, shipping, tax, total, totalCents };
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Shipping option selection
        const shippingOptions = document.querySelectorAll('.shipping-option');
        shippingOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                shippingOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                this.classList.add('selected');
                // Check the radio button
                this.querySelector('input[type="radio"]').checked = true;
                // Update totals
                updateTotals();
            });
        });
        
        // Form submission
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }

    /**
     * Handle checkout form submission
     */
    async function handleCheckoutSubmit(event) {
        event.preventDefault();
        
        console.log('🔄 Processing checkout...');
        
        // Disable submit button
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
        
        try {
            // Gather form data
            const formData = new FormData(checkoutForm);
            const customer = {
                email: formData.get('email'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                phone: formData.get('phone') || ''
            };
            
            const shipping = {
                address: formData.get('address'),
                address2: formData.get('address2') || '',
                city: formData.get('city'),
                state: formData.get('state'),
                zip: formData.get('zip'),
                country: formData.get('country')
            };
            
            const shippingMethod = formData.get('shipping');
            
            // Calculate client-side totals (for reference only, server will recalculate)
            const clientTotals = updateTotals();
            
            // Call Netlify Function to create Helcim checkout session
            console.log('📡 Creating Helcim checkout session...');
            const response = await fetch('/.netlify/functions/helcim-create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cart,
                    customer,
                    shipping,
                    shippingMethod,
                    totals: clientTotals  // Sent for reference, but server will recalculate
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Failed to create checkout session');
            }
            
            const sessionData = await response.json();
            
            if (!sessionData.success || !sessionData.checkoutToken) {
                throw new Error('Invalid checkout session response');
            }
            
            console.log('✅ Checkout session created:', sessionData.invoiceNumber);
            
            // Update display with server-calculated totals (if different)
            if (sessionData.serverCalculatedTotals) {
                console.log('Server-calculated totals:', sessionData.serverCalculatedTotals);
                
                // Update UI with authoritative server totals
                document.getElementById('subtotal').textContent = `$${sessionData.serverCalculatedTotals.subtotal.toFixed(2)}`;
                document.getElementById('shippingCost').textContent = `$${sessionData.serverCalculatedTotals.shipping.toFixed(2)}`;
                document.getElementById('tax').textContent = `$${sessionData.serverCalculatedTotals.tax.toFixed(2)}`;
                document.getElementById('total').textContent = `$${sessionData.serverCalculatedTotals.total.toFixed(2)}`;
                
                // Warn if there's a mismatch (shouldn't happen unless there's a bug)
                if (Math.abs(clientTotals.total - sessionData.serverCalculatedTotals.total) > 0.01) {
                    console.warn('⚠️ Client/server total mismatch:', {
                        client: clientTotals.total,
                        server: sessionData.serverCalculatedTotals.total
                    });
                }
            }
            
            checkoutToken = sessionData.checkoutToken;
            
            // Initialize Helcim payment form
            await initializeHelcimPayment(sessionData.checkoutToken);
            
        } catch (error) {
            console.error('❌ Checkout error:', error);
            showInlineError('Checkout failed: ' + error.message);
            
            // Re-enable submit button
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    }

    /**
     * Initialize Helcim payment form
     */
    async function initializeHelcimPayment(token) {
        try {
            console.log('💳 Initializing Helcim payment form...');
            
            // Check if HelcimPay is loaded
            if (typeof HelcimPay === 'undefined') {
                throw new Error('Helcim payment library not loaded. Please refresh the page.');
            }
            
            // Create container for Helcim payment form if it doesn't exist
            let helcimContainer = document.getElementById('helcim-payment-container');
            if (!helcimContainer) {
                helcimContainer = document.createElement('div');
                helcimContainer.id = 'helcim-payment-container';
                helcimContainer.style.marginTop = '20px';
                checkoutForm.appendChild(helcimContainer);
            }
            
            // Initialize HelcimPay.js
            helcimInstance = new HelcimPay(token);
            
            // Configure payment event handlers
            helcimInstance.on('success', handlePaymentSuccess);
            helcimInstance.on('error', handlePaymentError);
            helcimInstance.on('cancel', handlePaymentCancel);
            
            // Mount the payment form
            helcimInstance.mount('#helcim-payment-container');
            
            console.log('✅ Helcim payment form initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Helcim payment:', error);
            throw new Error('Payment system initialization failed: ' + error.message);
        }
    }

    /**
     * Handle successful payment
     */
    function handlePaymentSuccess(result) {
        console.log('✅ Payment successful:', result);
        
        // Clear cart
        localStorage.removeItem('grainhouse_cart');
        
        // Redirect to success page
        window.location.href = 'success.html?order=' + (result.transactionId || Date.now());
    }

    /**
     * Handle payment error
     */
    function handlePaymentError(error) {
        console.error('❌ Payment error:', error);
        showInlineError('Payment failed: ' + (error.message || 'Please try again or contact support'));
        
        // Re-enable submit button
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }

    /**
     * Handle payment cancellation
     */
    function handlePaymentCancel() {
        console.log('⚠️ Payment cancelled by user');
        showInlineError('Payment was cancelled. You can try again when ready.');
        
        // Re-enable submit button
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }

    /**
     * Show inline error message (non-intrusive)
     */
    function showInlineError(message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.inline-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'inline-error-message';
        errorDiv.style.cssText = `
            background-color: #fee;
            border: 1px solid #fcc;
            border-radius: 4px;
            padding: 12px 16px;
            margin: 16px 0;
            color: #c00;
            font-size: 14px;
        `;
        errorDiv.textContent = message;
        
        // Insert at top of form
        checkoutForm.insertBefore(errorDiv, checkoutForm.firstChild);
        
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }

    /**
     * Show states
     */
    function showLoading() {
        loadingState.classList.remove('hidden');
        emptyCartState.classList.add('hidden');
        errorState.classList.add('hidden');
        checkoutContainer.classList.add('hidden');
    }

    function showEmptyCart() {
        loadingState.classList.add('hidden');
        emptyCartState.classList.remove('hidden');
        errorState.classList.add('hidden');
        checkoutContainer.classList.add('hidden');
    }

    function showError(message) {
        console.error('Error:', message);
        loadingState.classList.add('hidden');
        emptyCartState.classList.add('hidden');
        errorState.classList.remove('hidden');
        checkoutContainer.classList.add('hidden');
        errorMessage.textContent = message;
    }

    function showCheckout() {
        loadingState.classList.add('hidden');
        emptyCartState.classList.add('hidden');
        errorState.classList.add('hidden');
        checkoutContainer.classList.remove('hidden');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
