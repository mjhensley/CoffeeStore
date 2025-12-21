/**
 * Health Check Endpoint
 * 
 * Returns configuration status without exposing secrets.
 * Useful for debugging deployment issues.
 */

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Check environment variables without exposing values
        const helcimConfigured = !!process.env.HELCIM_API_TOKEN;
        const siteUrl = process.env.SITE_URL || 'not-set';
        
        // Check if we're in development or production
        const env = process.env.CONTEXT || process.env.NODE_ENV || 'unknown';
        
        const status = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env,
            configuration: {
                helcim: helcimConfigured ? 'configured' : 'missing',
                siteUrl: siteUrl !== 'not-set' ? 'configured' : 'not-set'
            },
            services: {
                functions: 'operational',
                helcim: helcimConfigured ? 'ready' : 'not-configured'
            }
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(status)
        };

    } catch (error) {
        console.error('Health check error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed'
            })
        };
    }
};
