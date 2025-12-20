/**
 * Enhanced Product Display Module
 * Handles dynamic pricing, size selection, and subscription discounts
 * for all product cards across the store
 */

(function() {
    'use strict';
    
    // Round price to "nice" cents values: .00, .25, .49, .50, .75, .95, .99
    function roundToNiceCents(price) {
        const whole = Math.floor(price);
        const cents = price - whole;
        
        // Define nice cent values
        const niceCents = [0.00, 0.25, 0.49, 0.50, 0.75, 0.95, 0.99];
        
        // Find the closest nice cent value
        let closest = niceCents[0];
        let minDiff = Math.abs(cents - niceCents[0]);
        
        for (let i = 1; i < niceCents.length; i++) {
            const diff = Math.abs(cents - niceCents[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = niceCents[i];
            }
        }
        
        // Handle edge case where rounding up to 0.99 or rounding to next dollar
        if (closest === 0.99 && cents > 0.97) {
            return whole + 0.99;
        }
        if (cents > 0.99) {
            return whole + 1;
        }
        
        return whole + closest;
    }
    
    // =====================================================
    // CENTRALIZED PRICING - Uses product-pricing.js
    // =====================================================
    // If product-pricing.js is loaded, use its config; otherwise fallback
    const SUBSCRIPTION_DISCOUNT = (typeof PRICING_CONFIG !== 'undefined') 
        ? PRICING_CONFIG.subscriptionDiscount 
        : 0.10;
    
    const SIZE_CONFIG = (typeof PRICING_CONFIG !== 'undefined') 
        ? {
            '12oz': { label: PRICING_CONFIG.sizeMultipliers['12oz'].label, multiplier: PRICING_CONFIG.sizeMultipliers['12oz'].multiplier, weight: '340g' },
            '2lb': { label: PRICING_CONFIG.sizeMultipliers['2lb'].label, multiplier: PRICING_CONFIG.sizeMultipliers['2lb'].multiplier, weight: '907g' },
            '5lb': { label: PRICING_CONFIG.sizeMultipliers['5lb'].label, multiplier: PRICING_CONFIG.sizeMultipliers['5lb'].multiplier, weight: '2.27kg' }
        }
        : {
            '12oz': { label: '12 oz', multiplier: 1.0, weight: '340g' },
            '2lb': { label: '2 lb', multiplier: 2.35, weight: '907g' },
            '5lb': { label: '5 lb', multiplier: 5.25, weight: '2.27kg' }
        };
    
    // Store state for each product card
    const productStates = new Map();
    
    /**
     * Initialize enhanced product functionality
     */
    function init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupEnhancedProducts);
        } else {
            setupEnhancedProducts();
        }
    }
    
    /**
     * Set up enhanced product cards
     */
    function setupEnhancedProducts() {
        // Find all product cards that need enhancement
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            enhanceProductCard(card);
        });
        
        // Set up event delegation for dynamic cards
        document.addEventListener('click', handleCardClick);
        document.addEventListener('change', handleCardChange);
        
        // Add subscription banner if on collections page
        if (window.location.pathname.includes('collections')) {
            addSubscriptionBanner();
        }
        
        // Add mobile bottom nav
        addMobileBottomNav();
        
        console.log('Enhanced Products initialized');
    }
    
    /**
     * Enhance a single product card with size options and subscription toggle
     */
    function enhanceProductCard(card) {
        // Get product data from the card
        const productId = card.dataset.id || generateProductId(card);
        const basePrice = parseFloat(card.dataset.price) || extractPriceFromCard(card);
        const productName = card.dataset.name || extractNameFromCard(card);
        const productImage = card.dataset.image || extractImageFromCard(card);
        const category = card.dataset.category || 'blends';
        const isSubscribable = !['gear', 'merch'].includes(category);
        const hasMultipleSizes = !['gear', 'merch', 'cold-brew'].includes(category);
        
        // Initialize state for this product
        productStates.set(productId, {
            basePrice: basePrice,
            selectedSize: '12oz',
            isSubscription: false,
            quantity: 1,
            productName: productName,
            productImage: productImage,
            category: category
        });
        
        // Store product ID on card
        card.dataset.productId = productId;
        
        // Find or create the product info wrapper
        const infoWrapper = card.querySelector('.product-info') || card.querySelector('.product-info-wrapper');
        if (!infoWrapper) return;
        
        // Build enhanced content
        const enhancedContent = buildEnhancedContent(productId, basePrice, isSubscribable, hasMultipleSizes);
        
        // Find existing elements to replace
        const existingPrice = infoWrapper.querySelector('.price, .product-price');
        const existingButton = card.querySelector('.snipcart-add-item, .add-to-cart-btn, button');
        
        // Insert size selector before price
        if (hasMultipleSizes && existingPrice) {
            existingPrice.insertAdjacentHTML('beforebegin', enhancedContent.sizeSelector);
        }
        
        // Replace price display
        if (existingPrice) {
            existingPrice.outerHTML = enhancedContent.priceDisplay;
        } else {
            infoWrapper.insertAdjacentHTML('beforeend', enhancedContent.priceDisplay);
        }
        
        // Add subscription toggle if applicable
        if (isSubscribable) {
            const priceContainer = card.querySelector('.price-container');
            if (priceContainer) {
                priceContainer.insertAdjacentHTML('afterend', enhancedContent.purchaseToggle);
            }
        }
        
        // Enhance the add to cart button
        if (existingButton) {
            enhanceAddToCartButton(existingButton, productId);
        }
        
        // Initialize default size selection (12oz selected by default)
        initializeDefaultSize(card, productId);
        
        // Update card class
        card.classList.add('product-card-enhanced');
    }
    
    /**
     * Build the enhanced content HTML
     */
    function buildEnhancedContent(productId, basePrice, isSubscribable, hasMultipleSizes) {
        const content = {
            sizeSelector: '',
            priceDisplay: '',
            purchaseToggle: ''
        };
        
        // Size Selector
        if (hasMultipleSizes) {
            content.sizeSelector = `
                <div class="size-selector-mini" data-product-id="${productId}">
                    ${Object.entries(SIZE_CONFIG).map(([key, config]) => {
                        const price = calculatePrice(basePrice, key, false);
                        return `
                            <button class="size-option ${key === '12oz' ? 'active' : ''}" 
                                    data-size="${key}" 
                                    data-product-id="${productId}"
                                    type="button"
                                    aria-pressed="${key === '12oz'}">
                                <span class="size-label">${config.label}</span>
                                <span class="size-price">$${price.toFixed(2)}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        // Price Display
        const displayPrice = calculatePrice(basePrice, '12oz', false);
        const subscriptionPrice = calculatePrice(basePrice, '12oz', true);
        const savings = displayPrice - subscriptionPrice;
        
        content.priceDisplay = `
            <div class="price-container" data-product-id="${productId}">
                <span class="current-price" data-base-price="${basePrice}">$${displayPrice.toFixed(2)}</span>
                <span class="original-price-strike" style="display: none;"></span>
                ${isSubscribable ? `<span class="savings-text" style="display: none;">Save $${savings.toFixed(2)}</span>` : ''}
            </div>
        `;
        
        // Purchase Toggle
        if (isSubscribable) {
            content.purchaseToggle = `
                <div class="purchase-toggle-mini" data-product-id="${productId}">
                    <button class="toggle-btn active" data-type="onetime" data-product-id="${productId}" type="button">
                        <span class="btn-label">One-time</span>
                    </button>
                    <button class="toggle-btn" data-type="subscribe" data-product-id="${productId}" type="button">
                        <span class="btn-label">Subscribe</span>
                        <span class="btn-discount">Save 10%</span>
                    </button>
                </div>
            `;
        }
        
        return content;
    }
    
    /**
     * Calculate price based on size and subscription status
     */
    function calculatePrice(basePrice, size, isSubscription) {
        const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG['12oz'];
        let price = basePrice * sizeConfig.multiplier;
        
        // Apply subscription discount
        if (isSubscription) {
            price = price * (1 - SUBSCRIPTION_DISCOUNT);
        }
        
        // Round to nice cents values
        return roundToNiceCents(price);
    }
    
    /**
     * Handle click events on product cards
     */
    function handleCardClick(e) {
        const sizeOption = e.target.closest('.size-option');
        const toggleBtn = e.target.closest('.toggle-btn');
        
        if (sizeOption) {
            e.preventDefault();
            handleSizeChange(sizeOption);
        }
        
        if (toggleBtn) {
            e.preventDefault();
            handlePurchaseTypeChange(toggleBtn);
        }
    }
    
    /**
     * Handle change events (for select elements if used)
     */
    function handleCardChange(e) {
        // Handle any select-based size changes
        if (e.target.classList.contains('size-select')) {
            const productId = e.target.dataset.productId;
            const size = e.target.value;
            updateProductState(productId, { selectedSize: size });
            updateProductDisplay(productId);
        }
    }
    
    /**
     * Handle size option selection
     */
    function handleSizeChange(sizeOption) {
        const productId = sizeOption.dataset.productId;
        const size = sizeOption.dataset.size;
        
        // Update active state
        const container = sizeOption.closest('.size-selector-mini');
        if (container) {
            container.querySelectorAll('.size-option').forEach(opt => {
                opt.classList.remove('active');
                opt.setAttribute('aria-pressed', 'false');
            });
            sizeOption.classList.add('active');
            sizeOption.setAttribute('aria-pressed', 'true');
        }
        
        // Update state and display
        updateProductState(productId, { selectedSize: size });
        
        // Ensure button is visible and enabled immediately
        const card = document.querySelector(`[data-product-id="${productId}"]`) || sizeOption.closest('.product-card');
        if (card) {
            const addButton = card.querySelector('.snipcart-add-item, .add-to-cart-enhanced, .add-to-cart-btn, [data-add-to-cart], button[class*="cart"]');
            if (addButton) {
                // Force enable and update button immediately
                addButton.disabled = false;
                addButton.removeAttribute('aria-disabled');
                addButton.classList.remove('button-disabled');
                
                const state = productStates.get(productId);
                if (state) {
                    const price = calculatePrice(state.basePrice, size, state.isSubscription);
                    updateButtonData(addButton, state, price);
                    
                    // Update button text to be clear - "Add to Cart" or "Buy"
                    addButton.innerHTML = `
                        <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; margin-right: 6px;">
                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span>Add to Cart</span>
                        <span class="btn-divider"></span>
                        <span class="btn-price">$${price.toFixed(2)}</span>
                    `;
                }
            }
        }
        
        // Also update full display (price, etc.)
        updateProductDisplay(productId);
    }
    
    /**
     * Initialize default size selection for products with size options
     */
    function initializeDefaultSize(card, productId) {
        const state = productStates.get(productId);
        if (!state) return;
        
        const hasMultipleSizes = !['gear', 'merch', 'cold-brew'].includes(state.category);
        if (hasMultipleSizes) {
            // Find the 12oz option and mark it active
            const sizeSelector = card.querySelector('.size-selector-mini');
            if (sizeSelector) {
                const defaultOption = sizeSelector.querySelector('[data-size="12oz"]');
                if (defaultOption) {
                    defaultOption.classList.add('active');
                    defaultOption.setAttribute('aria-pressed', 'true');
                }
            }
            
            // Enable the button since 12oz is selected by default
            const addButton = card.querySelector('.snipcart-add-item, .add-to-cart-enhanced, [data-add-to-cart]');
            if (addButton) {
                addButton.disabled = false;
                addButton.removeAttribute('aria-disabled');
                addButton.classList.remove('button-disabled');
                
                // Update button content
                const price = calculatePrice(state.basePrice, '12oz', state.isSubscription);
                addButton.innerHTML = `
                    <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; margin-right: 6px;">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>Add to Cart</span>
                    <span class="btn-divider"></span>
                    <span class="btn-price">$${price.toFixed(2)}</span>
                `;
                
                // Update button data attributes
                updateButtonData(addButton, state, price);
            }
        }
    }
    
    /**
     * Handle purchase type toggle (one-time vs subscription)
     */
    function handlePurchaseTypeChange(toggleBtn) {
        const productId = toggleBtn.dataset.productId;
        const type = toggleBtn.dataset.type;
        const isSubscription = type === 'subscribe';
        
        // Update active state
        const container = toggleBtn.closest('.purchase-toggle-mini');
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        toggleBtn.classList.add('active');
        
        // Update state and display
        updateProductState(productId, { isSubscription: isSubscription });
        updateProductDisplay(productId);
        
        // Visual feedback
        if (isSubscription) {
            showToast('Subscription selected - 10% off applied!', 'success');
        }
    }
    
    /**
     * Update product state
     */
    function updateProductState(productId, updates) {
        const state = productStates.get(productId);
        if (state) {
            Object.assign(state, updates);
            productStates.set(productId, state);
        }
    }
    
    /**
     * Update product display after state change
     */
    function updateProductDisplay(productId) {
        const state = productStates.get(productId);
        if (!state) return;
        
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (!card) return;
        
        const currentPrice = calculatePrice(state.basePrice, state.selectedSize, state.isSubscription);
        const originalPrice = calculatePrice(state.basePrice, state.selectedSize, false);
        const savings = originalPrice - currentPrice;
        
        // Update price display
        const priceContainer = card.querySelector('.price-container');
        if (priceContainer) {
            const currentPriceEl = priceContainer.querySelector('.current-price');
            const originalPriceEl = priceContainer.querySelector('.original-price-strike');
            const savingsEl = priceContainer.querySelector('.savings-text');
            
            if (currentPriceEl) {
                currentPriceEl.textContent = `$${currentPrice.toFixed(2)}`;
                currentPriceEl.classList.add('price-updated');
                setTimeout(() => currentPriceEl.classList.remove('price-updated'), 300);
            }
            
            if (originalPriceEl) {
                if (state.isSubscription) {
                    originalPriceEl.textContent = `$${originalPrice.toFixed(2)}`;
                    originalPriceEl.style.display = 'inline';
                } else {
                    originalPriceEl.style.display = 'none';
                }
            }
            
            if (savingsEl) {
                if (state.isSubscription && savings > 0) {
                    savingsEl.textContent = `Save $${savings.toFixed(2)}`;
                    savingsEl.style.display = 'inline-block';
                } else {
                    savingsEl.style.display = 'none';
                }
            }
        }
        
        // Update size option prices
        const sizeSelector = card.querySelector('.size-selector-mini');
        if (sizeSelector) {
            sizeSelector.querySelectorAll('.size-option').forEach(option => {
                const size = option.dataset.size;
                const price = calculatePrice(state.basePrice, size, state.isSubscription);
                const priceSpan = option.querySelector('.size-price');
                if (priceSpan) {
                    priceSpan.textContent = `$${price.toFixed(2)}`;
                }
            });
        }
        
        // Update add to cart button data and enable if size selected
        const addButton = card.querySelector('.snipcart-add-item, .add-to-cart-enhanced, [data-add-to-cart]');
        if (addButton) {
            const hasMultipleSizes = !['gear', 'merch', 'cold-brew'].includes(state.category);
            
            // Enable button if size is selected (or if no size options)
            if (!hasMultipleSizes || state.selectedSize) {
                addButton.disabled = false;
                addButton.removeAttribute('aria-disabled');
                addButton.classList.remove('button-disabled');
                
                // Update button text and data
                updateButtonData(addButton, state, currentPrice);
                
                // Update button content if it was disabled
                if (addButton.textContent.trim() === 'Select a size') {
                    const sizeConfig = SIZE_CONFIG[state.selectedSize];
                    addButton.innerHTML = `
                        <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; margin-right: 6px;">
                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span>Add to Cart</span>
                        <span class="btn-divider"></span>
                        <span class="btn-price">$${currentPrice.toFixed(2)}</span>
                    `;
                }
            }
        }
    }
    
    /**
     * Enhance the add to cart button
     */
    function enhanceAddToCartButton(button, productId) {
        // Add enhanced class
        button.classList.add('add-to-cart-enhanced');
        
        // Store product ID
        button.dataset.productId = productId;
        
        const state = productStates.get(productId);
        const hasMultipleSizes = state && !['gear', 'merch', 'cold-brew'].includes(state.category);
        
        // If product has multiple sizes, disable button until size is selected
        if (hasMultipleSizes) {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            button.classList.add('button-disabled');
            button.innerHTML = `
                <span>Select a size</span>
            `;
        } else {
            // For products without size options, enable immediately
            if (state) {
                const price = calculatePrice(state.basePrice, state.selectedSize, state.isSubscription);
                button.innerHTML = `
                    <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>Add to Cart</span>
                    <span class="btn-divider"></span>
                    <span class="btn-price">$${price.toFixed(2)}</span>
                `;
            }
        }
        
        // Add click handler for custom cart
        button.addEventListener('click', function(e) {
            if (window.grainhouse && window.grainhouse.cart) {
                e.preventDefault();
                e.stopPropagation();
                addToCustomCart(productId);
            }
        });
    }
    
    /**
     * Update button data attributes
     */
    function updateButtonData(button, state, price) {
        const sizeConfig = SIZE_CONFIG[state.selectedSize] || { label: '' };
        const itemName = state.isSubscription 
            ? `${state.productName} (${sizeConfig.label}) - Subscription`
            : `${state.productName} (${sizeConfig.label})`;
        
        // Get product card for URL and image
        const card = button.closest('.product-card');
        const productUrl = card ? (card.querySelector('a.product-link')?.href || window.location.href) : window.location.href;
        const productImage = state.productImage ? 
            (state.productImage.startsWith('http') ? state.productImage : `https://grainhousecoffee.com/${state.productImage}`) :
            '';
        
        // Generate unique item ID
        const itemId = `${state.productName.toLowerCase().replace(/\s+/g, '-')}-${state.selectedSize}${state.isSubscription ? '-subscription' : ''}`;
        
        // Update Snipcart attributes if present
        if (button.classList.contains('snipcart-add-item')) {
            button.setAttribute('data-item-id', itemId);
            button.setAttribute('data-item-price', price.toFixed(2));
            button.setAttribute('data-item-name', itemName);
            button.setAttribute('data-item-url', productUrl);
            if (productImage) {
                button.setAttribute('data-item-image', productImage);
            }
            if (state.productName) {
                button.setAttribute('data-item-description', state.productName);
            }
            button.setAttribute('data-item-custom1-name', 'Size');
            button.setAttribute('data-item-custom1-value', sizeConfig.label || state.selectedSize);
            button.setAttribute('data-item-custom2-name', 'Type');
            button.setAttribute('data-item-custom2-value', state.isSubscription ? 'subscription' : 'one-time');
        }
        
        // Update custom data attributes
        button.dataset.price = price.toFixed(2);
        button.dataset.size = state.selectedSize;
        button.dataset.subscription = state.isSubscription;
        
        // Update price in button if shown
        const priceSpan = button.querySelector('.btn-price');
        if (priceSpan) {
            priceSpan.textContent = `$${price.toFixed(2)}`;
        }
    }
    
    /**
     * Add item to custom cart
     */
    function addToCustomCart(productId) {
        const state = productStates.get(productId);
        if (!state || !window.grainhouse || !window.grainhouse.cart) return;
        
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (!card) return;
        
        const sizeConfig = SIZE_CONFIG[state.selectedSize];
        const price = calculatePrice(state.basePrice, state.selectedSize, state.isSubscription);
        
        const itemData = {
            id: `${productId}-${state.selectedSize}-${state.isSubscription ? 'sub' : 'once'}`,
            name: state.productName,
            price: price,
            image: state.productImage,
            size: sizeConfig.label,
            subscription: state.isSubscription,
            quantity: state.quantity
        };
        
        window.grainhouse.cart.addToCart(itemData);
    }
    
    /**
     * Add subscription promotion banner
     */
    function addSubscriptionBanner() {
        const existingBanner = document.querySelector('.subscription-banner');
        if (existingBanner) return;
        
        const banner = document.createElement('div');
        banner.className = 'subscription-banner';
        banner.innerHTML = `
            <div class="subscription-banner-content">
                <span class="subscription-banner-icon">☕</span>
                <div class="subscription-banner-text">
                    <h3>Subscribe & Save 10%</h3>
                    <p>Get freshly roasted coffee delivered on your schedule. Cancel anytime.</p>
                </div>
            </div>
            <a href="subscribe.html" class="subscription-banner-cta">Start Subscription</a>
        `;
        
        // Insert after filter bar or page header
        const filterBar = document.querySelector('.filter-bar');
        const pageHeader = document.querySelector('.page-header');
        const insertPoint = filterBar || pageHeader;
        
        if (insertPoint) {
            insertPoint.after(banner);
        } else {
            const main = document.querySelector('main') || document.body;
            main.insertBefore(banner, main.firstChild);
        }
    }
    
    /**
     * Add mobile bottom navigation
     */
    function addMobileBottomNav() {
        if (document.querySelector('.mobile-bottom-nav')) return;
        
        const nav = document.createElement('nav');
        nav.className = 'mobile-bottom-nav';
        nav.setAttribute('aria-label', 'Mobile navigation');
        nav.innerHTML = `
            <div class="mobile-bottom-nav-items">
                <a href="index.html" class="mobile-nav-item ${isCurrentPage('index') ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    <span>Home</span>
                </a>
                <a href="collections.html" class="mobile-nav-item ${isCurrentPage('collections') ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                    <span>Shop</span>
                </a>
                <a href="subscribe.html" class="mobile-nav-item ${isCurrentPage('subscribe') ? 'active' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span>Subscribe</span>
                </a>
                <a href="#" class="mobile-nav-item cart-item" id="mobileCartBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>Cart</span>
                    <span class="cart-badge" id="mobileCartBadge" style="display: none;">0</span>
                </a>
            </div>
        `;
        
        document.body.appendChild(nav);
        
        // Handle mobile cart button
        const mobileCartBtn = document.getElementById('mobileCartBtn');
        if (mobileCartBtn) {
            mobileCartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.grainhouse && window.grainhouse.cart) {
                    window.grainhouse.cart.openCart();
                } else if (typeof Snipcart !== 'undefined') {
                    Snipcart.api.theme.cart.open();
                }
            });
        }
        
        // Sync cart badge
        syncMobileCartBadge();
    }
    
    /**
     * Sync mobile cart badge with main cart
     */
    function syncMobileCartBadge() {
        const mobileBadge = document.getElementById('mobileCartBadge');
        if (!mobileBadge) return;
        
        // Try to get count from local storage
        const cartData = localStorage.getItem('grainhouse_cart');
        if (cartData) {
            try {
                const cart = JSON.parse(cartData);
                const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
                if (count > 0) {
                    mobileBadge.textContent = count;
                    mobileBadge.style.display = 'flex';
                } else {
                    mobileBadge.style.display = 'none';
                }
            } catch (e) {
                mobileBadge.style.display = 'none';
            }
        }
        
        // Watch for changes
        window.addEventListener('storage', function(e) {
            if (e.key === 'grainhouse_cart') {
                syncMobileCartBadge();
            }
        });
        
        // Also watch for custom events
        document.addEventListener('cartUpdated', syncMobileCartBadge);
    }
    
    /**
     * Check if current page matches
     */
    function isCurrentPage(pageName) {
        const path = window.location.pathname.toLowerCase();
        return path.includes(pageName) || (pageName === 'index' && (path === '/' || path.endsWith('/') || path.endsWith('index.html')));
    }
    
    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });
        
        // Auto remove
        setTimeout(() => removeToast(toast), 4000);
    }
    
    /**
     * Remove toast notification
     */
    function removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
    
    /**
     * Helper: Generate product ID from card
     */
    function generateProductId(card) {
        const name = extractNameFromCard(card);
        return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `product-${Date.now()}`;
    }
    
    /**
     * Helper: Extract price from card
     */
    function extractPriceFromCard(card) {
        const priceEl = card.querySelector('.price, .product-price, [data-item-price]');
        if (priceEl) {
            const priceText = priceEl.textContent || priceEl.dataset.itemPrice;
            const match = priceText.match(/[\d.]+/);
            return match ? parseFloat(match[0]) : 0;
        }
        return 0;
    }
    
    /**
     * Helper: Extract name from card
     */
    function extractNameFromCard(card) {
        const nameEl = card.querySelector('.product-name, h3, h4, [data-item-name]');
        return nameEl ? (nameEl.textContent || nameEl.dataset.itemName).trim() : '';
    }
    
    /**
     * Helper: Extract image from card
     */
    function extractImageFromCard(card) {
        const imgEl = card.querySelector('img');
        return imgEl ? imgEl.src : '';
    }
    
    // Initialize
    init();
    
    // Expose for external use
    window.EnhancedProducts = {
        calculatePrice: calculatePrice,
        updateProductDisplay: updateProductDisplay,
        showToast: showToast,
        getProductState: (id) => productStates.get(id),
        SIZE_CONFIG: SIZE_CONFIG,
        SUBSCRIPTION_DISCOUNT: SUBSCRIPTION_DISCOUNT
    };
    
})();

