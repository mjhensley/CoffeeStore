// Grainhouse Coffee - Complete Product Catalog
// All prices include 150% markup from wholesale cost for healthy profit margin

// Round price to "nice" cents values: .00, .25, .50, .75
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

// =====================================================
// CENTRALIZED PRICING - Uses product-pricing.js when available
// =====================================================
// Size pricing multipliers - synced with product-pricing.js
const SIZE_OPTIONS = (typeof PRICING_CONFIG !== 'undefined') 
    ? {
        "12oz": { label: PRICING_CONFIG.sizeMultipliers['12oz'].label, multiplier: PRICING_CONFIG.sizeMultipliers['12oz'].multiplier, weight: 12 },
        "2lb": { label: PRICING_CONFIG.sizeMultipliers['2lb'].label, multiplier: PRICING_CONFIG.sizeMultipliers['2lb'].multiplier, weight: 32 },
        "5lb": { label: PRICING_CONFIG.sizeMultipliers['5lb'].label, multiplier: PRICING_CONFIG.sizeMultipliers['5lb'].multiplier, weight: 80 }
    }
    : {
        "12oz": { label: "12 oz", multiplier: 1, weight: 12 },
        "2lb": { label: "2 lb", multiplier: 2.35, weight: 32 },
        "5lb": { label: "5 lb", multiplier: 5.25, weight: 80 }
    };

// Ground coffee size options (smaller sizes only)
const GROUND_SIZE_OPTIONS = {
    "12oz": { label: "12 oz Ground", multiplier: 1, weight: 12 }
};

// Subscription discount - synced with product-pricing.js
const SUBSCRIPTION_DISCOUNT = (typeof PRICING_CONFIG !== 'undefined') 
    ? PRICING_CONFIG.subscriptionDiscount 
    : 0.10;

// Subscription frequency options
const SUBSCRIPTION_FREQUENCIES = [
    { value: "1week", label: "Every Week" },
    { value: "2weeks", label: "Every 2 Weeks" },
    { value: "3weeks", label: "Every 3 Weeks" },
    { value: "4weeks", label: "Every 4 Weeks" }
];

const GRAINHOUSE_PRODUCTS = {
    // =====================================
    // SIGNATURE BLENDS
    // =====================================
    blends: [
        {
            id: "hair-bender",
            name: "Hair Bender",
            category: "blend",
            price: 37.00,
            originalPrice: 37.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Citrus • Dark Chocolate • Raisin",
            description: "The iconic blend that started it all. Sweet and balanced with complex layers perfect for espresso and daily brews.",
            roast: "Medium",
            origin: "Latin America & Africa",
            badge: "bestseller",
            rarity: "🔒 Limited Reserve • Micro-Lot Selection",
            image: "images/Hair-Bender_e0a4e119-c201-4e7a-bf1c-f4cc4ae240e1_750x_2b77870c.png",
            flavorProfile: { sweet: 4, bright: 3, body: 4, complexity: 5 },
            caffeineLevel: "Medium-High",
            pairings: ["Dark chocolate", "Croissants", "Banana bread"],
            brewMethods: ["Espresso", "Pour Over", "Drip"]
        },
        {
            id: "holler-mountain",
            name: "Holler Mountain",
            category: "blend",
            price: 38.75,
            originalPrice: 39.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Citrus • Caramel • Berry Jam",
            description: "Our hometown favorite since day one. Creamy, sweet, and endlessly drinkable organic blend.",
            roast: "Medium",
            origin: "Latin America & Africa",
            badge: "bestseller",
            rarity: "⭐ Single Estate • 200 Bags/Season",
            image: "images/5lb_HollerMtn_750x_020a6823.png",
            flavorProfile: { sweet: 5, bright: 3, body: 4, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Maple syrup", "Waffles", "Oatmeal"],
            brewMethods: ["Drip", "Pour Over", "French Press"]
        },
        {
            id: "french-roast",
            name: "French Roast",
            category: "blend",
            price: 33.25,
            originalPrice: 35.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Smoky • Bittersweet • Bold",
            description: "Deep, smoky, and unapologetically bold. Our darkest roast for those who like it intense.",
            roast: "Dark",
            origin: "Latin America",
            badge: null,
            rarity: "🔥 Bold & Intense • Classic Dark Roast",
            image: "images/SCR_French_750x_a3188d26.png",
            flavorProfile: { sweet: 2, bright: 1, body: 5, complexity: 3 },
            caffeineLevel: "Medium",
            pairings: ["Dark chocolate", "Steak", "Cheese"],
            brewMethods: ["French Press", "Drip", "Cold Brew"]
        },
        {
            id: "founders-blend",
            name: "Founder's Blend",
            category: "blend",
            price: 35.00,
            originalPrice: 37.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Milk Chocolate • Caramel • Stone Fruit",
            description: "The blend that launched our roastery. Balanced and approachable with hints of milk chocolate and stone fruit.",
            roast: "Medium",
            origin: "Central & South America",
            badge: null,
            rarity: "🏛️ Heritage Recipe • Founder's Vision",
            image: "images/SCR_Founders_750x_6bcb2680.png",
            flavorProfile: { sweet: 4, bright: 3, body: 3, complexity: 3 },
            caffeineLevel: "Medium",
            pairings: ["Toast", "Butter cookies", "Croissants"],
            brewMethods: ["Drip", "Pour Over", "AeroPress"]
        },
        {
            id: "homestead",
            name: "Homestead",
            category: "blend",
            price: 35.00,
            originalPrice: 37.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Brown Sugar • Graham • Cherry",
            description: "Comforting and familiar. A cozy blend that feels like home with brown sugar sweetness.",
            roast: "Medium",
            origin: "Latin America & Africa",
            badge: null,
            rarity: "🏠 Comfort Classic • Everyday Favorite",
            image: "images/SCR_Homstead_750x_1af31438.png",
            flavorProfile: { sweet: 4, bright: 2, body: 4, complexity: 3 },
            caffeineLevel: "Medium",
            pairings: ["Apple pie", "Cinnamon rolls", "Granola"],
            brewMethods: ["Drip", "Pour Over", "French Press"]
        },
        {
            id: "hundred-mile",
            name: "Hundred Mile",
            category: "blend",
            price: 35.00,
            originalPrice: 37.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Maple • Walnut • Cocoa",
            description: "Named for the Pacific Northwest's spirit. Rich maple sweetness with toasted walnut notes.",
            roast: "Medium-Dark",
            origin: "Latin America",
            badge: null,
            rarity: "🌲 Pacific Northwest • Regional Tribute",
            image: "images/SCR_Hundred_Mile_750x_c7b81bcb.png",
            flavorProfile: { sweet: 4, bright: 2, body: 5, complexity: 3 },
            caffeineLevel: "Medium",
            pairings: ["Pancakes", "Maple bacon", "Pecans"],
            brewMethods: ["Drip", "French Press", "Cold Brew"]
        },
        {
            id: "evergreen",
            name: "Evergreen",
            category: "blend",
            price: 35.00,
            originalPrice: 37.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Dark Chocolate • Toffee • Hazelnut",
            description: "Year-round excellence. A versatile blend with dark chocolate depth and toffee sweetness.",
            roast: "Medium",
            origin: "Central America & Indonesia",
            badge: "new",
            rarity: "🌲 All-Season • Versatile Excellence",
            image: "images/SCR_Evergreen_72_750x_d2e8f1a3.png",
            flavorProfile: { sweet: 4, bright: 2, body: 4, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Hazelnut biscotti", "Tiramisu", "Dark chocolate"],
            brewMethods: ["Espresso", "Drip", "Pour Over"]
        }
    ],

    // =====================================
    // SINGLE ORIGINS
    // =====================================
    singleOrigins: [
        {
            id: "ethiopia-mordecofe",
            name: "Ethiopia Mordecofe",
            category: "single",
            price: 44.75,
            originalPrice: 45.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Nectarine • Melon • Jasmine",
            description: "A complex and floral cup, sparkling with notes of stone fruit and jasmine from the birthplace of coffee.",
            roast: "Light",
            origin: "Ethiopia, Yirgacheffe",
            altitude: "1,850-2,100m",
            process: "Washed",
            badge: "new",
            rarity: "🏆 Competition Grade • Only 85 Bags Imported",
            image: "images/Ethiopia_Mordecofe_72DPI_750x_8f486bfc.png",
            flavorProfile: { sweet: 4, bright: 5, body: 2, complexity: 5 },
            caffeineLevel: "Medium-High",
            pairings: ["Lemon cake", "Fresh berries", "Honey"],
            brewMethods: ["Pour Over", "Chemex", "AeroPress"]
        },
        {
            id: "ethiopia-duromina",
            name: "Ethiopia Duromina",
            category: "single",
            price: 42.00,
            originalPrice: 45.00,
            size: "12oz",
            notes: "Peach • Bergamot • Honey",
            description: "Exceptional cooperative coffee with layers of stone fruit and Earl Grey-like bergamot.",
            roast: "Light",
            origin: "Ethiopia, Jimma",
            altitude: "1,900-2,100m",
            process: "Washed",
            badge: null,
            rarity: "💎 Ultra Rare • 50 Bags Worldwide",
            image: "images/Ethiopia_Duromina_2023_750x_de0f539e.png",
            flavorProfile: { sweet: 5, bright: 4, body: 2, complexity: 5 },
            caffeineLevel: "Medium",
            pairings: ["Earl Grey tea cake", "Peaches", "Honey toast"],
            brewMethods: ["Pour Over", "Chemex", "V60"]
        },
        {
            id: "ethiopia-suke-quto",
            name: "Ethiopia Suke Quto",
            category: "single",
            price: 44.00,
            originalPrice: 47.00,
            size: "12oz",
            notes: "Blueberry • Lavender • Cream",
            description: "Extraordinary natural process coffee bursting with blueberry intensity and floral cream.",
            roast: "Light",
            origin: "Ethiopia, Guji",
            altitude: "2,000-2,200m",
            process: "Natural",
            badge: null,
            rarity: "👑 Collector's Reserve • 92+ Cup Score",
            image: "images/Ethiopia_SukeQuto_72_750x_67712917.png",
            flavorProfile: { sweet: 5, bright: 4, body: 3, complexity: 5 },
            caffeineLevel: "Medium-High",
            pairings: ["Blueberry muffins", "Lavender scones", "Yogurt"],
            brewMethods: ["Pour Over", "AeroPress", "Clever Dripper"]
        },
        {
            id: "guatemala-injerto",
            name: "Guatemala El Injerto Bourbon",
            category: "single",
            price: 38.00,
            originalPrice: 49.00,
            size: "12oz",
            notes: "Honey • Almond • Orange Blossom",
            description: "From the legendary Aguirre family estate. Silky bourbon variety with honey sweetness.",
            roast: "Medium-Light",
            origin: "Guatemala, Huehuetenango",
            altitude: "1,500-1,800m",
            process: "Washed",
            badge: null,
            rarity: "🌿 Family Estate • 4th Generation Growers",
            image: "images/Guatemala_Injerto_72DPI_750x_c85f78cb.png",
            flavorProfile: { sweet: 5, bright: 3, body: 3, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Almond croissants", "Orange marmalade", "Honey cake"],
            brewMethods: ["Pour Over", "Drip", "French Press"]
        },
        {
            id: "guatemala-bella-vista",
            name: "Guatemala Bella Vista",
            category: "single",
            price: 41.00,
            originalPrice: 45.00,
            size: "12oz",
            notes: "Brown Sugar • Hazelnut • Plum",
            description: "Volcanic terroir excellence from the slopes of Acatenango. Complex and layered.",
            roast: "Medium",
            origin: "Guatemala, Acatenango",
            altitude: "1,600-1,900m",
            process: "Washed",
            badge: null,
            rarity: "🌋 Volcanic Terroir • Once-a-Year Harvest",
            image: "images/BellaVistaShopify2024_750x_2fd3a0c4.png",
            flavorProfile: { sweet: 4, bright: 3, body: 4, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Hazelnut cookies", "Plum tart", "Brown butter cake"],
            brewMethods: ["Pour Over", "Drip", "Espresso"]
        },
        {
            id: "colombia-el-jordan",
            name: "Colombia El Jordan",
            category: "single",
            price: 39.00,
            originalPrice: 43.00,
            size: "12oz",
            notes: "Red Apple • Vanilla • Caramel",
            description: "Award-winning micro-lot with apple-like brightness and vanilla cream finish.",
            roast: "Medium",
            origin: "Colombia, Huila",
            altitude: "1,700-1,900m",
            process: "Washed",
            badge: null,
            rarity: "🔥 Award-Winning • Top 1% Colombian Harvest",
            image: "images/Colombia_El_Jordan_72_1_750x_0e747188.png",
            flavorProfile: { sweet: 4, bright: 4, body: 3, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Apple pie", "Vanilla ice cream", "Caramel desserts"],
            brewMethods: ["Pour Over", "Drip", "AeroPress"]
        },
        {
            id: "colombia-cantillo",
            name: "Colombia Cantillo Family",
            category: "single",
            price: 41.00,
            originalPrice: 43.00,
            size: "12oz",
            notes: "Grape • Panela • Cocoa",
            description: "Third-generation family farm producing exceptional lots with grape-like sweetness.",
            roast: "Medium",
            origin: "Colombia, Nariño",
            altitude: "1,800-2,000m",
            process: "Washed",
            badge: null,
            rarity: "👨‍👩‍👧 Family Legacy • 3rd Generation",
            image: "images/STC-Shopify-Colombia-Cantillo_Product-Image-Transparent-PNG_EDIT_750x_9b0b6529.png",
            flavorProfile: { sweet: 4, bright: 3, body: 4, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Grapes", "Dark chocolate", "Caramel"],
            brewMethods: ["Pour Over", "Drip", "French Press"]
        },
        {
            id: "costa-rica-montes",
            name: "Costa Rica Montes de Oro",
            category: "single",
            price: 43.00,
            originalPrice: 45.00,
            size: "12oz",
            notes: "Tangerine • Cane Sugar • Almond",
            description: "From the Golden Mountains region. Bright citrus notes balanced with nutty sweetness.",
            roast: "Medium-Light",
            origin: "Costa Rica, West Valley",
            altitude: "1,200-1,500m",
            process: "Honey",
            badge: "new",
            rarity: "🏔️ Golden Mountains • Honey Processed",
            image: "images/SCR_CR_MontesOro_Knockout_72_750x_874f512b.png",
            flavorProfile: { sweet: 4, bright: 4, body: 3, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Orange scones", "Almond cake", "Tropical fruits"],
            brewMethods: ["Pour Over", "V60", "Chemex"]
        },
        {
            id: "indonesia-bies",
            name: "Indonesia Bies Penantan",
            category: "single",
            price: 40.00,
            originalPrice: 45.00,
            size: "12oz",
            notes: "Cedar • Dark Chocolate • Spice",
            description: "Sumatran excellence with earthy depth, chocolate richness, and exotic spice notes.",
            roast: "Medium-Dark",
            origin: "Indonesia, Sumatra",
            altitude: "1,400-1,600m",
            process: "Wet-Hulled",
            badge: null,
            rarity: "🏔️ High Altitude Exclusive • Single Farmer",
            image: "images/Indo_Beis_Penantan_72DPI_750x_6c1c5ea9.png",
            flavorProfile: { sweet: 3, bright: 1, body: 5, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Dark chocolate", "Spiced cookies", "Cheese"],
            brewMethods: ["French Press", "Drip", "Cold Brew"]
        },
        {
            id: "honduras-puente",
            name: "Honduras El Puente",
            category: "single",
            price: 39.00,
            originalPrice: 41.00,
            size: "12oz",
            notes: "Toffee • Orange • Milk Chocolate",
            description: "Direct trade excellence. Sweet toffee notes with bright orange acidity.",
            roast: "Medium",
            origin: "Honduras, Copán",
            altitude: "1,400-1,700m",
            process: "Washed",
            badge: null,
            rarity: "🌉 Direct Trade • Community Supported",
            image: "images/SCR_Honduras_Puente_72_750x_99fad396.png",
            flavorProfile: { sweet: 4, bright: 3, body: 3, complexity: 3 },
            caffeineLevel: "Medium",
            pairings: ["Toffee", "Orange chocolate", "Pastries"],
            brewMethods: ["Drip", "Pour Over", "AeroPress"]
        },
        {
            id: "roasters-pick",
            name: "Roaster's Pick",
            category: "single",
            price: 39.00,
            originalPrice: 41.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Seasonal • Rotating Selection",
            description: "Our head roaster's current favorite. Changes seasonally based on what's exceptional.",
            roast: "Varies",
            origin: "Rotating",
            badge: "new",
            rarity: "🎯 Roaster's Choice • Seasonal Selection",
            image: "images/SCR_RoastersPick_72_750x_e8f9a1b2.png",
            flavorProfile: { sweet: 4, bright: 4, body: 3, complexity: 4 },
            caffeineLevel: "Medium",
            pairings: ["Varies by selection"],
            brewMethods: ["Pour Over", "Drip", "AeroPress"]
        }
    ],

    // =====================================
    // DECAF
    // =====================================
    decaf: [
        {
            id: "trapper-creek-decaf",
            name: "Trapper Creek Decaf",
            category: "decaf",
            price: 39.50,
            originalPrice: 43.00,
            size: "12oz",
            sizes: ["12oz", "2lb", "5lb"],
            grindOptions: ["Whole Bean", "Ground"],
            subscribable: true,
            notes: "Citrus • Graham • Cocoa",
            description: "Swiss Water Process decaf that doesn't compromise on flavor. Full-bodied with dessert notes.",
            roast: "Medium",
            origin: "Latin America",
            process: "Swiss Water Decaf",
            badge: null,
            rarity: "✨ Rare Swiss Water • Hand-Selected Lots",
            image: "images/SCR_Trapper_750x_c5bcc4b8.png",
            flavorProfile: { sweet: 4, bright: 2, body: 4, complexity: 3 },
            caffeineLevel: "Decaf (<3mg)",
            pairings: ["Graham crackers", "Chocolate", "Evening desserts"],
            brewMethods: ["Drip", "Pour Over", "French Press"]
        }
    ],

    // =====================================
    // COLD BREW
    // =====================================
    coldBrew: [
        {
            id: "cold-brew-concentrate",
            name: "Cold Brew Concentrate",
            category: "cold-brew",
            price: 28.25,
            originalPrice: 29.25,
            size: "25.4oz",
            notes: "Rich • Smooth • Chocolatey",
            description: "Double-strength cold brew. Steeped for 16 hours for maximum smoothness. Dilute 1:1.",
            roast: "Medium",
            badge: null,
            rarity: "🧊 Small Batch • 16-Hour Steep",
            image: "images/25.4_oz_Cold_Brew_Concentrate_Shopify_750x_8f671eee.png",
            flavorProfile: { sweet: 3, bright: 1, body: 5, complexity: 3 },
            caffeineLevel: "High (when diluted)",
            pairings: ["Ice cream", "Milk", "Cream"],
            brewMethods: ["Ready to drink", "Over ice"]
        },
        {
            id: "cold-brew-original",
            name: "Original Cold Brew",
            category: "cold-brew",
            price: 8.75,
            originalPrice: 9.75,
            size: "10.5oz",
            notes: "Smooth • Bold • Refreshing",
            description: "Ready-to-drink cold brew. Pure coffee, nothing added. Grab and go perfection.",
            roast: "Medium",
            badge: "bestseller",
            rarity: "🎯 Ready to Drink • Grab & Go",
            image: "images/Original-Cold-Brew-Stubby-label_1_750x_23d39a6a.png",
            flavorProfile: { sweet: 3, bright: 2, body: 4, complexity: 3 },
            caffeineLevel: "High",
            pairings: ["On its own", "Over ice"],
            brewMethods: ["Ready to drink"]
        },
        {
            id: "cold-brew-decaf",
            name: "Cold Brew Decaf",
            category: "cold-brew",
            price: 28.25,
            originalPrice: 29.25,
            size: "25.4oz",
            notes: "Smooth • Mellow • Relaxing",
            description: "All the cold brew smoothness without the caffeine. Swiss Water processed.",
            roast: "Medium",
            badge: null,
            rarity: "😴 Evening Sipper • Swiss Water Decaf",
            image: "images/ColdBrew_Decaf_Concentrate_750x_d4e5f6a7.png",
            flavorProfile: { sweet: 3, bright: 1, body: 4, complexity: 2 },
            caffeineLevel: "Decaf",
            pairings: ["Evening desserts", "Late night"],
            brewMethods: ["Ready to drink", "Over ice"]
        },
        {
            id: "cold-brew-nitro",
            name: "Hair Bender Nitro Cold Brew",
            category: "cold-brew",
            price: 9.75,
            originalPrice: 9.75,
            size: "11oz",
            notes: "Creamy • Cascading • Silky",
            description: "Nitrogen-infused cold brew with a creamy, stout-like cascade. No dairy needed.",
            roast: "Medium",
            badge: "new",
            rarity: "🫧 Nitro Infused • Creamy Cascade",
            image: "images/Nitro_HairBender_750x_a8b9c0d1.png",
            flavorProfile: { sweet: 4, bright: 1, body: 5, complexity: 3 },
            caffeineLevel: "High",
            pairings: ["On its own", "Desserts"],
            brewMethods: ["Ready to drink"]
        },
        {
            id: "cold-brew-oatly-original",
            name: "Cold Brew with Oatly (Original)",
            category: "cold-brew",
            price: 10.75,
            originalPrice: 11.75,
            size: "11oz",
            notes: "Creamy • Oat • Balanced",
            description: "Cold brew meets oat milk. Plant-based perfection in a can.",
            roast: "Medium",
            badge: null,
            rarity: "🌾 Plant-Based • Oatly Partnership",
            image: "images/ColdBrew_Oatly_Original_750x_e2f3a4b5.png",
            flavorProfile: { sweet: 4, bright: 1, body: 4, complexity: 2 },
            caffeineLevel: "Medium",
            pairings: ["On its own", "Breakfast"],
            brewMethods: ["Ready to drink"]
        },
        {
            id: "cold-brew-oatly-chocolate",
            name: "Cold Brew with Oatly (Chocolate)",
            category: "cold-brew",
            price: 10.75,
            originalPrice: 11.75,
            size: "11oz",
            notes: "Chocolate • Creamy • Sweet",
            description: "Chocolate cold brew latte in a can. Indulgent and refreshing.",
            roast: "Medium",
            badge: null,
            rarity: "🍫 Chocolate Indulgence • Oatly Blend",
            image: "images/ColdBrew_Oatly_Chocolate_750x_f5a6b7c8.png",
            flavorProfile: { sweet: 5, bright: 1, body: 4, complexity: 2 },
            caffeineLevel: "Medium",
            pairings: ["Dessert", "Afternoon treat"],
            brewMethods: ["Ready to drink"]
        },
        {
            id: "ethiopia-cold-brew",
            name: "Ethiopia Cold Brew Concentrate",
            category: "cold-brew",
            price: 31.25,
            originalPrice: 33.25,
            size: "25.4oz",
            notes: "Floral • Bright • Fruity",
            description: "Single origin cold brew from Ethiopian beans. Bright and floral, even cold.",
            roast: "Light-Medium",
            badge: null,
            rarity: "🌸 Single Origin • Floral Cold Brew",
            image: "images/Ethiopia_ColdBrew_Concentrate_750x_d9e0f1a2.png",
            flavorProfile: { sweet: 4, bright: 4, body: 3, complexity: 4 },
            caffeineLevel: "High",
            pairings: ["Fruit", "Light pastries"],
            brewMethods: ["Over ice", "Dilute 1:1"]
        },
        {
            id: "french-roast-cold-brew",
            name: "French Roast Cold Brew Concentrate",
            category: "cold-brew",
            price: 29.25,
            originalPrice: 31.25,
            size: "25.4oz",
            notes: "Bold • Smoky • Intense",
            description: "For dark roast lovers. Extra bold cold brew with smoky depth.",
            roast: "Dark",
            badge: null,
            rarity: "🔥 Extra Bold • Dark Roast Lovers",
            image: "images/FrenchRoast_ColdBrew_750x_b3c4d5e6.png",
            flavorProfile: { sweet: 2, bright: 1, body: 5, complexity: 3 },
            caffeineLevel: "High",
            pairings: ["Strong flavors", "Dark chocolate"],
            brewMethods: ["Over ice", "Dilute 1:1"]
        }
    ],

    // =====================================
    // COFFEE GEAR
    // =====================================
    gear: [
        {
            id: "aeropress",
            name: "AeroPress Coffee Maker",
            category: "gear",
            price: 39.95,
            originalPrice: 40.00,
            notes: "Portable • Versatile • Quick",
            description: "The ultimate travel brewer. Makes smooth, rich coffee in about a minute.",
            image: "images/Aeropress_White_2025_8_NoFunnel_750x_a7ae74b8.png",
            rarity: "🏆 Essential Gear • Cult Favorite"
        },
        {
            id: "aeropress-filters",
            name: "AeroPress Filters (350 Pack)",
            category: "gear",
            price: 8.95,
            originalPrice: 9.00,
            notes: "Clean • Crisp • Essential",
            description: "Premium paper filters for clean, grit-free AeroPress brews.",
            image: "images/Aeropress_Filters_750x_b8c9d0e1.png",
            rarity: "📦 Bulk Pack • Year's Supply"
        },
        {
            id: "chemex-6cup",
            name: "Chemex 6-Cup Brewer",
            category: "gear",
            price: 49.95,
            originalPrice: 50.00,
            notes: "Elegant • Clean • Classic",
            description: "Iconic pour over brewer with beautiful design. Makes exceptionally clean coffee.",
            image: "images/Chemex_Wood_Collar_750x_c9d0e1f2.png",
            rarity: "🎨 Design Icon • MoMA Collection"
        },
        {
            id: "chemex-filters",
            name: "Chemex Filters (100 Pack)",
            category: "gear",
            price: 14.95,
            originalPrice: 15.00,
            notes: "Thick • Clean • Essential",
            description: "Bonded paper filters for the cleanest possible Chemex brew.",
            image: "images/Chemex_Filters_Square_750x_d0e1f2a3.png",
            rarity: "📦 Stock Up • Essential Supply"
        },
        {
            id: "hario-v60",
            name: "Hario V60 Ceramic Dripper",
            category: "gear",
            price: 26.00,
            originalPrice: 27.00,
            notes: "Precision • Control • Classic",
            description: "The barista's choice for pour over. Spiral ribs allow maximum bloom.",
            image: "images/Origami_Dripper_1_750x_18501aad.png",
            rarity: "☕ Pro's Choice • Competition Standard"
        },
        {
            id: "hario-v60-filters",
            name: "Hario V60 Filters (100 Pack)",
            category: "gear",
            price: 8.95,
            originalPrice: 9.00,
            notes: "Thin • Fast • Clean",
            description: "Tabbed filters for easy brewing. Designed for optimal flow rate.",
            image: "images/Hario_V60_Filters_750x_f2a3b4c5.png",
            rarity: "📦 Essential • Perfect Fit"
        },
        {
            id: "hario-kettle",
            name: "Hario Buono Electric Kettle",
            category: "gear",
            price: 95.00,
            originalPrice: 95.00,
            notes: "Precise • Gooseneck • Temperature Control",
            description: "Precision pour with variable temperature control. The pour over essential.",
            image: "images/Hario_Buono_Isolated_750x_91da4d09.png",
            rarity: "🎯 Pro Equipment • Temperature Precision"
        },
        {
            id: "hario-grinder",
            name: "Hario Mini Mill Plus Hand Grinder",
            category: "gear",
            price: 39.95,
            originalPrice: 40.00,
            notes: "Portable • Consistent • Quiet",
            description: "Premium hand grinder for fresh grounds anywhere. Ceramic burrs.",
            image: "images/Hario_Mini_Mill_750x_a4b5c6d7.png",
            rarity: "✈️ Travel Essential • Ceramic Burrs"
        },
        {
            id: "baratza-encore",
            name: "Baratza Encore Burr Grinder",
            category: "gear",
            price: 169.00,
            originalPrice: 170.00,
            notes: "Consistent • Versatile • Reliable",
            description: "The home barista's go-to grinder. 40 grind settings from espresso to French press.",
            image: "images/Baratza_Encore_750x_b5c6d7e8.png",
            rarity: "🏆 Best Seller • Home Barista Essential"
        },
        {
            id: "kalita-wave",
            name: "Kalita Wave Stainless Steel",
            category: "gear",
            price: 44.00,
            originalPrice: 44.00,
            notes: "Flat Bottom • Forgiving • Consistent",
            description: "Forgiving flat-bottom dripper. More consistent than cone brewers.",
            image: "images/Kalita_Wave_Stainless_750x_c6d7e8f9.png",
            rarity: "🌊 Flat Bottom • Beginner Friendly"
        },
        {
            id: "kalita-filters",
            name: "Kalita Wave Filters (100 Pack)",
            category: "gear",
            price: 12.00,
            originalPrice: 12.00,
            notes: "Wave • Flat • Essential",
            description: "Wave-style filters for the Kalita dripper. Flat bottom design.",
            image: "images/Kalita_Filters_750x_d7e8f9a0.png",
            rarity: "📦 Perfect Waves • Essential Supply"
        },
        {
            id: "french-press",
            name: "Bodum French Press (8 Cup)",
            category: "gear",
            price: 39.95,
            originalPrice: 40.00,
            notes: "Classic • Full-Bodied • Simple",
            description: "The classic immersion brewer. Full-bodied coffee with natural oils.",
            image: "images/Bodum_FrenchPress_750x_e8f9a0b1.png",
            rarity: "🏛️ Timeless Classic • Full Immersion"
        },
        {
            id: "bonavita-brewer",
            name: "Bonavita Connoisseur 8-Cup Brewer",
            category: "gear",
            price: 169.00,
            originalPrice: 170.00,
            notes: "SCA Certified • Consistent • Hands-Off",
            description: "SCA-certified automatic drip. Brews to specialty coffee standards.",
            image: "images/Bonavita_Connoisseur_750x_f9a0b1c2.png",
            rarity: "🏅 SCA Certified • Gold Standard"
        },
        {
            id: "ratio-six",
            name: "Ratio Six Brewer",
            category: "gear",
            price: 349.00,
            originalPrice: 350.00,
            notes: "Premium • Precise • Beautiful",
            description: "The pinnacle of automatic brewing. Blooming pour over in a machine.",
            image: "images/Ratio_Six_Black_750x_a0b1c2d3.png",
            rarity: "💎 Ultra Premium • Design Excellence"
        },
        {
            id: "oxo-cold-brewer",
            name: "OXO Compact Cold Brewer",
            category: "gear",
            price: 29.95,
            originalPrice: 30.00,
            notes: "Easy • Compact • Delicious",
            description: "Compact cold brew maker with rainmaker water distribution.",
            image: "images/OXO_ColdBrewer_750x_b1c2d3e4.png",
            rarity: "❄️ Cold Brew • Compact Design"
        },
        {
            id: "scale",
            name: "Precision Coffee Scale",
            category: "gear",
            price: 29.95,
            originalPrice: 30.00,
            notes: "Accurate • Timer • Essential",
            description: "0.1g precision with built-in timer. The key to consistent brewing.",
            image: "images/Scale_750x_c2d3e4f5.png",
            rarity: "⚖️ Precision Tool • Barista Essential"
        },
        {
            id: "origami-dripper",
            name: "Origami Dripper (Sakura Pink)",
            category: "gear",
            price: 46.00,
            originalPrice: 46.00,
            notes: "Beautiful • Versatile • Japanese",
            description: "Handmade Mino-yaki ceramic dripper. Works with flat or cone filters.",
            image: "images/Origami_Sakura_750x_d3e4f5a6.png",
            rarity: "🌸 Artisan Made • Mino-yaki Ceramic"
        },
        {
            id: "origami-filters",
            name: "Origami Filters Medium (100 Pack)",
            category: "gear",
            price: 9.95,
            originalPrice: 10.00,
            notes: "Compatible • Quality • Essential",
            description: "Premium filters designed specifically for the Origami dripper.",
            image: "images/Origami_Filters_750x_e4f5a6b7.png",
            rarity: "📦 Perfect Match • Japanese Quality"
        }
    ],

    // =====================================
    // MERCH
    // =====================================
    merch: [
        {
            id: "diner-mug",
            name: "Level Up Diner Mug",
            category: "merch",
            price: 16.00,
            originalPrice: 16.00,
            notes: "Classic • Durable • 12oz",
            description: "Retro diner-style mug with our signature design. Heavy-duty ceramic.",
            image: "images/Rose_Horsehoe_Diner_Mug_Knockout_750x_88c9a571.png",
            rarity: "☕ Fan Favorite • Heavy Ceramic"
        },
        {
            id: "rose-gold-mug",
            name: "Rose Gold Diner Mug",
            category: "merch",
            price: 17.00,
            originalPrice: 17.00,
            notes: "Elegant • Limited • 12oz",
            description: "Limited edition rose gold accent mug. The prettiest cup in your cabinet.",
            image: "images/Mug_RoseGold_750x_a6b7c8d9.png",
            rarity: "✨ Limited Edition • Rose Gold"
        },
        {
            id: "kinto-tumbler",
            name: "Kinto Later Gator Tumbler",
            category: "merch",
            price: 35.00,
            originalPrice: 35.00,
            notes: "Insulated • 12oz • Travel",
            description: "Double-wall insulated tumbler. Keeps coffee hot for hours.",
            image: "images/Kinto_LaterGator_750x_b7c8d9e0.png",
            rarity: "🐊 Collab • Double Wall Insulated"
        },
        {
            id: "kinto-mug",
            name: "Kinto Love All Around Mug",
            category: "merch",
            price: 29.95,
            originalPrice: 30.00,
            notes: "Ceramic • Beautiful • 10oz",
            description: "Handcrafted ceramic mug with love-themed design. Made in Japan.",
            image: "images/Kinto_LoveAllAround_750x_c8d9e0f1.png",
            rarity: "💕 Japanese Craft • Limited"
        },
        {
            id: "fellow-mug",
            name: "Fellow Waxwing Poetics Mug",
            category: "merch",
            price: 35.00,
            originalPrice: 35.00,
            notes: "Premium • 16oz • Double Wall",
            description: "Premium Fellow collab mug with double-wall ceramic and unique design.",
            image: "images/Fellow_Waxwing_750x_d9e0f1a2.png",
            rarity: "🎨 Fellow Collab • Artisan Design"
        },
        {
            id: "tote-bag",
            name: "Lady Luck Tote",
            category: "merch",
            price: 25.00,
            originalPrice: 25.00,
            notes: "Canvas • Durable • Stylish",
            description: "Heavy-duty canvas tote with our Lady Luck design. Farmers market ready.",
            image: "images/Tote_LadyLuck_750x_e0f1a2b3.png",
            rarity: "♣️ Heavy Canvas • Market Ready"
        },
        {
            id: "snow-bunny-tote",
            name: "Snow Bunny Tote",
            category: "merch",
            price: 25.00,
            originalPrice: 25.00,
            notes: "Seasonal • Limited • Canvas",
            description: "Limited edition winter tote with playful bunny design.",
            image: "images/Tote_SnowBunny_750x_f1a2b3c4.png",
            rarity: "❄️ Seasonal Limited • Winter Edition"
        },
        {
            id: "good-luck-hat",
            name: "Good Luck Hat",
            category: "merch",
            price: 29.95,
            originalPrice: 30.00,
            notes: "Embroidered • Adjustable",
            description: "Embroidered cap with our Good Luck design. Adjustable fit.",
            image: "images/Hat_GoodLuck_750x_a2b3c4d5.png",
            rarity: "🍀 Embroidered • Classic Fit"
        },
        {
            id: "forest-beanie",
            name: "Forest Beanie",
            category: "merch",
            price: 25.00,
            originalPrice: 25.00,
            notes: "Warm • Soft • Cuffed",
            description: "Soft knit beanie in our signature forest green. Cuffed style.",
            image: "images/Beanie_Forest_750x_b3c4d5e6.png",
            rarity: "🌲 Cozy Knit • Forest Green"
        },
        {
            id: "patch",
            name: "Going Places Patch",
            category: "merch",
            price: 8.00,
            originalPrice: 8.00,
            notes: "Iron-On • Embroidered",
            description: "Embroidered iron-on patch. Put it on your jacket, bag, or anywhere.",
            image: "images/Patch_GoingPlaces_750x_c4d5e6f7.png",
            rarity: "🧭 Iron-On • Adventure Ready"
        },
        {
            id: "camp-mug",
            name: "Breakaway Camp Mug",
            category: "merch",
            price: 20.00,
            originalPrice: 20.00,
            notes: "Enamel • Durable • 12oz",
            description: "Rugged enamel camp mug. Perfect for outdoor adventures.",
            image: "images/Mug_Camp_750x_d5e6f7a8.png",
            rarity: "🏕️ Camp Style • Enamel Coated"
        },
        {
            id: "cold-brew-koozie",
            name: "Cold Brew Koozie",
            category: "merch",
            price: 7.00,
            originalPrice: 7.00,
            notes: "Insulated • Fun • Essential",
            description: "Keep your stubby cold. Neoprene koozie with our logo.",
            image: "images/Koozie_ColdBrew_750x_e6f7a8b9.png",
            rarity: "🧊 Keep It Cold • Stubby Size"
        },
        {
            id: "cold-brew-glass",
            name: "Cold Brew Summer Glass",
            category: "merch",
            price: 14.95,
            originalPrice: 15.00,
            notes: "Glass • Stylish • 16oz",
            description: "Tall glass perfect for cold brew over ice. Summer vibes.",
            image: "images/Glass_ColdBrew_750x_f7a8b9c0.png",
            rarity: "☀️ Summer Essential • Tall Glass"
        },
        {
            id: "puzzle",
            name: "Cat's Meow Puzzle (500pc)",
            category: "merch",
            price: 29.95,
            originalPrice: 30.00,
            notes: "500 Pieces • Fun • Gift",
            description: "500-piece puzzle featuring our beloved Cat's Meow design.",
            image: "images/Puzzle_CatsMeow_750x_a8b9c0d1.png",
            rarity: "🐱 Relaxation • 500 Pieces"
        },
        {
            id: "mug-ornament",
            name: "Mini Mug Ornament",
            category: "merch",
            price: 9.95,
            originalPrice: 10.00,
            notes: "Ceramic • Holiday • Mini",
            description: "Tiny ceramic mug ornament. Perfect for coffee-loving Christmas trees.",
            image: "images/Ornament_MiniMug_750x_b9c0d1e2.png",
            rarity: "🎄 Holiday • Collectible"
        }
    ],

    // =====================================
    // BUNDLES & GIFT CARDS
    // =====================================
    bundles: [
        {
            id: "blend-trio",
            name: "Stumptown Blend Trio",
            category: "bundle",
            price: 99.50,
            originalPrice: 111.00,
            notes: "3 Bags • Save 10%",
            description: "Our three most popular blends: Hair Bender, Holler Mountain, and Founder's Blend.",
            image: "images/Blend_Trio_Bags_72_750x_d373d66c.png",
            rarity: "📦 Best Value • 3-Bag Bundle"
        },
        {
            id: "passport-trio",
            name: "12oz Passport Trio",
            category: "bundle",
            price: 112.25,
            originalPrice: 119.00,
            notes: "3 Single Origins • Global Tour",
            description: "Three single origins from different continents. A world tour in your cup.",
            image: "images/Passport_Trio_750x_c0d1e2f3.png",
            rarity: "🌍 World Tour • 3 Continents"
        },
        {
            id: "adventure-bundle",
            name: "Adventure Bundle",
            category: "bundle",
            price: 74.95,
            originalPrice: 75.00,
            notes: "Coffee + Gear",
            description: "AeroPress, grinder, and two bags of coffee. Everything you need to start brewing.",
            image: "images/Bundle_Adventure_750x_d1e2f3a4.png",
            rarity: "🎒 Starter Kit • Everything Included"
        },
        {
            id: "day-night-bundle",
            name: "Day & Night Bundle",
            category: "bundle",
            price: 69.25,
            originalPrice: 72.25,
            notes: "Regular + Decaf",
            description: "Our best blend and best decaf together. Coffee for every hour.",
            image: "images/Bundle_DayNight_750x_e2f3a4b5.png",
            rarity: "🌓 24/7 Coffee • Caf + Decaf"
        },
        {
            id: "home-barista-bundle",
            name: "Home Barista Bundle",
            category: "bundle",
            price: 129.00,
            originalPrice: 130.00,
            notes: "Grinder + Scale + Coffee",
            description: "Baratza Encore grinder, precision scale, and two bags of beans.",
            image: "images/Bundle_HomeBarista_750x_f3a4b5c6.png",
            rarity: "🏠 Pro Setup • Level Up"
        },
        {
            id: "evergreen-bundle",
            name: "Evergreen Bundle",
            category: "bundle",
            price: 62.50,
            originalPrice: 88.00,
            notes: "Evergreen + Mug",
            description: "Our Evergreen blend with a matching diner mug. The perfect pairing.",
            image: "images/Bundle_Evergreen_750x_a4b5c6d7.png",
            rarity: "🌲 Coffee + Mug • Gift Ready"
        },
        {
            id: "cold-brew-delight",
            name: "Cold Brew Delight",
            category: "bundle",
            price: 29.95,
            originalPrice: 30.00,
            notes: "4 Cold Brews + Glass",
            description: "Four cold brew stubbies plus a summer glass. Refreshment bundle.",
            image: "images/Bundle_ColdBrewDelight_750x_b5c6d7e8.png",
            rarity: "🧊 Summer Pack • Ready to Drink"
        },
        {
            id: "oatly-variety",
            name: "Cold Brew with Oatly Variety Pack",
            category: "bundle",
            price: 21.00,
            originalPrice: 23.00,
            notes: "4 Pack • All Flavors",
            description: "Try all our Oatly cold brew flavors. Plant-based perfection.",
            image: "images/Bundle_Oatly_750x_c6d7e8f9.png",
            rarity: "🌾 All Flavors • Plant-Based"
        },
        {
            id: "holiday-host",
            name: "Holiday Host Coffee Bundle",
            category: "bundle",
            price: 79.95,
            originalPrice: 80.00,
            notes: "4 Bags + Gear",
            description: "Four premium coffees and brewing gear. Perfect for holiday entertaining.",
            image: "images/Bundle_HolidayHost_750x_d7e8f9a0.png",
            rarity: "🎁 Holiday Special • Host's Choice"
        },
        {
            id: "gift-card-25",
            name: "Digital Gift Card - $25",
            category: "gift-card",
            price: 25.00,
            originalPrice: 25.00,
            notes: "Email Delivery",
            description: "Instant digital gift card. Delivered via email.",
            image: "images/GiftCard_Digital_750x_e8f9a0b1.png",
            rarity: "💌 Instant Delivery • Always Perfect"
        },
        {
            id: "gift-card-50",
            name: "Digital Gift Card - $50",
            category: "gift-card",
            price: 50.00,
            originalPrice: 50.00,
            notes: "Email Delivery",
            description: "Instant digital gift card. Delivered via email.",
            image: "images/GiftCard_Digital_750x_e8f9a0b1.png",
            rarity: "💌 Instant Delivery • Always Perfect"
        },
        {
            id: "gift-card-100",
            name: "Digital Gift Card - $100",
            category: "gift-card",
            price: 100.00,
            originalPrice: 100.00,
            notes: "Email Delivery",
            description: "Instant digital gift card. Delivered via email.",
            image: "images/GiftCard_Digital_750x_e8f9a0b1.png",
            rarity: "💌 Instant Delivery • Always Perfect"
        },
        {
            id: "gift-subscription-3mo",
            name: "3-Month Gift Subscription",
            category: "gift-card",
            price: 74.95,
            originalPrice: 75.00,
            notes: "3 Months of Coffee",
            description: "Gift three months of freshly roasted coffee. Recipient chooses their preferences.",
            image: "images/GiftSub_3Month_750x_f9a0b1c2.png",
            rarity: "📬 3 Months • Fresh Delivery"
        }
    ]
};

// Get all products as a flat array
function getAllProducts() {
    return [
        ...GRAINHOUSE_PRODUCTS.blends,
        ...GRAINHOUSE_PRODUCTS.singleOrigins,
        ...GRAINHOUSE_PRODUCTS.decaf,
        ...GRAINHOUSE_PRODUCTS.coldBrew,
        ...GRAINHOUSE_PRODUCTS.gear,
        ...GRAINHOUSE_PRODUCTS.merch,
        ...GRAINHOUSE_PRODUCTS.bundles
    ];
}

// Get products by category
function getProductsByCategory(category) {
    const allProducts = getAllProducts();
    if (category === 'all') return allProducts;
    if (category === 'coffee') {
        return [
            ...GRAINHOUSE_PRODUCTS.blends,
            ...GRAINHOUSE_PRODUCTS.singleOrigins,
            ...GRAINHOUSE_PRODUCTS.decaf
        ];
    }
    return allProducts.filter(p => p.category === category);
}

// Search products
function searchProducts(query) {
    const lowerQuery = query.toLowerCase();
    return getAllProducts().filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.notes?.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.origin?.toLowerCase().includes(lowerQuery)
    );
}

// Get featured products
function getFeaturedProducts() {
    return getAllProducts().filter(p => p.badge === 'bestseller' || p.badge === 'new').slice(0, 8);
}

// Calculate price for a specific size
function getPriceForSize(basePrice, sizeKey) {
    const sizeOption = SIZE_OPTIONS[sizeKey];
    if (!sizeOption) return roundToNiceCents(basePrice);
    return roundToNiceCents(basePrice * sizeOption.multiplier);
}

// Calculate subscription price (10% discount)
function getSubscriptionPrice(price) {
    return roundToNiceCents(price * (1 - SUBSCRIPTION_DISCOUNT));
}

// Get size label for display
function getSizeLabel(sizeKey, isGround = false) {
    if (isGround && GROUND_SIZE_OPTIONS[sizeKey]) {
        return GROUND_SIZE_OPTIONS[sizeKey].label;
    }
    return SIZE_OPTIONS[sizeKey]?.label || sizeKey;
}

// Get available sizes for a product (ground coffee only has 12oz)
function getAvailableSizes(product, grindType = 'Whole Bean') {
    if (!product.sizes) return ['12oz'];
    if (grindType === 'Ground') {
        return ['12oz']; // Ground only available in 12oz
    }
    return product.sizes;
}

// Check if product is subscribable
function isSubscribable(product) {
    return product.subscribable === true;
}

// Get all subscribable products
function getSubscribableProducts() {
    return getAllProducts().filter(p => p.subscribable === true);
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.GRAINHOUSE_PRODUCTS = GRAINHOUSE_PRODUCTS;
    window.getAllProducts = getAllProducts;
    window.getProductsByCategory = getProductsByCategory;
    window.searchProducts = searchProducts;
    window.getFeaturedProducts = getFeaturedProducts;
    window.SIZE_OPTIONS = SIZE_OPTIONS;
    window.GROUND_SIZE_OPTIONS = GROUND_SIZE_OPTIONS;
    window.SUBSCRIPTION_DISCOUNT = SUBSCRIPTION_DISCOUNT;
    window.SUBSCRIPTION_FREQUENCIES = SUBSCRIPTION_FREQUENCIES;
    window.getPriceForSize = getPriceForSize;
    window.getSubscriptionPrice = getSubscriptionPrice;
    window.getSizeLabel = getSizeLabel;
    window.getAvailableSizes = getAvailableSizes;
    window.isSubscribable = isSubscribable;
    window.getSubscribableProducts = getSubscribableProducts;
    window.roundToNiceCents = roundToNiceCents;
}

