// Custom Cart Implementation - No External Service Required
(function() {
    'use strict';

    // Cart state
    let cart = [];
    let isCartOpen = false;
    let isCheckoutOpen = false;
    // Debounce checkout navigation - prevents double-clicks before page navigation completes
    // This flag doesn't need resetting as navigation causes full page reload
    let isNavigatingToCheckout = false;

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
                <button type="button" class="cart-checkout-btn" id="cart-checkout-btn">Checkout</button>
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
                right: 0;
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
                z-index: 10001;
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
        openCart();
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

    // Close cart
    function closeCart() {
        isCartOpen = false;
        document.body.classList.remove('custom-cart-open');
        document.getElementById('cart-overlay').classList.remove('active');
        document.getElementById('cart-sidebar').classList.remove('active');
        document.body.style.overflow = '';
    }

    // Show toast notification
    function showToast(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.cart-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.innerHTML = `<span class="toast-icon">✓</span>${message}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Open checkout modal is removed - redirect to checkout page instead
    function openCheckout() {
        if (cart.length === 0) return;
        
        // Cart is saved in localStorage, checkout page will read it
        // Redirect to checkout page
        window.location.href = 'checkout.html';
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

            // Checkout button - redirects to checkout page (with debounce)
            if (e.target.id === 'cart-checkout-btn' || e.target.closest('#cart-checkout-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Debounce: prevent multiple rapid clicks
                if (isNavigatingToCheckout) {
                    return false;
                }
                
                if (cart.length > 0) {
                    isNavigatingToCheckout = true;
                    // Close cart first
                    closeCart();
                    // Navigate to checkout page
                    window.location.href = 'checkout.html';
                }
                return false;
            }
        });

        // Close cart with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isCartOpen) {
                closeCart();
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
        clear: () => { cart = []; saveCart(); renderCart(); }
    };
})();

