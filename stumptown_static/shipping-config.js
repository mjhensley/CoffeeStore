/**
 * CENTRALIZED SHIPPING RATES CONFIGURATION
 * ==========================================
 * 
 * Update all shipping prices in ONE place!
 * Changes here automatically apply to checkout and policies page.
 * 
 * PRICING MODEL: Competitive rates based on market research
 */

const SHIPPING_CONFIG = {
    
    // ============================================
    // FREE SHIPPING THRESHOLD
    // ============================================
    freeShippingThreshold: 45.00,
    freeShippingMethod: 'usps-priority', // Which method becomes free over threshold
    
    // ============================================
    // SHIPPING METHODS - Organized by Carrier
    // ============================================
    // All prices have been increased by 10% from original rates
    methods: {
        // USPS Options
        'usps-priority': {
            id: 'usps-priority',
            name: 'USPS Priority Mail',
            carrier: 'USPS',
            description: 'USPS Priority Mail shipping',
            deliveryTime: '2 to 3 business days',
            deliveryTimeShort: '2-3 days',
            price: 7.26,  // +10% from $6.60
            freeOverThreshold: true
        },
        'usps-priority-express': {
            id: 'usps-priority-express',
            name: 'USPS Priority Mail Express',
            carrier: 'USPS',
            description: 'USPS Express shipping',
            deliveryTime: '1 to 2 business days',
            deliveryTimeShort: '1-2 days',
            price: 27.50,  // +10% from $25.00
            freeOverThreshold: false
        },
        // UPS Options
        'ups-ground': {
            id: 'ups-ground',
            name: 'UPS® Ground',
            carrier: 'UPS',
            description: 'UPS Ground shipping',
            deliveryTime: '3 to 5 business days',
            deliveryTimeShort: '3-5 days',
            price: 15.54,  // +10% from $14.13
            freeOverThreshold: false
        },
        'ups-2day': {
            id: 'ups-2day',
            name: 'UPS 2nd Day Air®',
            carrier: 'UPS',
            description: 'UPS 2-Day Air shipping',
            deliveryTime: '2 business days',
            deliveryTimeShort: '2 days',
            price: 23.97,  // +10% from $21.79
            freeOverThreshold: false
        },
        'ups-overnight': {
            id: 'ups-overnight',
            name: 'UPS Next Day Air®',
            carrier: 'UPS',
            description: 'Next business day delivery',
            deliveryTime: '1 business day',
            deliveryTimeShort: 'Next day',
            price: 31.53,  // +10% from $28.66
            freeOverThreshold: false
        },
        // FedEx Options
        'fedex-ground': {
            id: 'fedex-ground',
            name: 'FedEx Ground',
            carrier: 'FedEx',
            description: 'FedEx Ground shipping',
            deliveryTime: '3 to 5 business days',
            deliveryTimeShort: '3-5 days',
            price: 16.50,  // +10% from $15.00
            freeOverThreshold: false
        },
        'fedex-2day': {
            id: 'fedex-2day',
            name: 'FedEx 2Day®',
            carrier: 'FedEx',
            description: 'FedEx 2-Day shipping',
            deliveryTime: '2 business days',
            deliveryTimeShort: '2 days',
            price: 24.20,  // +10% from $22.00
            freeOverThreshold: false
        },
        'fedex-overnight': {
            id: 'fedex-overnight',
            name: 'FedEx Standard Overnight®',
            carrier: 'FedEx',
            description: 'FedEx Overnight shipping',
            deliveryTime: '1 business day',
            deliveryTimeShort: 'Next day',
            price: 33.00,  // +10% from $30.00
            freeOverThreshold: false
        }
    },
    
    // ============================================
    // SUBSCRIPTION SHIPPING
    // ============================================
    subscription: {
        freeShipping: true,
        method: 'usps-priority'
    },
    
    // ============================================
    // SALES TAX CONFIGURATION
    // ============================================
    tax: {
        rate: 0.07, // 7% sales tax
        appliesToShipping: false, // Tax only on product subtotal
        appliesToSubtotal: true
    },
    
    // ============================================
    // INTERNATIONAL SHIPPING
    // ============================================
    // DISABLED - Domestic shipping only
    international: {
        enabled: false,
        countries: [],
        basePrice: 0,
        note: 'International shipping is currently not available'
    },
    
    // ============================================
    // SHIPPING RESTRICTIONS
    // ============================================
    restrictions: {
        poBoxAllowed: true,
        apoFpoAllowed: true,
        alaskaHawaii: {
            enabled: true,
            additionalFee: 5.00,
            note: 'Extended delivery times may apply'
        }
    },
    
    // ============================================
    // PROCESSING TIME
    // ============================================
    processing: {
        standard: '1-3 business days',
        peakSeason: 'up to 5 business days',
        note: 'All coffee is roasted fresh to order'
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get shipping rate for a method, considering cart total
 * @param {string} methodId - The shipping method ID
 * @param {number} cartTotal - The cart subtotal
 * @returns {number} - The shipping cost (0 if free)
 */
function getShippingRate(methodId, cartTotal = 0) {
    const method = SHIPPING_CONFIG.methods[methodId];
    if (!method) return 0;
    
    // Check if free shipping applies
    if (method.freeOverThreshold && cartTotal >= SHIPPING_CONFIG.freeShippingThreshold) {
        return 0;
    }
    
    return method.price;
}

/**
 * Get all available shipping methods with calculated prices
 * @param {number} cartTotal - The cart subtotal
 * @returns {Array} - Array of shipping options with current prices
 */
function getShippingOptions(cartTotal = 0) {
    const options = [];
    
    for (const [id, method] of Object.entries(SHIPPING_CONFIG.methods)) {
        const price = getShippingRate(id, cartTotal);
        const isFree = price === 0 && method.price > 0;
        
        options.push({
            ...method,
            currentPrice: price,
            isFree: isFree,
            displayPrice: isFree ? 'FREE' : `$${price.toFixed(2)}`
        });
    }
    
    return options;
}

/**
 * Get shipping options grouped by carrier
 * @param {number} cartTotal - The cart subtotal
 * @returns {Object} - Object with carrier keys and arrays of options
 */
function getShippingOptionsByCarrier(cartTotal = 0) {
    const grouped = {
        USPS: [],
        UPS: [],
        FedEx: []
    };
    
    const options = getShippingOptions(cartTotal);
    
    options.forEach(option => {
        const carrier = option.carrier || 'USPS';
        if (grouped[carrier]) {
            grouped[carrier].push(option);
        }
    });
    
    return grouped;
}

/**
 * Calculate how much more to spend for free shipping
 * @param {number} cartTotal - The cart subtotal
 * @returns {number|null} - Amount needed, or null if already qualifies
 */
function getAmountForFreeShipping(cartTotal) {
    const threshold = SHIPPING_CONFIG.freeShippingThreshold;
    if (cartTotal >= threshold) return null;
    return Math.ceil((threshold - cartTotal) * 100) / 100;
}

/**
 * Get shipping method by ID
 * @param {string} methodId - The shipping method ID
 * @returns {Object|null} - The shipping method config
 */
function getShippingMethod(methodId) {
    return SHIPPING_CONFIG.methods[methodId] || null;
}

/**
 * Format shipping data for display in policies page table
 * @returns {Array} - Array of formatted shipping info for HTML table
 */
function getShippingTableData() {
    const data = [];
    
    // USPS
    data.push({
        method: 'USPS Priority Mail',
        carrier: 'USPS',
        delivery: '2-3 business days',
        cost: `$${SHIPPING_CONFIG.methods['usps-priority'].price.toFixed(2)} (Free over $${SHIPPING_CONFIG.freeShippingThreshold})`
    });
    data.push({
        method: 'USPS Priority Mail Express',
        carrier: 'USPS',
        delivery: '1-2 business days',
        cost: `$${SHIPPING_CONFIG.methods['usps-priority-express'].price.toFixed(2)}`
    });
    
    // UPS
    data.push({
        method: 'UPS® Ground',
        carrier: 'UPS',
        delivery: '3-5 business days',
        cost: `$${SHIPPING_CONFIG.methods['ups-ground'].price.toFixed(2)}`
    });
    data.push({
        method: 'UPS 2nd Day Air®',
        carrier: 'UPS',
        delivery: '2 business days',
        cost: `$${SHIPPING_CONFIG.methods['ups-2day'].price.toFixed(2)}`
    });
    data.push({
        method: 'UPS Next Day Air®',
        carrier: 'UPS',
        delivery: 'Next business day',
        cost: `$${SHIPPING_CONFIG.methods['ups-overnight'].price.toFixed(2)}`
    });
    
    // FedEx
    data.push({
        method: 'FedEx Ground',
        carrier: 'FedEx',
        delivery: '3-5 business days',
        cost: `$${SHIPPING_CONFIG.methods['fedex-ground'].price.toFixed(2)}`
    });
    data.push({
        method: 'FedEx 2Day®',
        carrier: 'FedEx',
        delivery: '2 business days',
        cost: `$${SHIPPING_CONFIG.methods['fedex-2day'].price.toFixed(2)}`
    });
    data.push({
        method: 'FedEx Standard Overnight®',
        carrier: 'FedEx',
        delivery: 'Next business day',
        cost: `$${SHIPPING_CONFIG.methods['fedex-overnight'].price.toFixed(2)}`
    });
    
    return data;
}

/**
 * Check if location qualifies for shipping
 * @param {string} country - Country code
 * @param {string} state - State/province code
 * @returns {Object} - { allowed: boolean, additionalFee: number, note: string }
 */
function checkShippingEligibility(country, state) {
    // US domestic
    if (country === 'US') {
        // Alaska/Hawaii surcharge
        if (state === 'AK' || state === 'HI') {
            return {
                allowed: true,
                additionalFee: SHIPPING_CONFIG.restrictions.alaskaHawaii.additionalFee,
                note: SHIPPING_CONFIG.restrictions.alaskaHawaii.note
            };
        }
        return { allowed: true, additionalFee: 0, note: '' };
    }
    
    // International
    if (SHIPPING_CONFIG.international.enabled && 
        SHIPPING_CONFIG.international.countries.includes(country)) {
        return {
            allowed: true,
            additionalFee: SHIPPING_CONFIG.international.basePrice,
            note: SHIPPING_CONFIG.international.note
        };
    }
    
    return {
        allowed: false,
        additionalFee: 0,
        note: 'Sorry, we do not ship to this location yet.'
    };
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.SHIPPING_CONFIG = SHIPPING_CONFIG;
    window.getShippingRate = getShippingRate;
    window.getShippingOptions = getShippingOptions;
    window.getShippingOptionsByCarrier = getShippingOptionsByCarrier;
    window.getAmountForFreeShipping = getAmountForFreeShipping;
    window.getShippingMethod = getShippingMethod;
    window.getShippingTableData = getShippingTableData;
    window.checkShippingEligibility = checkShippingEligibility;
}

// Node.js export for server-side use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SHIPPING_CONFIG,
        getShippingRate,
        getShippingOptions,
        getShippingOptionsByCarrier,
        getAmountForFreeShipping,
        getShippingMethod,
        getShippingTableData,
        checkShippingEligibility
    };
}

