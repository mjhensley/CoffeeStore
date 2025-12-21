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
    let shippingAutocomplete = null;
    let billingAutocomplete = null;

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
        
        // Initialize billing address toggle
        initBillingAddressToggle();
        
        // Initialize address autocomplete (if API key is available)
        initAddressAutocomplete();
        
        // Show checkout form
        showCheckout();
        
        // Initialize Helcim payment form on page load
        initializeHelcimPaymentOnLoad();
        
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
     * Initialize billing address toggle functionality
     */
    function initBillingAddressToggle() {
        const sameBillingCheckbox = document.getElementById('sameBillingAddress');
        const billingSection = document.getElementById('billingAddressSection');
        
        if (!sameBillingCheckbox || !billingSection) {
            console.warn('Billing address toggle elements not found');
            return;
        }
        
        // Handle checkbox change
        sameBillingCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Hide billing section
                billingSection.classList.add('hidden');
                // Clear billing required attributes
                setBillingFieldsRequired(false);
            } else {
                // Show billing section
                billingSection.classList.remove('hidden');
                // Set billing required attributes
                setBillingFieldsRequired(true);
            }
        });
        
        // Initialize: billing section hidden by default
        billingSection.classList.add('hidden');
        setBillingFieldsRequired(false);
    }
    
    /**
     * Set required attribute on billing fields
     */
    function setBillingFieldsRequired(required) {
        const billingFields = [
            'billingFirstName',
            'billingLastName',
            'billingAddress',
            'billingCity',
            'billingState',
            'billingZip',
            'billingCountry'
        ];
        
        billingFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (required) {
                    field.setAttribute('required', 'required');
                } else {
                    field.removeAttribute('required');
                }
            }
        });
    }

    /**
     * Initialize address autocomplete with Google Places API
     */
    function initAddressAutocomplete() {
        // Check if Google Places API key is configured
        const apiKey = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.googlePlaces) 
            ? SITE_CONFIG.googlePlaces.apiKey 
            : '';
        
        if (!apiKey) {
            console.log('ℹ️ Google Places API key not configured. Address autocomplete disabled.');
            return;
        }
        
        console.log('🗺️ Initializing address autocomplete...');
        
        // Load Google Places API script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGrainhouseCheckoutAutocomplete`;
        script.async = true;
        script.defer = true;
        
        // Define global callback with unique name
        window.initGrainhouseCheckoutAutocomplete = function() {
            setupAutocomplete();
        };
        
        // Handle script load errors
        script.onerror = function() {
            console.error('❌ Failed to load Google Places API');
        };
        
        document.head.appendChild(script);
    }
    
    /**
     * Setup autocomplete for address fields
     */
    function setupAutocomplete() {
        if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
            console.error('Google Places library not loaded');
            return;
        }
        
        console.log('✅ Setting up address autocomplete fields');
        
        // Setup shipping address autocomplete
        const shippingAddressInput = document.getElementById('address');
        if (shippingAddressInput) {
            shippingAutocomplete = new google.maps.places.Autocomplete(shippingAddressInput, {
                types: ['address'],
                componentRestrictions: { country: ['us', 'ca'] }
            });
            
            shippingAutocomplete.addListener('place_changed', function() {
                fillInAddress(shippingAutocomplete, 'shipping');
            });
        }
        
        // Setup billing address autocomplete
        const billingAddressInput = document.getElementById('billingAddress');
        if (billingAddressInput) {
            billingAutocomplete = new google.maps.places.Autocomplete(billingAddressInput, {
                types: ['address'],
                componentRestrictions: { country: ['us', 'ca'] }
            });
            
            billingAutocomplete.addListener('place_changed', function() {
                fillInAddress(billingAutocomplete, 'billing');
            });
        }
    }
    
    /**
     * Fill in address fields from Google Places autocomplete
     */
    function fillInAddress(autocomplete, type) {
        const place = autocomplete.getPlace();
        
        if (!place.address_components) {
            console.log('No address details available');
            return;
        }
        
        // Initialize address parts
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let zip = '';
        let country = '';
        
        // Extract address components
        for (const component of place.address_components) {
            const componentType = component.types[0];
            
            switch (componentType) {
                case 'street_number':
                    streetNumber = component.long_name;
                    break;
                case 'route':
                    route = component.short_name;
                    break;
                case 'locality':
                    city = component.long_name;
                    break;
                case 'administrative_area_level_1':
                    state = component.short_name;
                    break;
                case 'postal_code':
                    zip = component.long_name;
                    break;
                case 'country':
                    country = component.short_name;
                    break;
            }
        }
        
        // Construct full address
        const fullAddress = `${streetNumber} ${route}`.trim();
        
        // Get field prefix based on type
        const prefix = type === 'billing' ? 'billing' : '';
        const cityId = prefix ? `${prefix}City` : 'city';
        const stateId = prefix ? `${prefix}State` : 'state';
        const zipId = prefix ? `${prefix}Zip` : 'zip';
        const countryId = prefix ? `${prefix}Country` : 'country';
        
        // Fill in the fields
        if (city) {
            const cityField = document.getElementById(cityId);
            if (cityField) cityField.value = city;
        }
        
        if (state) {
            const stateField = document.getElementById(stateId);
            if (stateField) stateField.value = state;
        }
        
        if (zip) {
            const zipField = document.getElementById(zipId);
            if (zipField) zipField.value = zip;
        }
        
        if (country) {
            const countryField = document.getElementById(countryId);
            if (countryField) countryField.value = country;
        }
        
        console.log(`✅ Auto-filled ${type} address fields`);
    }

    /**
     * Initialize Helcim payment form on page load
     * Creates a preliminary checkout session so payment fields are visible immediately
     */
    async function initializeHelcimPaymentOnLoad() {
        try {
            console.log('💳 Initializing Helcim payment form on page load...');
            
            // Calculate totals for preliminary session
            const totals = updateTotals();
            
            // Create preliminary checkout session with cart data only
            // User details will be updated when form is submitted
            const response = await fetch('/.netlify/functions/helcim-create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cart,
                    customer: {
                        email: '',
                        firstName: '',
                        lastName: '',
                        phone: ''
                    },
                    shipping: {
                        address: '',
                        address2: '',
                        city: '',
                        state: '',
                        zip: '',
                        country: 'US'
                    },
                    shippingMethod: 'standard',
                    totals: totals,
                    preliminary: true // Flag to indicate this is a preliminary session
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create preliminary checkout session');
            }
            
            const sessionData = await response.json();
            
            if (!sessionData.success || !sessionData.checkoutToken) {
                throw new Error('Invalid checkout session response');
            }
            
            checkoutToken = sessionData.checkoutToken;
            
            // Initialize Helcim payment form with the token
            await initializeHelcimPayment(sessionData.checkoutToken);
            
            console.log('✅ Helcim payment form initialized on page load');
            
        } catch (error) {
            console.warn('⚠️ Could not initialize payment form on page load:', error.message);
            console.log('Payment form will be initialized after form submission');
            // Don't show error to user - payment form will be initialized on submit
        }
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
        
        // Client-side validation
        const emailField = document.getElementById('email');
        const newsletterCheckbox = document.getElementById('subscribeNewsletter');
        
        // Validate: if newsletter is checked, email must be provided
        if (newsletterCheckbox && newsletterCheckbox.checked && emailField) {
            const email = emailField.value.trim();
            if (!email) {
                showInlineError('Please provide an email address to subscribe to our newsletter, or uncheck the newsletter option.');
                return;
            }
            // Basic email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showInlineError('Please provide a valid email address.');
                return;
            }
        }
        
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
            
            // Get billing address (use shipping if "same as shipping" is checked)
            const sameBilling = formData.get('sameBillingAddress') === 'on';
            const billing = sameBilling ? {
                ...shipping,
                firstName: customer.firstName,
                lastName: customer.lastName
            } : {
                firstName: formData.get('billingFirstName'),
                lastName: formData.get('billingLastName'),
                address: formData.get('billingAddress'),
                address2: formData.get('billingAddress2') || '',
                city: formData.get('billingCity'),
                state: formData.get('billingState'),
                zip: formData.get('billingZip'),
                country: formData.get('billingCountry')
            };
            
            const shippingMethod = formData.get('shipping');
            
            // Calculate client-side totals (for reference only, server will recalculate)
            const clientTotals = updateTotals();
            
            // Note: Even if payment form is already initialized, we still need to validate
            // and potentially update the checkout session with latest form data
            // The Helcim form will handle the actual payment submission
            
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
                    billing,
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
        
        // Re-enable submit button - user may want to try again
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        
        // Note: Not showing an error since cancellation is a normal user action
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
