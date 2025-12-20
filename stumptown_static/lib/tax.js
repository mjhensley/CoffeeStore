/**
 * TAX CALCULATION MODULE
 * ======================
 * 
 * Centralized tax calculation with configurable rates.
 * Supports per-state tax rates (structure ready for extension).
 */

const TAX_CONFIG = {
    // Default tax rate (typical online coffee purchase range)
    // TODO: Configure per-state rates as needed
    defaultRate: 0.07, // 7% - typical US online sales tax
    
    // Tax is applied to subtotal only (not shipping)
    appliesToShipping: false,
    appliesToSubtotal: true,
    
    // Per-state rates (structure for easy extension)
    // Format: state abbreviation -> rate
    stateRates: {
        // Example: 'CA': 0.0875, // 8.75% for California
        // Add state-specific rates here as needed
    }
};

/**
 * Get tax rate for a given address
 * @param {Object} address - Address object with state/country
 * @returns {number} - Tax rate (0-1)
 */
function getTaxRate(address = {}) {
    const state = address.state || '';
    const country = address.country || 'US';
    
    // Only apply tax for US addresses
    if (country !== 'US' && country !== 'USA') {
        return 0;
    }
    
    // Check for state-specific rate
    if (state && TAX_CONFIG.stateRates[state]) {
        return TAX_CONFIG.stateRates[state];
    }
    
    // Return default rate
    return TAX_CONFIG.defaultRate;
}

/**
 * Calculate tax amount
 * @param {number} subtotal - Product subtotal
 * @param {number} shipping - Shipping cost (not taxed)
 * @param {Object} address - Address object for tax rate lookup
 * @returns {number} - Tax amount (rounded to 2 decimals)
 */
function calculateTax(subtotal, shipping = 0, address = {}) {
    if (!TAX_CONFIG.appliesToSubtotal) {
        return 0;
    }
    
    const rate = getTaxRate(address);
    const taxableAmount = subtotal; // Tax only applies to subtotal, not shipping
    
    // Calculate and round to 2 decimal places
    const taxAmount = Math.round(taxableAmount * rate * 100) / 100;
    
    return Math.max(0, taxAmount); // Ensure non-negative
}

/**
 * Get tax configuration
 * @returns {Object} - Tax configuration object
 */
function getTaxConfig() {
    return {
        defaultRate: TAX_CONFIG.defaultRate,
        appliesToShipping: TAX_CONFIG.appliesToShipping,
        appliesToSubtotal: TAX_CONFIG.appliesToSubtotal,
        stateRates: { ...TAX_CONFIG.stateRates }
    };
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.TAX_CONFIG = TAX_CONFIG;
    window.getTaxRate = getTaxRate;
    window.calculateTax = calculateTax;
    window.getTaxConfig = getTaxConfig;
}

// Node.js export for server-side use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TAX_CONFIG,
        getTaxRate,
        calculateTax,
        getTaxConfig
    };
}

