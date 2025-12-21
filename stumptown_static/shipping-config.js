/**
 * CENTRALIZED SHIPPING RATES CONFIGURATION
 * ==========================================
 * 
 * Update all shipping prices in ONE place!
 * Changes here automatically apply to checkout and policies page.
 * 
 * SHIPPING METHODS ALLOWLIST:
 * - ONE-TIME SHIPMENT: UPS® Ground, UPS 2nd Day Air®, UPS Next Day Air®
 * - RECURRING SHIPMENTS: Standard - $6.00 every week
 * 
 * NO OTHER SHIPPING METHODS ARE ALLOWED.
 */

const SHIPPING_CONFIG = {
    
    // ============================================
    // ALLOWED SHIPPING METHOD IDS (STRICT ALLOWLIST)
    // Only these methods will be shown in checkout
    // ============================================
    allowedMethods: ['ups-ground', 'ups-2day', 'ups-overnight'],
    allowedRecurringMethods: ['recurring-standard'],
    
    // ============================================
    // FREE SHIPPING THRESHOLD (disabled - no free shipping on one-time)
    // ============================================
    freeShippingThreshold: null,
    freeShippingMethod: null,
    
    // ============================================
    // ONE-TIME SHIPMENT METHODS (UPS Only)
    // ============================================
    methods: {
        'ups-ground': {
            id: 'ups-ground',
            name: 'UPS® Ground',
            carrier: 'UPS',
            description: 'UPS Ground shipping',
            deliveryTime: '3 to 5 business days',
            deliveryTimeShort: '3-5 days',
            price: 15.54,
            freeOverThreshold: false
        },
        'ups-2day': {
            id: 'ups-2day',
            name: 'UPS 2nd Day Air®',
            carrier: 'UPS',
            description: '2 business days',
            deliveryTime: '2 business days',
            deliveryTimeShort: '2 days',
            price: 23.97,
            freeOverThreshold: false
        },
        'ups-overnight': {
            id: 'ups-overnight',
            name: 'UPS Next Day Air®',
            carrier: 'UPS',
            description: '1 business day',
            deliveryTime: '1 business day',
            deliveryTimeShort: 'Next day',
            price: 31.53,
            freeOverThreshold: false
        }
    },
    
    // ============================================
    // RECURRING SHIPMENT METHODS
    // ============================================
    recurringMethods: {
        'recurring-standard': {
            id: 'recurring-standard',
            name: 'Standard - $6.00 every week',
            carrier: 'Standard',
            description: 'Weekly recurring shipment',
            deliveryTime: 'Every week',
            deliveryTimeShort: 'Weekly',
            price: 6.00,
            isRecurring: true,
            frequency: 'weekly'
        }
    },
    
    // ============================================
    // SUBSCRIPTION SHIPPING
    // ============================================
    subscription: {
        freeShipping: false,
        method: 'recurring-standard',
        price: 6.00
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
 * Check if a shipping method is in the allowlist
 * @param {string} methodId - The shipping method ID
 * @param {boolean} isRecurring - Whether this is a recurring shipment
 * @returns {boolean} - True if method is allowed
 */
function isAllowedShippingMethod(methodId, isRecurring = false) {
    if (isRecurring) {
        return SHIPPING_CONFIG.allowedRecurringMethods.includes(methodId);
    }
    return SHIPPING_CONFIG.allowedMethods.includes(methodId);
}

/**
 * Get shipping rate for a method
 * @param {string} methodId - The shipping method ID
 * @param {number} cartTotal - The cart subtotal (unused, no free shipping)
 * @returns {number} - The shipping cost
 */
function getShippingRate(methodId, cartTotal = 0) {
    // Check allowlist first
    if (!isAllowedShippingMethod(methodId)) {
        // Check recurring methods
        const recurringMethod = SHIPPING_CONFIG.recurringMethods[methodId];
        if (recurringMethod && isAllowedShippingMethod(methodId, true)) {
            return recurringMethod.price;
        }
        return 0;
    }
    
    const method = SHIPPING_CONFIG.methods[methodId];
    if (!method) return 0;
    
    return method.price;
}

/**
 * Get all available ONE-TIME shipping methods (UPS only)
 * @param {number} cartTotal - The cart subtotal
 * @returns {Array} - Array of shipping options with current prices
 */
function getShippingOptions(cartTotal = 0) {
    const options = [];
    
    // Only return methods in the allowlist
    for (const methodId of SHIPPING_CONFIG.allowedMethods) {
        const method = SHIPPING_CONFIG.methods[methodId];
        if (method) {
            const price = method.price;
            options.push({
                ...method,
                currentPrice: price,
                isFree: false,
                displayPrice: `$${price.toFixed(2)}`
            });
        }
    }
    
    return options;
}

/**
 * Get recurring shipping methods
 * @returns {Array} - Array of recurring shipping options
 */
function getRecurringShippingOptions() {
    const options = [];
    
    for (const methodId of SHIPPING_CONFIG.allowedRecurringMethods) {
        const method = SHIPPING_CONFIG.recurringMethods[methodId];
        if (method) {
            options.push({
                ...method,
                currentPrice: method.price,
                isFree: false,
                displayPrice: `$${method.price.toFixed(2)}`
            });
        }
    }
    
    return options;
}

/**
 * Get shipping options grouped by type (one-time vs recurring)
 * @param {number} cartTotal - The cart subtotal
 * @param {boolean} isSubscription - Whether cart contains subscription items
 * @returns {Object} - Object with shipping type keys and arrays of options
 */
function getShippingOptionsByCarrier(cartTotal = 0, isSubscription = false) {
    // IMPORTANT: Only return UPS for one-time shipments
    // USPS and FedEx are NOT allowed
    const grouped = {
        UPS: []
    };
    
    // Get only UPS options from the allowlist
    const options = getShippingOptions(cartTotal);
    
    options.forEach(option => {
        if (option.carrier === 'UPS') {
            grouped.UPS.push(option);
        }
    });
    
    return grouped;
}

/**
 * Get all shipping options for checkout display
 * @param {number} cartTotal - The cart subtotal
 * @param {boolean} hasSubscription - Whether cart has subscription items
 * @returns {Object} - Object with oneTime and recurring shipping options
 */
function getAllShippingOptions(cartTotal = 0, hasSubscription = false) {
    return {
        oneTime: getShippingOptions(cartTotal),
        recurring: hasSubscription ? getRecurringShippingOptions() : []
    };
}

/**
 * Calculate how much more to spend for free shipping (DISABLED)
 * @param {number} cartTotal - The cart subtotal
 * @returns {null} - Always null, no free shipping available
 */
function getAmountForFreeShipping(cartTotal) {
    // Free shipping is disabled
    return null;
}

/**
 * Get shipping method by ID (with allowlist check)
 * @param {string} methodId - The shipping method ID
 * @returns {Object|null} - The shipping method config or null if not allowed
 */
function getShippingMethod(methodId) {
    // Check one-time methods
    if (isAllowedShippingMethod(methodId)) {
        return SHIPPING_CONFIG.methods[methodId] || null;
    }
    // Check recurring methods
    if (isAllowedShippingMethod(methodId, true)) {
        return SHIPPING_CONFIG.recurringMethods[methodId] || null;
    }
    return null;
}

/**
 * Format shipping data for display in policies page table
 * @returns {Array} - Array of formatted shipping info for HTML table
 */
function getShippingTableData() {
    const data = [];
    
    // ONE-TIME SHIPMENT - UPS Only (from allowlist)
    data.push({
        method: 'UPS® Ground',
        carrier: 'UPS',
        delivery: '3-5 business days',
        cost: `$${SHIPPING_CONFIG.methods['ups-ground'].price.toFixed(2)}`,
        type: 'one-time'
    });
    data.push({
        method: 'UPS 2nd Day Air®',
        carrier: 'UPS',
        delivery: '2 business days',
        cost: `$${SHIPPING_CONFIG.methods['ups-2day'].price.toFixed(2)}`,
        type: 'one-time'
    });
    data.push({
        method: 'UPS Next Day Air®',
        carrier: 'UPS',
        delivery: '1 business day',
        cost: `$${SHIPPING_CONFIG.methods['ups-overnight'].price.toFixed(2)}`,
        type: 'one-time'
    });
    
    // RECURRING SHIPMENT - Standard only
    data.push({
        method: 'Standard - $6.00 every week',
        carrier: 'Standard',
        delivery: 'Every week',
        cost: '$6.00',
        type: 'recurring'
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
    window.isAllowedShippingMethod = isAllowedShippingMethod;
    window.getShippingRate = getShippingRate;
    window.getShippingOptions = getShippingOptions;
    window.getRecurringShippingOptions = getRecurringShippingOptions;
    window.getShippingOptionsByCarrier = getShippingOptionsByCarrier;
    window.getAllShippingOptions = getAllShippingOptions;
    window.getAmountForFreeShipping = getAmountForFreeShipping;
    window.getShippingMethod = getShippingMethod;
    window.getShippingTableData = getShippingTableData;
    window.checkShippingEligibility = checkShippingEligibility;
}

// Node.js export for server-side use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SHIPPING_CONFIG,
        isAllowedShippingMethod,
        getShippingRate,
        getShippingOptions,
        getRecurringShippingOptions,
        getShippingOptionsByCarrier,
        getAllShippingOptions,
        getAmountForFreeShipping,
        getShippingMethod,
        getShippingTableData,
        checkShippingEligibility
    };
}

