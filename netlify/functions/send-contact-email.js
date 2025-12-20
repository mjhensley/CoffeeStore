// Netlify Serverless Function - Send Contact Form Email
// Uses Resend API to send contact form submissions

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { name, email, subject, message } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name, email, and message are required' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Build the email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f2ed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f2ed; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2d5a3d 0%, #1a3d2a 100%); padding: 40px 40px 35px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; color: #ffffff; font-weight: 400; letter-spacing: 2px;">
                GRAINHOUSE
              </h1>
              <p style="margin: 8px 0 0; color: #d4c8b8; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">
                Coffee Roasters
              </p>
            </td>
          </tr>

          <!-- Message Icon & Title -->
          <tr>
            <td style="padding: 50px 40px 30px; text-align: center;">
              <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #c9a96e 0%, #b8956a 100%); border-radius: 50%; margin: 0 auto 24px; line-height: 70px;">
                <span style="font-size: 32px; color: white;">✉️</span>
              </div>
              <h2 style="margin: 0 0 12px; font-family: Georgia, serif; font-size: 26px; color: #2c2c2c; font-weight: 400;">
                New Contact Form Message
              </h2>
              <p style="margin: 0; color: #666; font-size: 16px; line-height: 1.6;">
                You've received a new message from your website.
              </p>
            </td>
          </tr>

          <!-- Contact Details -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #faf8f5; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">From</span>
                          <p style="margin: 6px 0 0; font-size: 16px; color: #333; font-weight: 600;">${name}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Email</span>
                          <p style="margin: 6px 0 0; font-size: 16px; color: #333;">
                            <a href="mailto:${email}" style="color: #2d5a3d; text-decoration: none;">${email}</a>
                          </p>
                        </td>
                      </tr>
                      ${subject ? `
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Subject</span>
                          <p style="margin: 6px 0 0; font-size: 16px; color: #333;">${subject}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 12px 0 0;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Message</span>
                          <p style="margin: 10px 0 0; font-size: 15px; color: #333; line-height: 1.7; white-space: pre-wrap;">${message}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reply Button -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="mailto:${email}" style="display: inline-block; background: #2d5a3d; color: #ffffff; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 30px;">
                Reply to ${name}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #2c2c2c; padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 18px; color: #ffffff; letter-spacing: 1px;">
                GRAINHOUSE COFFEE
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                This message was sent from the contact form on grainhousecoffee.com
              </p>
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
        from: 'Grainhouse Coffee <support@grainhousecoffee.com>',
        to: 'admin@grainhousecoffee.com',
        subject: subject ? `Contact Form: ${subject}` : `New message from ${name}`,
        html: emailHtml,
        reply_to: email
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to send message', details: result })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Your message has been sent successfully!'
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

