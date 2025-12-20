// Netlify Serverless Function - Send Order Confirmation Email
// Uses Resend API to send beautiful order confirmation emails

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} - HTML-escaped string
 */
function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize image URL
 * Only allows HTTPS URLs from trusted domains
 * @param {string} url - Image URL to validate
 * @returns {string} - Safe URL or default placeholder
 */
function sanitizeImageUrl(url) {
  const defaultImage = 'https://grainhousecoffee.com/images/coffee-bag-placeholder.png';
  
  if (!url || typeof url !== 'string') return defaultImage;
  
  // Trim and check for allowed protocols
  const trimmedUrl = url.trim();
  
  // Only allow HTTPS URLs
  if (!trimmedUrl.startsWith('https://')) return defaultImage;
  
  // Allowlist of trusted image domains
  const trustedDomains = [
    'grainhousecoffee.com',
    'www.grainhousecoffee.com',
    'cdn.grainhousecoffee.com',
    'cdn.shopify.com',
    'images.unsplash.com',
    'i.imgur.com'
  ];
  
  try {
    const urlObj = new URL(trimmedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if domain is trusted
    const isTrusted = trustedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isTrusted) return defaultImage;
    
    // Return the validated URL
    return trimmedUrl;
  } catch (e) {
    return defaultImage;
  }
}

/**
 * Get allowed origins for CORS
 * @returns {string[]} - Array of allowed origins
 */
function getAllowedOrigins() {
  const origins = [
    'https://grainhousecoffee.com',
    'https://www.grainhousecoffee.com'
  ];
  // Allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:8080', 'http://localhost:8888', 'http://127.0.0.1:8080');
  }
  return origins;
}

exports.handler = async (event, context) => {
  // Get the origin from the request
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  // CORS headers with restricted origin
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { customerEmail, customerName, items, subtotal, orderNumber } = JSON.parse(event.body);

    // Validate required fields
    if (!customerEmail || !items || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Sanitize customer name
    const safeCustomerName = escapeHtml(customerName);

    // Generate order number if not provided (sanitize if provided)
    const finalOrderNumber = escapeHtml(orderNumber) || `GH-${Date.now().toString(36).toUpperCase()}`;

    // Build the items HTML with sanitized data
    const itemsHtml = items.map(item => {
      const safeName = escapeHtml(item.name);
      const safeImage = sanitizeImageUrl(item.image);
      // Bounds checking for quantity (1-999) and price ($0-$10000)
      const quantity = Math.max(1, Math.min(parseInt(item.quantity, 10) || 1, 999));
      const price = Math.max(0, Math.min(parseFloat(item.price) || 0, 10000));
      
      return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e0d8;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="80" style="vertical-align: top;">
                <img src="${safeImage}" 
                     alt="${safeName}" 
                     width="70" 
                     style="border-radius: 8px; background: #f9f6f1;">
              </td>
              <td style="vertical-align: top; padding-left: 16px;">
                <p style="margin: 0 0 4px; font-family: Georgia, serif; font-size: 16px; color: #2c2c2c; font-weight: 600;">
                  ${safeName}
                </p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  Qty: ${quantity} × $${price.toFixed(2)}
                </p>
              </td>
              <td style="vertical-align: top; text-align: right; font-weight: 600; color: #2c2c2c;">
                $${(price * quantity).toFixed(2)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
    }).join('');

    // Sanitize and validate subtotal
    const safeSubtotal = parseFloat(subtotal) || 0;

    // Beautiful email HTML template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Grainhouse Coffee</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f2ed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f2ed; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6b5344 0%, #8b7355 100%); padding: 40px 40px 35px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; color: #ffffff; font-weight: 400; letter-spacing: 2px;">
                GRAINHOUSE
              </h1>
              <p style="margin: 8px 0 0; color: #d4c8b8; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">
                Coffee Roasters
              </p>
            </td>
          </tr>

          <!-- Success Icon & Message -->
          <tr>
            <td style="padding: 50px 40px 30px; text-align: center;">
              <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #c9a96e 0%, #b8956a 100%); border-radius: 50%; margin: 0 auto 24px; line-height: 70px;">
                <span style="font-size: 32px; color: white;">✓</span>
              </div>
              <h2 style="margin: 0 0 12px; font-family: Georgia, serif; font-size: 26px; color: #2c2c2c; font-weight: 400;">
                Thank You for Your Order!
              </h2>
              <p style="margin: 0; color: #666; font-size: 16px; line-height: 1.6;">
                ${safeCustomerName ? `Hi ${safeCustomerName}, we're` : "We're"} roasting up something special for you.
              </p>
            </td>
          </tr>

          <!-- Order Number -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #faf8f5; border-radius: 8px; border: 1px dashed #d4c8b8;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                      Order Number
                    </p>
                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 22px; color: #6b5344; font-weight: bold; letter-spacing: 2px;">
                      ${finalOrderNumber}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <h3 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 18px; color: #2c2c2c; font-weight: 500; border-bottom: 2px solid #6b5344; padding-bottom: 12px;">
                Order Summary
              </h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Subtotal -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #2c2c2c; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px;">Subtotal</td>
                        <td style="color: #ffffff; font-size: 20px; font-weight: bold; text-align: right; font-family: Georgia, serif;">
                          $${safeSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 13px; color: #888; text-align: center;">
                Shipping calculated and charged separately.
              </p>
            </td>
          </tr>

          <!-- What's Next -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #faf8f5; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <h4 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 16px; color: #2c2c2c;">
                      ☕ What Happens Next?
                    </h4>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #555;">
                          <strong style="color: #6b5344;">1.</strong> We'll roast your beans fresh to order
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #555;">
                          <strong style="color: #6b5344;">2.</strong> Your order ships within 1-2 business days
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #555;">
                          <strong style="color: #6b5344;">3.</strong> You'll receive tracking info via email
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #2c2c2c; padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 18px; color: #ffffff; letter-spacing: 1px;">
                GRAINHOUSE COFFEE
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #888;">
                Craft roasted with care
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                Questions? Reply to this email or contact us at<br>
                <a href="mailto:support@grainhousecoffee.com" style="color: #c9a96e; text-decoration: none;">support@grainhousecoffee.com</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer Links -->
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; padding: 24px 0;">
          <tr>
            <td style="text-align: center; font-size: 12px; color: #888;">
              <a href="https://grainhousecoffee.com" style="color: #6b5344; text-decoration: none; margin: 0 12px;">Shop</a>
              <a href="https://grainhousecoffee.com/brew-guides.html" style="color: #6b5344; text-decoration: none; margin: 0 12px;">Brew Guides</a>
              <a href="https://grainhousecoffee.com/our-story.html" style="color: #6b5344; text-decoration: none; margin: 0 12px;">Our Story</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Grainhouse Coffee <orders@grainhousecoffee.com>',
        to: customerEmail,
        subject: `Order Confirmed! ☕ ${finalOrderNumber}`,
        html: emailHtml,
        reply_to: 'support@grainhousecoffee.com'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to send email' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Order confirmation sent!',
        orderNumber: finalOrderNumber
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

