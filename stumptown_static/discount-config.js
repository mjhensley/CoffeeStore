/**
 * DISCOUNT CODE SYSTEM
 * ==========================================
 * 
 * Centralized discount codes with one-time use per device/IP
 * Uses fingerprinting to prevent abuse
 */

const DISCOUNT_CONFIG = {
    
    // ============================================
    // ACTIVE DISCOUNT CODES
    // ============================================
    codes: {
        'WELCOME10': {
            code: 'WELCOME10',
            type: 'percentage',
            value: 10,
            description: '10% off your first order',
            minOrder: 0,
            maxUses: null, // unlimited total uses
            oneTimePerDevice: true,
            oneTimePerIP: true,
            active: true,
            expiresAt: null
        },
        'HOLIDAY15': {
            code: 'HOLIDAY15',
            type: 'percentage',
            value: 15,
            description: '15% off orders $75+',
            minOrder: 75,
            maxUses: null,
            oneTimePerDevice: true,
            oneTimePerIP: false, // Allow same IP (households)
            active: true,
            expiresAt: '2025-12-31'
        },
        'SAVE30': {
            code: 'SAVE30',
            type: 'percentage',
            value: 30,
            description: '30% off first subscription',
            minOrder: 0,
            maxUses: null,
            oneTimePerDevice: true,
            oneTimePerIP: true,
            subscriptionOnly: true,
            active: true,
            expiresAt: null
        },
        'FREESHIP': {
            code: 'FREESHIP',
            type: 'free_shipping',
            value: 0,
            description: 'Free shipping on any order',
            minOrder: 0,
            maxUses: 1000,
            oneTimePerDevice: true,
            oneTimePerIP: false,
            active: true,
            expiresAt: '2025-03-01'
        },
        'COFFEE5': {
            code: 'COFFEE5',
            type: 'fixed',
            value: 5,
            description: '$5 off your order',
            minOrder: 25,
            maxUses: null,
            oneTimePerDevice: true,
            oneTimePerIP: true,
            active: true,
            expiresAt: null
        }
    },
    
    // ============================================
    // STORAGE KEYS
    // ============================================
    storageKeys: {
        usedCodes: 'grainhouse_used_codes',
        ipHash: 'grainhouse_ip_hash'
    }
};

// ============================================
// DISCOUNT CODE MANAGER
// ============================================

const DiscountManager = {
    
    /**
     * Get device fingerprint
     */
    getFingerprint() {
        return window.__GH_FP || localStorage.getItem('gh_fp') || this.generateFallbackFingerprint();
    },
    
    /**
     * Fallback fingerprint if main one not available
     */
    generateFallbackFingerprint() {
        const components = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.language
        ];
        const fp = this.hashCode(components.join('|||'));
        localStorage.setItem('gh_fp', fp);
        return fp;
    },
    
    /**
     * Simple hash function
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },
    
    /**
     * Get used codes from localStorage
     */
    getUsedCodes() {
        try {
            const stored = localStorage.getItem(DISCOUNT_CONFIG.storageKeys.usedCodes);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    },
    
    /**
     * Mark a code as used for this device
     */
    markCodeUsed(code) {
        const usedCodes = this.getUsedCodes();
        const fingerprint = this.getFingerprint();
        
        if (!usedCodes[code]) {
            usedCodes[code] = [];
        }
        
        usedCodes[code].push({
            fingerprint: fingerprint,
            timestamp: Date.now()
        });
        
        localStorage.setItem(DISCOUNT_CONFIG.storageKeys.usedCodes, JSON.stringify(usedCodes));
    },
    
    /**
     * Check if code was used by this device
     */
    wasCodeUsedByDevice(code) {
        const usedCodes = this.getUsedCodes();
        const fingerprint = this.getFingerprint();
        
        if (!usedCodes[code]) return false;
        
        return usedCodes[code].some(use => use.fingerprint === fingerprint);
    },
    
    /**
     * Validate a discount code
     * @param {string} code - The discount code
     * @param {number} cartTotal - Cart subtotal
     * @param {boolean} isSubscription - Whether order includes subscription
     * @returns {Object} - { valid: boolean, error: string, discount: Object }
     */
    validateCode(code, cartTotal = 0, isSubscription = false) {
        const normalizedCode = code.toUpperCase().trim();
        const discountConfig = DISCOUNT_CONFIG.codes[normalizedCode];
        
        // Check if code exists
        if (!discountConfig) {
            return {
                valid: false,
                error: 'Invalid discount code',
                discount: null
            };
        }
        
        // Check if code is active
        if (!discountConfig.active) {
            return {
                valid: false,
                error: 'This code is no longer active',
                discount: null
            };
        }
        
        // Check expiration
        if (discountConfig.expiresAt) {
            const expiryDate = new Date(discountConfig.expiresAt);
            if (new Date() > expiryDate) {
                return {
                    valid: false,
                    error: 'This code has expired',
                    discount: null
                };
            }
        }
        
        // Check minimum order
        if (discountConfig.minOrder && cartTotal < discountConfig.minOrder) {
            return {
                valid: false,
                error: `Minimum order of $${discountConfig.minOrder.toFixed(2)} required`,
                discount: null
            };
        }
        
        // Check subscription requirement
        if (discountConfig.subscriptionOnly && !isSubscription) {
            return {
                valid: false,
                error: 'This code is only valid for subscription orders',
                discount: null
            };
        }
        
        // Check one-time use per device
        if (discountConfig.oneTimePerDevice && this.wasCodeUsedByDevice(normalizedCode)) {
            return {
                valid: false,
                error: 'You have already used this code',
                discount: null
            };
        }
        
        // Calculate discount amount
        let discountAmount = 0;
        let discountDisplay = '';
        
        switch (discountConfig.type) {
            case 'percentage':
                discountAmount = (cartTotal * discountConfig.value) / 100;
                discountDisplay = `${discountConfig.value}% off`;
                break;
            case 'fixed':
                discountAmount = Math.min(discountConfig.value, cartTotal);
                discountDisplay = `$${discountConfig.value.toFixed(2)} off`;
                break;
            case 'free_shipping':
                discountAmount = 0; // Handled separately
                discountDisplay = 'Free shipping';
                break;
        }
        
        return {
            valid: true,
            error: null,
            discount: {
                code: normalizedCode,
                type: discountConfig.type,
                value: discountConfig.value,
                amount: discountAmount,
                display: discountDisplay,
                description: discountConfig.description,
                freeShipping: discountConfig.type === 'free_shipping'
            }
        };
    },
    
    /**
     * Apply discount code (mark as used)
     * @param {string} code - The discount code
     */
    applyCode(code) {
        const normalizedCode = code.toUpperCase().trim();
        this.markCodeUsed(normalizedCode);
    },
    
    /**
     * Calculate final totals with discount
     * @param {number} subtotal - Cart subtotal
     * @param {number} shipping - Shipping cost
     * @param {Object} discount - Validated discount object
     * @returns {Object} - { subtotal, shipping, discount, total }
     */
    calculateTotals(subtotal, shipping, discount = null) {
        let discountAmount = 0;
        let finalShipping = shipping;
        
        if (discount) {
            if (discount.freeShipping) {
                finalShipping = 0;
            } else {
                discountAmount = discount.amount;
            }
        }
        
        const total = Math.max(0, subtotal - discountAmount) + finalShipping;
        
        return {
            subtotal: subtotal,
            shipping: finalShipping,
            discountAmount: discountAmount,
            total: total
        };
    }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.DISCOUNT_CONFIG = DISCOUNT_CONFIG;
    window.DiscountManager = DiscountManager;
}

