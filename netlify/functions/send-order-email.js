// Netlify Serverless Function - Send Order Confirmation Email
// Uses Resend API to send beautiful order confirmation emails

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

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

    // Generate order number if not provided
    const finalOrderNumber = orderNumber || `GH-${Date.now().toString(36).toUpperCase()}`;

    // Build the items HTML
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e0d8;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="80" style="vertical-align: top;">
                <img src="${item.image || 'https://grainhousecoffee.com/images/coffee-bag-placeholder.png'}" 
                     alt="${item.name}" 
                     width="70" 
                     style="border-radius: 8px; background: #f9f6f1;">
              </td>
              <td style="vertical-align: top; padding-left: 16px;">
                <p style="margin: 0 0 4px; font-family: Georgia, serif; font-size: 16px; color: #2c2c2c; font-weight: 600;">
                  ${item.name}
                </p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  Qty: ${item.quantity} × $${item.price.toFixed(2)}
                </p>
              </td>
              <td style="vertical-align: top; text-align: right; font-weight: 600; color: #2c2c2c;">
                $${(item.price * item.quantity).toFixed(2)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

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
                ${customerName ? `Hi ${customerName}, we're` : "We're"} roasting up something special for you.
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
                          $${subtotal.toFixed(2)}
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
        body: JSON.stringify({ error: 'Failed to send email', details: result })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Order confirmation sent!',
        orderNumber: finalOrderNumber,
        emailId: result.id
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};

