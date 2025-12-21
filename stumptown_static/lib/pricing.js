/**
 * UNIFIED PRICING MODULE
 * ======================
 * 
 * Single source of truth for all pricing calculations:
 * - Subtotal
 * - Shipping
 * - Tax
 * - Grand Total
 * 
 * This module ensures consistency across cart, checkout, and order summary.
 */

/**
 * Calculate complete order pricing breakdown
 * @param {number} subtotal - Product subtotal
 * @param {string} shippingMethodId - Selected shipping method ID
 * @param {Object} address - Shipping address (for tax calculation)
 * @returns {Object} - Complete pricing breakdown
 */
function calculateOrderPricing(subtotal, shippingMethodId = 'ups-ground', address = {}) {
    // Get shipping cost
    let shippingCost = 0;
    if (typeof window.getShippingRate === 'function') {
        shippingCost = window.getShippingRate(shippingMethodId, subtotal);
    } else {
        // Fallback if shipping-config not loaded - use SITE_CONFIG or UPS Ground default
        const method = window.SHIPPING_CONFIG?.methods?.[shippingMethodId];
        const defaultPrice = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.shipping) 
            ? SITE_CONFIG.shipping.defaultPrice 
            : 15.54;
        
        if (method) {
            shippingCost = method.price || defaultPrice;
        } else {
            shippingCost = defaultPrice;
        }
    }
    
    // Get tax
    let taxAmount = 0;
    if (typeof window.calculateTax === 'function') {
        taxAmount = window.calculateTax(subtotal, shippingCost, address);
    } else {
        // Fallback if tax module not loaded - use SITE_CONFIG or default
        const taxRate = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.tax) 
            ? SITE_CONFIG.tax.defaultRate 
            : (window.TAX_CONFIG?.defaultRate || 0.07);
        taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    }
    
    // Calculate total
    const total = subtotal + shippingCost + taxAmount;
    
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: Math.round(shippingCost * 100) / 100,
        tax: taxAmount,
        total: Math.round(total * 100) / 100
    };
}

/**
 * Format price for display
 * @param {number} price - Price in dollars
 * @returns {string} - Formatted price string
 */
function formatPrice(price) {
    return '$' + price.toFixed(2);
}

/**
 * Format price as FREE if zero
 * @param {number} price - Price in dollars
 * @returns {string} - Formatted price or 'FREE'
 */
function formatPriceOrFree(price) {
    return price === 0 ? 'FREE' : formatPrice(price);
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.calculateOrderPricing = calculateOrderPricing;
    window.formatPrice = formatPrice;
    window.formatPriceOrFree = formatPriceOrFree;
}

// Node.js export for server-side use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateOrderPricing,
        formatPrice,
        formatPriceOrFree
    };
}

