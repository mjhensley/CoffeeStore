/**
 * CONFIGURATION FILE
 * ===================
 * 
 * Copy this file to config.js and add your actual API keys.
 * config.js is gitignored and should not be committed.
 * 
 * STRIPE SETUP:
 * 1. Go to https://dashboard.stripe.com/
 * 2. Sign up or log in to your account
 * 3. Go to Developers > API keys
 * 4. Copy your "Publishable key" (starts with pk_)
 * 5. Copy your "Secret key" (starts with sk_) - Keep this SECRET!
 * 6. Add publishable key to config.js below
 * 7. Add secret key to Netlify environment variables (STRIPE_SECRET_KEY)
 * 
 * GOOGLE PLACES API SETUP:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select an existing one
 * 3. Enable the Places API
 * 4. Create credentials (API Key)
 * 5. Restrict the API key to Places API and your domain
 * 6. Copy the API key to config.js
 */

const CONFIG = {
    // Stripe Publishable Key (public, safe to expose in frontend)
    stripePublishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE',
    
    // Google Places API Key (optional, for address autocomplete)
    googlePlacesApiKey: 'YOUR_GOOGLE_PLACES_API_KEY_HERE'
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

