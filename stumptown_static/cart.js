// Custom Cart Implementation - No External Service Required
(function() {
    'use strict';

    // Validation constants
    const VALIDATION = {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        ZIP_REGEX: /^\d{5}(-\d{4})?$/,
        MIN_ADDRESS_LENGTH: 5,
    };

    // Cart state
    let cart = [];
    let isCartOpen = false;

    // Initialize cart from localStorage
    function initCart() {
        // Safe localStorage access with fallback
        const storageKey = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.cart) 
            ? SITE_CONFIG.cart.storageKey 
            : 'grainhouse_cart';
        
        try {
            const savedCart = localStorage.getItem(storageKey);
            if (savedCart) {
                try {
                    cart = JSON.parse(savedCart);
                } catch (e) {
                    console.error('Failed to parse cart from localStorage:', e);
                    cart = [];
                }
            }
        } catch (storageError) {
            console.warn('localStorage unavailable, cart will not persist:', storageError);
            cart = [];
        }
        
        updateCartBadge();
        createCartUI();
        bindEvents();
    }

    // Save cart to localStorage
    function saveCart() {
        // Safe localStorage access with fallback
        const storageKey = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.cart) 
            ? SITE_CONFIG.cart.storageKey 
            : 'grainhouse_cart';
        
        try {
            localStorage.setItem(storageKey, JSON.stringify(cart));
        } catch (storageError) {
            console.warn('Failed to save cart to localStorage:', storageError);
            // Cart will still work in memory, just won't persist
        }
        updateCartBadge();
    }

    // Update cart count badge
    function updateCartBadge() {
        const badges = document.querySelectorAll('.cart-count-badge, .snipcart-items-count');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badges.forEach(badge => {
            badge.textContent = totalItems || '';
            badge.classList.toggle('hidden', totalItems === 0);
        });
    }

    // Create cart sidebar UI
    function createCartUI() {
        // Cart overlay
        const overlay = document.createElement('div');
        overlay.id = 'cart-overlay';
        overlay.className = 'cart-overlay';
        document.body.appendChild(overlay);

        // Cart sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'cart-sidebar';
        sidebar.className = 'cart-sidebar';
        sidebar.innerHTML = `
            <div class="cart-header">
                <h2>Your Cart</h2>
                <button class="cart-close" aria-label="Close cart">&times;</button>
            </div>
            <div class="cart-items" id="cart-items">
                <!-- Cart items will be rendered here -->
            </div>
            <div class="cart-footer" id="cart-footer">
                <div class="cart-total">
                    <span>Subtotal</span>
                    <span id="cart-subtotal">$0.00</span>
                </div>
                <p class="cart-shipping-note">Shipping calculated at checkout</p>
                <button type="button" class="cart-checkout-btn" id="cart-checkout-btn">Proceed to Checkout</button>
            </div>
        `;
        document.body.appendChild(sidebar);

        // Add styles
        addCartStyles();
    }

    // Add cart styles
    function addCartStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cart-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
                z-index: 10000 !important;
            }
            .cart-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .cart-sidebar {
                position: fixed;
                top: 0;
                right: 0 !important;
                width: 400px;
                max-width: 100%;
                height: 100%;
                background: #fff;
                box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
                transform: translateX(100%);
                transition: transform 0.3s ease;
                z-index: 10001 !important;
                display: flex;
                flex-direction: column;
            }
            .cart-sidebar.active {
                transform: translateX(0);
            }
            .cart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid #e5e5e5;
            }
            .cart-header h2 {
                margin: 0;
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 24px;
                font-weight: 500;
                color: #2c2c2c;
            }
            .cart-close {
                background: none;
                border: none;
                font-size: 32px;
                cursor: pointer;
                color: #666;
                padding: 0;
                line-height: 1;
                transition: color 0.2s;
            }
            .cart-close:hover {
                color: #000;
            }
            .cart-items {
                flex: 1;
                overflow-y: auto;
                padding: 20px 24px;
            }
            .cart-empty {
                text-align: center;
                padding: 60px 20px;
                color: #666;
            }
            .cart-empty-icon {
                font-size: 64px;
                margin-bottom: 16px;
                opacity: 0.3;
            }
            .cart-empty p {
                margin: 0 0 20px;
                font-size: 16px;
            }
            .cart-empty a {
                color: #c9a96e;
                text-decoration: none;
                font-weight: 500;
            }
            .cart-empty a:hover {
                text-decoration: underline;
            }
            .cart-item {
                display: flex;
                gap: 16px;
                padding: 16px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .cart-item:last-child {
                border-bottom: none;
            }
            .cart-item-image {
                width: 80px;
                height: 80px;
                object-fit: contain;
                background: #f9f6f1;
                border-radius: 8px;
                padding: 8px;
            }
            .cart-item-details {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .cart-item-name {
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 16px;
                font-weight: 500;
                color: #2c2c2c;
                margin: 0 0 4px;
            }
            .cart-item-variant {
                font-size: 13px;
                color: #888;
                margin: 0;
            }
            .cart-item-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cart-item-qty {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .qty-btn {
                width: 28px;
                height: 28px;
                border: 1px solid #ddd;
                background: #fff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .qty-btn:hover {
                background: #f5f5f5;
                border-color: #bbb;
            }
            .qty-value {
                font-size: 14px;
                min-width: 20px;
                text-align: center;
            }
            .cart-item-price {
                font-weight: 600;
                color: #2c2c2c;
            }
            .cart-item-remove {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 12px;
                padding: 4px;
                transition: color 0.2s;
            }
            .cart-item-remove:hover {
                color: #c44;
            }
            .cart-footer {
                padding: 20px 24px;
                border-top: 1px solid #e5e5e5;
                background: #fafafa;
            }
            .cart-total {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .cart-total span:first-child {
                font-size: 16px;
                color: #666;
            }
            #cart-subtotal {
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 24px;
                font-weight: 600;
                color: #2c2c2c;
            }
            .cart-shipping-note {
                font-size: 13px;
                color: #888;
                margin: 0 0 16px;
            }
            .cart-checkout-btn {
                width: 100%;
                padding: 16px;
                background: #6b5344;
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }
            .cart-checkout-btn:hover {
                background: #5a4538;
            }
            .cart-checkout-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            @media (max-width: 480px) {
                .cart-sidebar {
                    width: 100%;
                }
            }
            
            /* No additional styles needed */
            
            /* Toast notification */
            .cart-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #2c2c2c;
                color: #fff;
                padding: 14px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .cart-toast.show {
                transform: translateY(0);
                opacity: 1;
            }
            .cart-toast .toast-icon {
                margin-right: 8px;
            }

            /* Checkout Modal Styles */
            .checkout-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                padding: 20px;
                box-sizing: border-box;
            }
            .checkout-modal.active {
                opacity: 1;
                visibility: visible;
            }
            .checkout-modal-content {
                background: #fff;
                border-radius: 0;
                padding: 0;
                max-width: 1200px;
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
            }
            .checkout-layout {
                display: flex;
                height: 90vh;
                overflow: hidden;
            }
            .checkout-left {
                flex: 1;
                overflow-y: auto;
                padding: 40px;
                border-right: 1px solid #e5e5e5;
            }
            .checkout-right {
                width: 400px;
                background: #fafafa;
                overflow-y: auto;
                padding: 40px;
            }
            .checkout-modal.active .checkout-modal-content {
                transform: scale(1) translateY(0);
            }
            .checkout-modal-close {
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
                z-index: 10;
            }
            .checkout-modal-close:hover {
                background: #f5f5f5;
                color: #333;
            }
            .checkout-form-group {
                margin-bottom: 20px;
            }
            .checkout-form-group label {
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            .checkout-form-group input {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.2s, box-shadow 0.2s;
                box-sizing: border-box;
            }
            .checkout-form-group input:focus {
                outline: none;
                border-color: #6b5344;
                box-shadow: 0 0 0 3px rgba(107, 83, 68, 0.1);
            }
            .checkout-form-group input::placeholder {
                color: #aaa;
            }
            .checkout-form-group select {
                width: 100%;
                padding: 12px 14px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 15px;
                transition: border-color 0.2s;
                box-sizing: border-box;
                background: #fff;
                cursor: pointer;
            }
            .checkout-form-group select:focus {
                outline: none;
                border-color: #6b5344;
            }
            .checkout-form-group input[type="text"],
            .checkout-form-group input[type="email"],
            .checkout-form-group input[type="tel"] {
                padding: 12px 14px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
            }
            .checkout-form-group input[type="text"]:focus,
            .checkout-form-group input[type="email"]:focus,
            .checkout-form-group input[type="tel"]:focus {
                border-color: #6b5344;
                box-shadow: 0 0 0 3px rgba(107, 83, 68, 0.1);
            }
            .checkout-form-group input.error,
            .checkout-form-group select.error {
                border-color: #c44 !important;
                box-shadow: 0 0 0 3px rgba(204, 68, 68, 0.1) !important;
            }
            .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 14px;
            }
            .checkbox-label input[type="checkbox"] {
                margin-right: 8px;
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .checkout-form-group-third {
                flex: 1;
            }
            .checkout-section-title {
                font-size: 16px;
                font-weight: 600;
                color: #2c2c2c;
                margin: 32px 0 16px 0;
            }
            .checkout-section-title:first-of-type {
                margin-top: 0;
            }
            .checkout-form-row {
                display: flex;
                gap: 16px;
            }
            .checkout-form-group-half {
                flex: 1;
            }
            .checkout-shipping-options {
                margin-bottom: 24px;
            }
            .shipping-option {
                display: flex;
                align-items: center;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
                background: #fff;
            }
            .shipping-option:hover {
                border-color: #6b5344;
            }
            .shipping-option.selected {
                border-color: #6b5344;
                background: #faf8f5;
            }
            .shipping-option input[type="radio"] {
                margin-right: 12px;
                cursor: pointer;
            }
            .shipping-option-details {
                flex: 1;
            }
            .shipping-option-name {
                font-weight: 500;
                color: #2c2c2c;
                margin: 0 0 2px;
                font-size: 14px;
            }
            .shipping-option-description {
                font-size: 13px;
                color: #666;
                margin: 0;
            }
            .shipping-option-price {
                font-weight: 500;
                color: #2c2c2c;
                font-size: 14px;
                margin-left: 12px;
            }
            /* Order Summary Styles */
            .checkout-summary-title {
                font-size: 16px;
                font-weight: 600;
                color: #2c2c2c;
                margin: 0 0 20px;
            }
            .checkout-items-list {
                margin-bottom: 20px;
            }
            .checkout-item {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e5e5e5;
            }
            .checkout-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .checkout-item-image {
                width: 60px;
                height: 60px;
                object-fit: contain;
                background: #f9f6f1;
                border-radius: 4px;
                padding: 4px;
            }
            .checkout-item-details {
                flex: 1;
            }
            .checkout-item-name {
                font-size: 14px;
                font-weight: 500;
                color: #2c2c2c;
                margin: 0 0 4px;
            }
            .checkout-item-qty {
                font-size: 13px;
                color: #666;
                margin: 0 0 4px;
            }
            .checkout-item-price {
                font-size: 14px;
                font-weight: 500;
                color: #2c2c2c;
            }
            .checkout-discount {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
            }
            .checkout-discount input {
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 14px;
            }
            .checkout-discount button {
                padding: 10px 20px;
                background: #fff;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .checkout-discount button:hover {
                background: #f5f5f5;
            }
            .checkout-totals {
                border-top: 1px solid #e5e5e5;
                padding-top: 20px;
            }
            .checkout-total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 14px;
                color: #666;
            }
            .checkout-total-row:last-child {
                margin-bottom: 0;
            }
            .checkout-total-final {
                font-size: 16px;
                font-weight: 600;
                color: #2c2c2c;
                padding-top: 12px;
                border-top: 1px solid #e5e5e5;
                margin-top: 12px;
            }
            .checkout-submit-btn {
                width: 100%;
                padding: 14px;
                background: #2c2c2c;
                color: #fff;
                border: none;
                border-radius: 4px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 32px;
            }
            .checkout-submit-btn:hover {
                background: #1a1a1a;
            }
            .checkout-submit-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
            .checkout-submit-btn .btn-loading {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .checkout-submit-btn .spinner {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Success Modal */
            .success-content {
                text-align: center;
            }
            .success-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: white;
                margin: 0 auto 24px;
                box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
            }
            .success-content h2 {
                margin: 0 0 12px;
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 28px;
                color: #2c2c2c;
            }
            .success-message {
                color: #666;
                font-size: 15px;
                line-height: 1.6;
                margin: 0 0 24px;
            }
            .success-order-number {
                background: #faf8f5;
                border: 2px dashed #d4c8b8;
                border-radius: 10px;
                padding: 16px;
                margin-bottom: 24px;
            }
            .success-order-number span {
                display: block;
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            .success-order-number strong {
                font-family: 'Courier New', monospace;
                font-size: 20px;
                color: #6b5344;
                letter-spacing: 2px;
            }

            @media (max-width: 768px) {
                .checkout-layout {
                    flex-direction: column;
                    height: auto;
                    max-height: 90vh;
                }
                .checkout-left {
                    border-right: none;
                    border-bottom: 1px solid #e5e5e5;
                    max-height: 50vh;
                }
                .checkout-right {
                    width: 100%;
                    max-height: 40vh;
                }
            }
            @media (max-width: 480px) {
                .checkout-left,
                .checkout-right {
                    padding: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Render cart items
    function renderCart() {
        const container = document.getElementById('cart-items');
        const footer = document.getElementById('cart-footer');
        const checkoutBtn = document.getElementById('cart-checkout-btn');

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <div class="cart-empty-icon">☕</div>
                    <p>Your cart is empty</p>
                    <a href="collections.html">Continue Shopping</a>
                </div>
            `;
            footer.style.display = 'none';
            return;
        }

        footer.style.display = 'block';
        
        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item" data-index="${index}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div>
                        <h3 class="cart-item-name">${item.name}</h3>
                        <p class="cart-item-variant">${item.description || ''}</p>
                    </div>
                    <div class="cart-item-bottom">
                        <div class="cart-item-qty">
                            <button class="qty-btn qty-minus" data-index="${index}">−</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn qty-plus" data-index="${index}">+</button>
                        </div>
                        <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <button class="cart-item-remove" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');

        // Update subtotal
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    }

    // Add item to cart
    function addToCart(itemData) {
        const existingIndex = cart.findIndex(item => item.id === itemData.id);
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push({
                id: itemData.id,
                name: itemData.name,
                price: parseFloat(itemData.price),
                description: itemData.description || '',
                image: itemData.image || '',
                quantity: 1
            });
        }
        
        saveCart();
        showToast(`${itemData.name} added to cart`);
    }

    // Update item quantity
    function updateQuantity(index, delta) {
        if (cart[index]) {
            cart[index].quantity += delta;
            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
            saveCart();
            renderCart();
        }
    }

    // Remove item from cart
    function removeItem(index) {
        if (cart[index]) {
            cart.splice(index, 1);
            saveCart();
            renderCart();
        }
    }

    // Open cart
    function openCart() {
        isCartOpen = true;
        document.body.classList.add('custom-cart-open');
        document.getElementById('cart-overlay').classList.add('active');
        document.getElementById('cart-sidebar').classList.add('active');
        document.body.style.overflow = 'hidden';
        renderCart();
    }

    // Close cart sidebar elements (shared logic)
    function closeCartElements() {
        isCartOpen = false;
        document.body.classList.remove('custom-cart-open');
        document.getElementById('cart-overlay').classList.remove('active');
        document.getElementById('cart-sidebar').classList.remove('active');
    }

    // Close cart
    function closeCart() {
        closeCartElements();
        document.body.style.overflow = '';
    }

    // Show toast notification
    function showToast(message, isError = false) {
        // Remove existing toast
        const existingToast = document.querySelector('.cart-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        if (isError) {
            toast.style.background = '#c44';
        }
        toast.innerHTML = `<span class="toast-icon">${isError ? '✕' : '✓'}</span>${message}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, isError ? 4000 : 2500);
    }

    // Checkout state
    let isCheckoutOpen = false;
    let checkoutModal = null;
    let helcimPayLoaded = false;

    // US States for dropdown
    const US_STATES = [
        { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
        { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
        { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
        { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
        { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
        { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
        { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
        { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
        { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' }
    ];

    // Create checkout modal HTML
    function createCheckoutModal() {
        if (checkoutModal) return;

        checkoutModal = document.createElement('div');
        checkoutModal.id = 'checkout-modal';
        checkoutModal.className = 'checkout-modal';
        
        const stateOptions = US_STATES.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
        
        checkoutModal.innerHTML = `
            <div class="checkout-modal-content">
                <button class="checkout-modal-close" id="checkout-close" aria-label="Close checkout">&times;</button>
                <div class="checkout-layout">
                    <!-- Left side: Customer & Shipping Form -->
                    <div class="checkout-left">
                        <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px;">Checkout</h2>
                        <p style="color: #666; font-size: 14px; margin-bottom: 30px;">Complete your order details below</p>
                        
                        <form id="checkout-form">
                            <h3 class="checkout-section-title">Contact Information</h3>
                            <div class="checkout-form-row">
                                <div class="checkout-form-group checkout-form-group-half">
                                    <label for="checkout-firstName">First Name *</label>
                                    <input type="text" id="checkout-firstName" name="firstName" required autocomplete="given-name" placeholder="John">
                                </div>
                                <div class="checkout-form-group checkout-form-group-half">
                                    <label for="checkout-lastName">Last Name *</label>
                                    <input type="text" id="checkout-lastName" name="lastName" required autocomplete="family-name" placeholder="Doe">
                                </div>
                            </div>
                            <div class="checkout-form-group">
                                <label for="checkout-email">Email Address *</label>
                                <input type="email" id="checkout-email" name="email" required autocomplete="email" placeholder="john@example.com">
                            </div>
                            <div class="checkout-form-group">
                                <label for="checkout-phone">Phone Number</label>
                                <input type="tel" id="checkout-phone" name="phone" autocomplete="tel" placeholder="(555) 555-5555">
                            </div>
                            
                            <h3 class="checkout-section-title">Shipping Address</h3>
                            <div class="checkout-form-group">
                                <label for="checkout-address">Street Address *</label>
                                <input type="text" id="checkout-address" name="address" required autocomplete="street-address" placeholder="123 Main Street">
                            </div>
                            <div class="checkout-form-group">
                                <label for="checkout-city">City *</label>
                                <input type="text" id="checkout-city" name="city" required autocomplete="address-level2" placeholder="Portland">
                            </div>
                            <div class="checkout-form-row">
                                <div class="checkout-form-group checkout-form-group-half">
                                    <label for="checkout-state">State *</label>
                                    <select id="checkout-state" name="state" required autocomplete="address-level1">
                                        <option value="">Select State</option>
                                        ${stateOptions}
                                    </select>
                                </div>
                                <div class="checkout-form-group checkout-form-group-half">
                                    <label for="checkout-zip">ZIP Code *</label>
                                    <input type="text" id="checkout-zip" name="zip" required autocomplete="postal-code" placeholder="97201" pattern="[0-9]{5}(-[0-9]{4})?" maxlength="10">
                                </div>
                            </div>
                            
                            <h3 class="checkout-section-title">Shipping Method</h3>
                            <div class="checkout-shipping-options">
                                <label class="shipping-option selected">
                                    <input type="radio" name="shippingMethod" value="standard" checked>
                                    <div class="shipping-option-details">
                                        <p class="shipping-option-name">Standard Shipping</p>
                                        <p class="shipping-option-description">5-7 business days</p>
                                    </div>
                                    <span class="shipping-option-price">$5.99</span>
                                </label>
                                <label class="shipping-option">
                                    <input type="radio" name="shippingMethod" value="express">
                                    <div class="shipping-option-details">
                                        <p class="shipping-option-name">Express Shipping</p>
                                        <p class="shipping-option-description">2-3 business days</p>
                                    </div>
                                    <span class="shipping-option-price">$12.99</span>
                                </label>
                                <label class="shipping-option" id="free-shipping-option" style="display: none;">
                                    <input type="radio" name="shippingMethod" value="free">
                                    <div class="shipping-option-details">
                                        <p class="shipping-option-name">Free Shipping</p>
                                        <p class="shipping-option-description">5-7 business days • Orders $45+</p>
                                    </div>
                                    <span class="shipping-option-price">FREE</span>
                                </label>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Right side: Order Summary -->
                    <div class="checkout-right">
                        <h3 class="checkout-summary-title">Order Summary</h3>
                        <div class="checkout-items-list" id="checkout-items-list">
                            <!-- Items populated dynamically -->
                        </div>
                        
                        <div class="checkout-totals">
                            <div class="checkout-total-row">
                                <span>Subtotal</span>
                                <span id="checkout-subtotal">$0.00</span>
                            </div>
                            <div class="checkout-total-row">
                                <span>Shipping</span>
                                <span id="checkout-shipping">$5.99</span>
                            </div>
                            <div class="checkout-total-row">
                                <span>Tax (7%)</span>
                                <span id="checkout-tax">$0.00</span>
                            </div>
                            <div class="checkout-total-row checkout-total-final">
                                <span>Total</span>
                                <span id="checkout-total">$0.00</span>
                            </div>
                        </div>
                        
                        <button type="button" class="checkout-submit-btn" id="checkout-submit-btn">
                            <span class="btn-text">Continue to Payment</span>
                            <span class="btn-loading" style="display: none;">
                                <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                                </svg>
                                Processing...
                            </span>
                        </button>
                        
                        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 16px;">
                            🔒 Secure payment powered by Helcim
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(checkoutModal);
        
        // Bind checkout events
        bindCheckoutEvents();
    }

    // Create success modal HTML
    function createSuccessModal(orderNumber) {
        const successModal = document.createElement('div');
        successModal.id = 'success-modal';
        successModal.className = 'checkout-modal active';
        successModal.innerHTML = `
            <div class="checkout-modal-content" style="max-width: 500px; padding: 60px 40px;">
                <div class="success-content">
                    <div class="success-icon">✓</div>
                    <h2>Thank You for Your Order!</h2>
                    <p class="success-message">
                        Your payment was successful. We're preparing your freshly roasted coffee and will send you a confirmation email with tracking information shortly.
                    </p>
                    <div class="success-order-number">
                        <span>Order Number</span>
                        <strong>${orderNumber}</strong>
                    </div>
                    <button type="button" class="checkout-submit-btn" id="success-close-btn" style="margin-top: 0;">
                        Continue Shopping
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(successModal);
        
        // Bind close event
        document.getElementById('success-close-btn').addEventListener('click', function() {
            successModal.classList.remove('active');
            setTimeout(() => successModal.remove(), 300);
            window.location.href = 'collections.html';
        });
        
        return successModal;
    }

    // Bind checkout modal events
    function bindCheckoutEvents() {
        // Close button
        document.getElementById('checkout-close').addEventListener('click', closeCheckout);
        
        // Click outside to close
        checkoutModal.addEventListener('click', function(e) {
            if (e.target === checkoutModal) {
                closeCheckout();
            }
        });
        
        // Shipping option selection
        const shippingOptions = checkoutModal.querySelectorAll('.shipping-option');
        shippingOptions.forEach(option => {
            option.addEventListener('click', function() {
                shippingOptions.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                this.querySelector('input[type="radio"]').checked = true;
                updateCheckoutTotals();
            });
        });
        
        // Submit button
        document.getElementById('checkout-submit-btn').addEventListener('click', handleCheckoutSubmit);
        
        // Form validation on input
        const form = document.getElementById('checkout-form');
        form.querySelectorAll('input, select').forEach(field => {
            field.addEventListener('input', function() {
                this.classList.remove('error');
            });
        });
    }

    // Open checkout modal
    function openCheckout() {
        if (cart.length === 0) {
            showToast('Your cart is empty', true);
            return;
        }
        
        // Close cart sidebar first (without resetting overflow since we'll keep it hidden for modal)
        closeCartElements();
        
        // Create modal if not exists
        createCheckoutModal();
        
        // Populate order summary
        renderCheckoutItems();
        updateCheckoutTotals();
        
        // Show modal (keep body overflow hidden for modal)
        checkoutModal.classList.add('active');
        isCheckoutOpen = true;
        document.body.style.overflow = 'hidden';
    }

    // Close checkout modal
    function closeCheckout() {
        if (checkoutModal) {
            checkoutModal.classList.remove('active');
        }
        isCheckoutOpen = false;
        document.body.style.overflow = '';
    }

    // Render checkout items
    function renderCheckoutItems() {
        const container = document.getElementById('checkout-items-list');
        container.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <img src="${item.image}" alt="${item.name}" class="checkout-item-image">
                <div class="checkout-item-details">
                    <p class="checkout-item-name">${item.name}</p>
                    <p class="checkout-item-qty">Qty: ${item.quantity}</p>
                    <p class="checkout-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    }

    // Update checkout totals
    function updateCheckoutTotals() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Get selected shipping method
        const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
        let shippingCost = 5.99;
        if (selectedShipping) {
            switch (selectedShipping.value) {
                case 'express':
                    shippingCost = 12.99;
                    break;
                case 'free':
                    shippingCost = 0;
                    break;
                default:
                    shippingCost = 5.99;
            }
        }
        
        // Show free shipping option if subtotal >= $45
        const freeShippingOption = document.getElementById('free-shipping-option');
        if (freeShippingOption) {
            if (subtotal >= 45) {
                freeShippingOption.style.display = 'flex';
            } else {
                freeShippingOption.style.display = 'none';
                // Reset to standard if free was selected
                if (selectedShipping && selectedShipping.value === 'free') {
                    document.querySelector('input[name="shippingMethod"][value="standard"]').checked = true;
                    document.querySelector('.shipping-option').classList.add('selected');
                    shippingCost = 5.99;
                }
            }
        }
        
        const tax = subtotal * 0.07;
        const total = subtotal + shippingCost + tax;
        
        document.getElementById('checkout-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('checkout-shipping').textContent = shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`;
        document.getElementById('checkout-tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('checkout-total').textContent = `$${total.toFixed(2)}`;
    }

    // Validate checkout form
    function validateCheckoutForm() {
        const form = document.getElementById('checkout-form');
        const fields = {
            firstName: form.querySelector('#checkout-firstName'),
            lastName: form.querySelector('#checkout-lastName'),
            email: form.querySelector('#checkout-email'),
            address: form.querySelector('#checkout-address'),
            city: form.querySelector('#checkout-city'),
            state: form.querySelector('#checkout-state'),
            zip: form.querySelector('#checkout-zip'),
        };
        
        let isValid = true;
        const errors = [];
        
        // First name
        if (!fields.firstName.value.trim()) {
            fields.firstName.classList.add('error');
            errors.push('First name is required');
            isValid = false;
        }
        
        // Last name
        if (!fields.lastName.value.trim()) {
            fields.lastName.classList.add('error');
            errors.push('Last name is required');
            isValid = false;
        }
        
        // Email
        if (!fields.email.value.trim() || !VALIDATION.EMAIL_REGEX.test(fields.email.value)) {
            fields.email.classList.add('error');
            errors.push('Valid email is required');
            isValid = false;
        }
        
        // Address
        if (!fields.address.value.trim() || fields.address.value.length < VALIDATION.MIN_ADDRESS_LENGTH) {
            fields.address.classList.add('error');
            errors.push('Valid address is required');
            isValid = false;
        }
        
        // City
        if (!fields.city.value.trim()) {
            fields.city.classList.add('error');
            errors.push('City is required');
            isValid = false;
        }
        
        // State
        if (!fields.state.value) {
            fields.state.classList.add('error');
            errors.push('State is required');
            isValid = false;
        }
        
        // ZIP code
        if (!fields.zip.value.trim() || !VALIDATION.ZIP_REGEX.test(fields.zip.value)) {
            fields.zip.classList.add('error');
            errors.push('Valid ZIP code is required (e.g., 97201)');
            isValid = false;
        }
        
        if (!isValid) {
            showToast(errors[0], true);
        }
        
        return isValid;
    }

    // Get form data
    function getCheckoutFormData() {
        const form = document.getElementById('checkout-form');
        return {
            customer: {
                firstName: form.querySelector('#checkout-firstName').value.trim(),
                lastName: form.querySelector('#checkout-lastName').value.trim(),
                email: form.querySelector('#checkout-email').value.trim().toLowerCase(),
                phone: form.querySelector('#checkout-phone').value.trim() || null,
            },
            shipping: {
                address: form.querySelector('#checkout-address').value.trim(),
                city: form.querySelector('#checkout-city').value.trim(),
                state: form.querySelector('#checkout-state').value,
                zip: form.querySelector('#checkout-zip').value.trim(),
                country: 'US',
            },
            shippingMethod: form.querySelector('input[name="shippingMethod"]:checked').value,
        };
    }

    // Load HelcimPay.js script
    function loadHelcimPayScript() {
        return new Promise((resolve, reject) => {
            if (helcimPayLoaded) {
                resolve();
                return;
            }
            
            // Check if already loaded
            if (typeof appendHelcimPayIframe === 'function') {
                helcimPayLoaded = true;
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
            script.async = true;
            script.onload = () => {
                helcimPayLoaded = true;
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load payment processor'));
            };
            document.head.appendChild(script);
        });
    }

    // Handle checkout submit
    async function handleCheckoutSubmit() {
        // Validate form
        if (!validateCheckoutForm()) {
            return;
        }
        
        const submitBtn = document.getElementById('checkout-submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        
        try {
            // Load HelcimPay.js script
            await loadHelcimPayScript();
            
            // Get form data
            const formData = getCheckoutFormData();
            
            // Prepare cart data for the backend
            // The backend expects cart items with id, quantity, size, and isSubscription
            const cartItems = cart.map(item => ({
                id: item.id,
                quantity: item.quantity,
                size: item.size || '12oz',
                isSubscription: item.isSubscription || false,
            }));
            
            // Call checkout endpoint
            const response = await fetch('/.netlify/functions/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cart: cartItems,
                    customer: formData.customer,
                    shipping: formData.shipping,
                    shippingMethod: formData.shippingMethod,
                }),
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Checkout failed. Please try again.');
            }
            
            // Store order info for success callback
            sessionStorage.setItem('pendingOrder', JSON.stringify({
                invoiceNumber: result.invoiceNumber,
                total: result.serverCalculatedTotals.total,
                email: formData.customer.email,
            }));
            
            // Close checkout modal before opening Helcim
            closeCheckout();
            
            // Open Helcim payment modal with the checkout token
            // The appendHelcimPayIframe function is provided by HelcimPay.js
            if (typeof appendHelcimPayIframe === 'function') {
                appendHelcimPayIframe(result.checkoutToken);
                
                // Set up message listener for Helcim payment result
                setupHelcimMessageListener();
            } else {
                throw new Error('Payment processor not available. Please refresh and try again.');
            }
            
        } catch (error) {
            console.error('Checkout error:', error);
            showToast(error.message || 'An error occurred. Please try again.', true);
            
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    // Set up message listener for Helcim payment result
    function setupHelcimMessageListener() {
        // Remove existing listener if any
        window.removeEventListener('message', handleHelcimMessage);
        
        // Add new listener
        window.addEventListener('message', handleHelcimMessage);
    }

    // Handle Helcim postMessage events
    function handleHelcimMessage(event) {
        // Verify origin is from Helcim using strict URL parsing
        // This prevents attacks where malicious sites embed helcim domain in their URLs
        let originHostname;
        try {
            originHostname = new URL(event.origin).hostname;
        } catch (e) {
            return; // Invalid origin URL
        }
        
        // Check if the hostname ends with helcim.app or helcim.com (allowing subdomains)
        const isHelcimOrigin = originHostname === 'secure.helcim.app' ||
                               originHostname === 'helcim.app' ||
                               originHostname === 'helcim.com' ||
                               originHostname.endsWith('.helcim.app') ||
                               originHostname.endsWith('.helcim.com');
        
        if (!isHelcimOrigin) {
            return;
        }
        
        try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            
            // Check for payment success
            if (data.type === 'helcim-pay-success' || data.eventName === 'payment-success' || data.status === 'approved') {
                handlePaymentSuccess(data);
            }
            // Check for payment failure
            else if (data.type === 'helcim-pay-failed' || data.eventName === 'payment-failed' || data.status === 'declined') {
                handlePaymentFailure(data);
            }
            // Check for modal close
            else if (data.type === 'helcim-pay-close' || data.eventName === 'close') {
                // User closed the payment modal - reset checkout button state
                const submitBtn = document.getElementById('checkout-submit-btn');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    const btnText = submitBtn.querySelector('.btn-text');
                    const btnLoading = submitBtn.querySelector('.btn-loading');
                    if (btnText) btnText.style.display = 'inline';
                    if (btnLoading) btnLoading.style.display = 'none';
                }
            }
        } catch (e) {
            // Not a JSON message or not from Helcim
        }
    }

    // Handle successful payment
    function handlePaymentSuccess(data) {
        // Remove listener
        window.removeEventListener('message', handleHelcimMessage);
        
        // Get pending order info
        const pendingOrderStr = sessionStorage.getItem('pendingOrder');
        let orderNumber = 'Unknown';
        if (pendingOrderStr) {
            try {
                const pendingOrder = JSON.parse(pendingOrderStr);
                orderNumber = pendingOrder.invoiceNumber;
            } catch (e) {}
        }
        
        // Clear the cart
        cart = [];
        saveCart();
        renderCart();
        
        // Clear pending order
        sessionStorage.removeItem('pendingOrder');
        
        // Remove Helcim iframe if exists
        const helcimIframe = document.querySelector('iframe[src*="helcim"]');
        if (helcimIframe) {
            helcimIframe.parentElement.remove();
        }
        
        // Show success modal
        createSuccessModal(orderNumber);
    }

    // Handle failed payment
    function handlePaymentFailure(data) {
        // Remove listener
        window.removeEventListener('message', handleHelcimMessage);
        
        // Clear pending order
        sessionStorage.removeItem('pendingOrder');
        
        // Show error message
        const errorMessage = data.message || data.error || 'Payment was declined. Please try again.';
        showToast(errorMessage, true);
        
        // Remove Helcim iframe if exists
        const helcimIframe = document.querySelector('iframe[src*="helcim"]');
        if (helcimIframe) {
            helcimIframe.parentElement.remove();
        }
        
        // Reopen checkout modal
        setTimeout(() => {
            openCheckout();
        }, 100);
    }


    // Bind events
    function bindEvents() {
        // Cart open buttons (including Snipcart compatibility classes)
        document.addEventListener('click', function(e) {
            // Open cart - prevent Snipcart from opening
            if (e.target.closest('.snipcart-checkout') || e.target.closest('.cart-btn')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                openCart();
                return false;
            }

            // Add to cart buttons (Snipcart compatibility)
            if (e.target.closest('.snipcart-add-item')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const btn = e.target.closest('.snipcart-add-item');
                addToCart({
                    id: btn.dataset.itemId,
                    name: btn.dataset.itemName,
                    price: btn.dataset.itemPrice,
                    description: btn.dataset.itemDescription || '',
                    image: btn.dataset.itemImage || ''
                });
                return false;
            }

            // Close cart
            if (e.target.closest('.cart-close') || e.target.id === 'cart-overlay') {
                closeCart();
            }

            // Quantity buttons
            if (e.target.closest('.qty-minus')) {
                const index = parseInt(e.target.closest('.qty-minus').dataset.index);
                updateQuantity(index, -1);
            }
            if (e.target.closest('.qty-plus')) {
                const index = parseInt(e.target.closest('.qty-plus').dataset.index);
                updateQuantity(index, 1);
            }

            // Remove item
            if (e.target.closest('.cart-item-remove')) {
                const index = parseInt(e.target.closest('.cart-item-remove').dataset.index);
                removeItem(index);
            }

            // Checkout button - open checkout modal
            if (e.target.id === 'cart-checkout-btn' || e.target.closest('#cart-checkout-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                if (cart.length > 0) {
                    openCheckout();
                }
                return false;
            }
        });

        // Close cart or checkout with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (isCheckoutOpen) {
                    closeCheckout();
                } else if (isCartOpen) {
                    closeCart();
                }
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCart);
    } else {
        initCart();
    }

    // Expose for debugging if needed
    window.GrainhouseCart = {
        open: openCart,
        close: closeCart,
        add: addToCart,
        getItems: () => [...cart],
        clear: () => { cart = []; saveCart(); renderCart(); },
        checkout: openCheckout,
        closeCheckout: closeCheckout
    };
})();

