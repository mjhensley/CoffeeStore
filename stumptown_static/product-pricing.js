/**
 * CENTRALIZED PRODUCT PRICING CONFIGURATION
 * ==========================================
 * 
 * Update all product prices in ONE place!
 * Changes here automatically apply to all product pages.
 * 
 * PRICING MODEL: 95% markup on Stumptown wholesale prices
 * Formula: Stumptown Price × 1.95 = Your Price
 */

const PRICING_CONFIG = {
    
    // ============================================
    // MARKUP PERCENTAGE (95% = 1.95 multiplier)
    // ============================================
    markup: 1.95,
    
    // ============================================
    // SIZE MULTIPLIERS (relative to 12oz base)
    // ============================================
    sizeMultipliers: {
        '12oz': { label: '12 oz', multiplier: 1 },
        '2lb':  { label: '2 lb',  multiplier: 2.35 },
        '5lb':  { label: '5 lb',  multiplier: 5.25 }
    },
    
    // ============================================
    // SUBSCRIPTION DISCOUNT (10% off)
    // ============================================
    subscriptionDiscount: 0.10,
    
    // ============================================
    // ALL PRODUCT PRICES 
    // basePrice = 12oz price WITH markup applied
    // ============================================
    products: {
        
        // =====================================
        // SIGNATURE BLENDS
        // =====================================
        'hair-bender': {
            name: 'Hair Bender',
            category: 'blend',
            stumptownPrice: 19.00,
            basePrice: 37.00,
            notes: 'Citrus • Dark Chocolate • Raisin',
            image: 'images/Hair-Bender_e0a4e119-c201-4e7a-bf1c-f4cc4ae240e1_750x_2b77870c.png',
            url: 'product-hair-bender.html'
        },
        
        'holler-mountain': {
            name: 'Holler Mountain',
            category: 'blend',
            stumptownPrice: 20.00,
            basePrice: 38.75,
            notes: 'Citrus • Caramel • Berry Jam',
            image: 'images/5lb_HollerMtn_750x_020a6823.png',
            url: 'product-holler-mountain.html'
        },
        
        'french-roast': {
            name: 'French Roast',
            category: 'blend',
            stumptownPrice: 17.00,
            basePrice: 33.25,
            notes: 'Smoky • Bittersweet • Bold',
            image: 'images/SCR_French_750x_a3188d26.png',
            url: 'product-french-roast.html'
        },
        
        'founders-blend': {
            name: "Founder's Blend",
            category: 'blend',
            stumptownPrice: 18.00,
            basePrice: 35.00,
            notes: 'Milk Chocolate • Caramel • Stone Fruit',
            image: 'images/SCR_Founders_750x_6bcb2680.png',
            url: 'product-founders-blend.html'
        },
        
        'homestead': {
            name: 'Homestead',
            category: 'blend',
            stumptownPrice: 18.00,
            basePrice: 35.00,
            notes: 'Brown Sugar • Graham • Cherry',
            image: 'images/SCR_Homstead_750x_1af31438.png',
            url: 'product-homestead.html'
        },
        
        'hundred-mile': {
            name: 'Hundred Mile',
            category: 'blend',
            stumptownPrice: 18.00,
            basePrice: 35.00,
            notes: 'Maple • Walnut • Cocoa',
            image: 'images/SCR_Hundred_Mile_750x_c7b81bcb.png',
            url: 'product-hundred-mile.html'
        },
        
        'evergreen': {
            name: 'Evergreen',
            category: 'blend',
            stumptownPrice: 18.00,
            basePrice: 35.00,
            notes: 'Dark Chocolate • Toffee • Hazelnut',
            image: 'images/SCR_Evergreen_72_750x_d2e8f1a3.png',
            url: 'product-evergreen.html'
        },
        
        // =====================================
        // SINGLE ORIGINS
        // =====================================
        'ethiopia-mordecofe': {
            name: 'Ethiopia Mordecofe',
            category: 'single',
            stumptownPrice: 23.00,
            basePrice: 44.75,
            notes: 'Nectarine • Melon • Jasmine',
            image: 'images/Ethiopia_Mordecofe_72DPI_750x_8f486bfc.png',
            url: 'product-ethiopia.html'
        },
        
        'ethiopia-duromina': {
            name: 'Ethiopia Duromina',
            category: 'single',
            stumptownPrice: 21.50,
            basePrice: 42.00,
            notes: 'Peach • Bergamot • Honey',
            image: 'images/Ethiopia_Duromina_2023_750x_de0f539e.png',
            url: 'product-ethiopia-duromina.html'
        },
        
        'ethiopia-suke-quto': {
            name: 'Ethiopia Suke Quto',
            category: 'single',
            stumptownPrice: 22.50,
            basePrice: 44.00,
            notes: 'Blueberry • Lavender • Cream',
            image: 'images/Ethiopia_SukeQuto_72_750x_67712917.png',
            url: 'product-ethiopia-suke-quto.html'
        },
        
        'guatemala-injerto': {
            name: 'Guatemala El Injerto Bourbon',
            category: 'single',
            stumptownPrice: 19.50,
            basePrice: 38.00,
            notes: 'Honey • Almond • Orange Blossom',
            image: 'images/Guatemala_Injerto_72DPI_750x_c85f78cb.png',
            url: 'product-guatemala-injerto.html'
        },
        
        'guatemala-bella-vista': {
            name: 'Guatemala Bella Vista',
            category: 'single',
            stumptownPrice: 21.00,
            basePrice: 41.00,
            notes: 'Brown Sugar • Hazelnut • Plum',
            image: 'images/BellaVistaShopify2024_750x_2fd3a0c4.png',
            url: 'product-guatemala-bella-vista.html'
        },
        
        'costa-rica-bella-vista': {
            name: 'Costa Rica Bella Vista',
            category: 'single',
            stumptownPrice: 21.00,
            basePrice: 41.00,
            notes: 'Brown Sugar • Hazelnut • Plum',
            image: 'images/BellaVistaShopify2024_750x_2fd3a0c4.png',
            url: 'product-costa-rica-bella-vista.html'
        },
        
        'colombia-el-jordan': {
            name: 'Colombia El Jordan',
            category: 'single',
            stumptownPrice: 20.00,
            basePrice: 39.00,
            notes: 'Red Apple • Vanilla • Caramel',
            image: 'images/Colombia_El_Jordan_72_1_750x_0e747188.png',
            url: 'product-colombia-el-jordan.html'
        },
        
        'colombia-cantillo': {
            name: 'Colombia Cantillo Family',
            category: 'single',
            stumptownPrice: 21.00,
            basePrice: 41.00,
            notes: 'Grape • Panela • Cocoa',
            image: 'images/STC-Shopify-Colombia-Cantillo_Product-Image-Transparent-PNG_EDIT_750x_9b0b6529.png',
            url: 'product-colombia-cantillo.html'
        },
        
        'costa-rica-montes': {
            name: 'Costa Rica Montes de Oro',
            category: 'single',
            stumptownPrice: 22.00,
            basePrice: 43.00,
            notes: 'Tangerine • Cane Sugar • Almond',
            image: 'images/SCR_CR_MontesOro_Knockout_72_750x_874f512b.png',
            url: 'product-costa-rica-montes.html'
        },
        
        'indonesia-beis-penantan': {
            name: 'Indonesia Bies Penantan',
            category: 'single',
            stumptownPrice: 20.50,
            basePrice: 40.00,
            notes: 'Cedar • Dark Chocolate • Spice',
            image: 'images/Indo_Beis_Penantan_72DPI_750x_6c1c5ea9.png',
            url: 'product-indonesia-beis-penantan.html'
        },
        
        'honduras-puente': {
            name: 'Honduras El Puente',
            category: 'single',
            stumptownPrice: 20.00,
            basePrice: 39.00,
            notes: 'Toffee • Orange • Milk Chocolate',
            image: 'images/SCR_Honduras_Puente_72_750x_99fad396.png',
            url: 'product-honduras-puente.html'
        },
        
        'roasters-pick': {
            name: "Roaster's Pick",
            category: 'single',
            stumptownPrice: 20.00,
            basePrice: 39.00,
            notes: 'Seasonal • Rotating Selection',
            image: 'images/SCR_RoastersPick_72_750x_e8f9a1b2.png',
            url: 'product-roasters-pick.html'
        },
        
        // =====================================
        // DECAF
        // =====================================
        'trapper-creek-decaf': {
            name: 'Trapper Creek Decaf',
            category: 'decaf',
            stumptownPrice: 20.25,
            basePrice: 39.50,
            notes: 'Citrus • Graham • Cocoa',
            image: 'images/SCR_Trapper_750x_c5bcc4b8.png',
            url: 'product-trapper-creek.html'
        },
        
        // =====================================
        // COLD BREW (Ready to Drink)
        // =====================================
        'cold-brew-original': {
            name: 'Original Cold Brew',
            category: 'cold-brew',
            stumptownPrice: 4.50,
            basePrice: 8.75,
            notes: 'Smooth • Bold • Refreshing',
            size: '10.5oz',
            image: 'images/Original-Cold-Brew-Stubby-label_1_750x_23d39a6a.png',
            url: 'cold-brew.html'
        },
        
        'cold-brew-nitro': {
            name: 'Hair Bender Nitro Cold Brew',
            category: 'cold-brew',
            stumptownPrice: 5.00,
            basePrice: 9.75,
            notes: 'Creamy • Cascading • Silky',
            size: '11oz',
            image: 'images/Nitro_HairBender_750x_a8b9c0d1.png',
            url: 'cold-brew.html'
        },
        
        'cold-brew-concentrate': {
            name: 'Cold Brew Concentrate',
            category: 'cold-brew',
            stumptownPrice: 14.50,
            basePrice: 28.25,
            notes: 'Rich • Smooth • Chocolatey',
            size: '25.4oz',
            image: 'images/25.4_oz_Cold_Brew_Concentrate_Shopify_750x_8f671eee.png',
            url: 'cold-brew.html'
        },
        
        'cold-brew-oatly-original': {
            name: 'Cold Brew with Oatly (Original)',
            category: 'cold-brew',
            stumptownPrice: 5.50,
            basePrice: 10.75,
            notes: 'Creamy • Oat • Balanced',
            size: '11oz',
            image: 'images/ColdBrew_Oatly_Original_750x_e2f3a4b5.png',
            url: 'cold-brew.html'
        },
        
        'cold-brew-oatly-chocolate': {
            name: 'Cold Brew with Oatly (Chocolate)',
            category: 'cold-brew',
            stumptownPrice: 5.50,
            basePrice: 10.75,
            notes: 'Chocolate • Creamy • Sweet',
            size: '11oz',
            image: 'images/ColdBrew_Oatly_Chocolate_750x_f5a6b7c8.png',
            url: 'cold-brew.html'
        },
        
        'cold-brew-decaf': {
            name: 'Cold Brew Decaf Concentrate',
            category: 'cold-brew',
            stumptownPrice: 14.50,
            basePrice: 28.25,
            notes: 'Smooth • Mellow • Relaxing',
            size: '25.4oz',
            image: 'images/ColdBrew_Decaf_Concentrate_750x_d4e5f6a7.png',
            url: 'cold-brew.html'
        },
        
        'ethiopia-cold-brew': {
            name: 'Ethiopia Cold Brew Concentrate',
            category: 'cold-brew',
            stumptownPrice: 16.00,
            basePrice: 31.25,
            notes: 'Floral • Bright • Fruity',
            size: '25.4oz',
            image: 'images/Ethiopia_ColdBrew_Concentrate_750x_d9e0f1a2.png',
            url: 'cold-brew.html'
        },
        
        'french-roast-cold-brew': {
            name: 'French Roast Cold Brew Concentrate',
            category: 'cold-brew',
            stumptownPrice: 15.00,
            basePrice: 29.25,
            notes: 'Bold • Smoky • Intense',
            size: '25.4oz',
            image: 'images/FrenchRoast_ColdBrew_750x_b3c4d5e6.png',
            url: 'cold-brew.html'
        },
        
        // =====================================
        // GEAR
        // =====================================
        'aeropress': {
            name: 'AeroPress Coffee Maker',
            category: 'gear',
            basePrice: 39.95,
            notes: 'Portable • Versatile • Quick',
            image: 'images/Aeropress_White_2025_8_NoFunnel_750x_a7ae74b8.png',
            url: 'gear.html'
        },
        
        'aeropress-filters': {
            name: 'AeroPress Filters (350 Pack)',
            category: 'gear',
            basePrice: 8.95,
            notes: 'Clean • Crisp • Essential',
            image: 'images/Aeropress_Filters_750x_b8c9d0e1.png',
            url: 'gear.html'
        },
        
        'chemex-6cup': {
            name: 'Chemex 6-Cup Brewer',
            category: 'gear',
            basePrice: 49.95,
            notes: 'Elegant • Clean • Classic',
            image: 'images/Chemex_Wood_Collar_750x_c9d0e1f2.png',
            url: 'gear.html'
        },
        
        'hario-v60': {
            name: 'Hario V60 Ceramic Dripper',
            category: 'gear',
            basePrice: 26.00,
            notes: 'Precision • Control • Classic',
            image: 'images/Origami_Dripper_1_750x_18501aad.png',
            url: 'gear.html'
        },
        
        'hario-kettle': {
            name: 'Hario Buono Electric Kettle',
            category: 'gear',
            basePrice: 95.00,
            notes: 'Precise • Gooseneck • Temperature Control',
            image: 'images/Hario_Buono_Isolated_750x_91da4d09.png',
            url: 'gear.html'
        },
        
        'baratza-encore': {
            name: 'Baratza Encore Burr Grinder',
            category: 'gear',
            basePrice: 169.00,
            notes: 'Consistent • Versatile • Reliable',
            image: 'images/Baratza_Encore_750x_b5c6d7e8.png',
            url: 'gear.html'
        },
        
        // =====================================
        // MERCH
        // =====================================
        'diner-mug': {
            name: 'Level Up Diner Mug',
            category: 'merch',
            basePrice: 16.00,
            notes: 'Classic • Durable • 12oz',
            image: 'images/Rose_Horsehoe_Diner_Mug_Knockout_750x_88c9a571.png',
            url: 'gear.html'
        },
        
        // =====================================
        // BUNDLES
        // =====================================
        'blend-trio': {
            name: 'Stumptown Blend Trio',
            category: 'bundle',
            basePrice: 99.50,
            originalPrice: 111.00,
            notes: '3 Bags • Save 10%',
            image: 'images/Blend_Trio_Bags_72_750x_d373d66c.png',
            url: 'gift-guide.html'
        }
    }
};

// ============================================
// HELPER FUNCTIONS (Don't modify these)
// ============================================

function roundToNiceCents(price) {
    // Round to nearest "nice" cents: .00, .25, .50, .75
    const dollars = Math.floor(price);
    const cents = (price - dollars) * 100;
    
    let niceCents;
    if (cents < 12.5) {
        niceCents = 0;
    } else if (cents < 37.5) {
        niceCents = 25;
    } else if (cents < 62.5) {
        niceCents = 50;
    } else if (cents < 87.5) {
        niceCents = 75;
    } else {
        niceCents = 0;
        return dollars + 1; // Round up to next dollar
    }
    
    return dollars + (niceCents / 100);
}

/**
 * Get full product configuration for a product page
 * Usage: const PRODUCT_CONFIG = getProductConfig('hair-bender');
 */
function getProductConfig(productId) {
    const product = PRICING_CONFIG.products[productId];
    if (!product) {
        console.error('Product not found:', productId);
        return null;
    }
    
    // Build sizes object with calculated prices (only for coffee products)
    const sizes = {};
    const hasSizes = ['blend', 'single', 'decaf'].includes(product.category);
    
    if (hasSizes) {
        for (const [sizeKey, sizeInfo] of Object.entries(PRICING_CONFIG.sizeMultipliers)) {
            sizes[sizeKey] = {
                label: sizeInfo.label,
                price: roundToNiceCents(product.basePrice * sizeInfo.multiplier)
            };
        }
    }
    
    return {
        id: productId,
        name: product.name,
        category: product.category,
        basePrice: product.basePrice,
        notes: product.notes,
        image: product.image,
        url: product.url,
        sizes: hasSizes ? sizes : null,
        subscriptionDiscount: PRICING_CONFIG.subscriptionDiscount
    };
}

/**
 * Get display price for listing pages (12oz base price)
 * Usage: getDisplayPrice('hair-bender') returns 37.00
 */
function getDisplayPrice(productId) {
    const product = PRICING_CONFIG.products[productId];
    return product ? product.basePrice : 0;
}

/**
 * Get price for a specific size
 * Usage: getPriceForSize('hair-bender', '2lb') returns 87.00
 */
function getPriceForSize(productId, size) {
    const product = PRICING_CONFIG.products[productId];
    if (!product) return 0;
    
    const multiplier = PRICING_CONFIG.sizeMultipliers[size];
    if (!multiplier) return product.basePrice;
    
    return roundToNiceCents(product.basePrice * multiplier.multiplier);
}

/**
 * Get subscription price (10% discount)
 * Usage: getSubscriptionPrice(37.00) returns 33.25
 */
function getSubscriptionPrice(price) {
    return roundToNiceCents(price * (1 - PRICING_CONFIG.subscriptionDiscount));
}

/**
 * Get all products with their display prices
 * Useful for dynamically generating product listings
 */
function getAllProductPrices() {
    const prices = {};
    for (const [id, product] of Object.entries(PRICING_CONFIG.products)) {
        prices[id] = {
            name: product.name,
            category: product.category,
            price: product.basePrice,
            sizes: {}
        };
        
        // Only add sizes for coffee products
        if (['blend', 'single', 'decaf'].includes(product.category)) {
            for (const [sizeKey, sizeInfo] of Object.entries(PRICING_CONFIG.sizeMultipliers)) {
                prices[id].sizes[sizeKey] = roundToNiceCents(product.basePrice * sizeInfo.multiplier);
            }
        }
    }
    return prices;
}

/**
 * Get products by category
 */
function getProductsByCategory(category) {
    const products = [];
    for (const [id, product] of Object.entries(PRICING_CONFIG.products)) {
        if (product.category === category) {
            products.push({ id, ...product });
        }
    }
    return products;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.PRICING_CONFIG = PRICING_CONFIG;
    window.getProductConfig = getProductConfig;
    window.getDisplayPrice = getDisplayPrice;
    window.getPriceForSize = getPriceForSize;
    window.getSubscriptionPrice = getSubscriptionPrice;
    window.getAllProductPrices = getAllProductPrices;
    window.getProductsByCategory = getProductsByCategory;
    window.roundToNiceCents = roundToNiceCents;
}
