/**
 * SITE CONFIGURATION - SINGLE SOURCE OF TRUTH
 * ============================================
 * 
 * All shared constants and configuration values in ONE place.
 * Changes here automatically apply everywhere.
 */

const SITE_CONFIG = {
    // ============================================
    // SNIPCART CONFIGURATION
    // ============================================
    snipcart: {
        apiKey: 'ODMwYTIxNjQtMjkxYy00YjNlLWI0NTAtYTkyNWFkNTdlNzNhNjM5MDE1ODA5OTIzMjEyMTUw',
        modalStyle: 'side'
    },
    
    // ============================================
    // TAX CONFIGURATION
    // ============================================
    tax: {
        defaultRate: 0.07, // 7% sales tax
        appliesToShipping: false // Tax only applies to product subtotal, not shipping
    },
    
    // ============================================
    // SHIPPING CONFIGURATION
    // ============================================
    shipping: {
        defaultMethod: 'ups-ground',
        defaultPrice: 15.54 // UPS Ground default price
    },
    
    // ============================================
    // SUBSCRIPTION CONFIGURATION
    // ============================================
    subscription: {
        discount: 0.10 // 10% discount on subscription orders
    },
    
    // ============================================
    // CART CONFIGURATION
    // ============================================
    cart: {
        storageKey: 'grainhouse_cart' // localStorage key for cart data
    }
};

// Export for browser use
if (typeof window !== 'undefined') {
    window.SITE_CONFIG = SITE_CONFIG;
}

// Export for Node.js/module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SITE_CONFIG };
}
