/**
 * Send Contact Form Email API Route (Vercel)
 * 
 * Uses Resend API to send contact form submissions
 * 
 * Endpoint: POST /api/send-contact-email
 */

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
 * Sanitize email address for use in email headers to prevent header injection
 * @param {string} email - Email address to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
function sanitizeEmailForHeader(email) {
  if (!email || typeof email !== 'string') return null;
  
  // Remove any newlines, carriage returns, or other control characters
  const sanitized = email.replace(/[\r\n\t]/g, '').trim();
  
  // Validate the sanitized email format
  const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  if (!emailRegex.test(sanitized)) return null;
  
  // Additional check: ensure no angle brackets or quotes that could break headers
  if (/[<>"']/.test(sanitized)) return null;
  
  return sanitized;
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
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
    origins.push('http://localhost:8080', 'http://localhost:8888', 'http://localhost:3000', 'http://127.0.0.1:8080');
  }
  return origins;
}

/**
 * Get CORS headers based on request origin
 */
function getCorsHeaders(requestOrigin) {
  const allowedOrigins = getAllowedOrigins();
  
  // Also allow Vercel preview URLs
  const isVercelPreview = requestOrigin && (
    requestOrigin.includes('.vercel.app') || 
    requestOrigin.includes('.vercel.live')
  );
  const allowedOrigin = allowedOrigins.includes(requestOrigin) || isVercelPreview 
    ? requestOrigin 
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const headers = getCorsHeaders(origin);

  // Set CORS headers
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message } = req.body || {};

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Sanitize all user inputs to prevent XSS
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    // Build the email HTML with sanitized inputs
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
                          <p style="margin: 6px 0 0; font-size: 16px; color: #333; font-weight: 600;">${safeName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Email</span>
                          <p style="margin: 6px 0 0; font-size: 16px; color: #333;">
                            <a href="mailto:${safeEmail}" style="color: #2d5a3d; text-decoration: none;">${safeEmail}</a>
                          </p>
                        </td>
                      </tr>
                      ${safeSubject ? `
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Subject</span>
                          <p style="margin: 6px 0 0; font-size: 16px; color: #333;">${safeSubject}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 12px 0 0;">
                          <span style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Message</span>
                          <p style="margin: 10px 0 0; font-size: 15px; color: #333; line-height: 1.7; white-space: pre-wrap;">${safeMessage}</p>
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
              <a href="mailto:${safeEmail}" style="display: inline-block; background: #2d5a3d; color: #ffffff; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 30px;">
                Reply to ${safeName}
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

    // Sanitize email for use in reply_to header
    const safeReplyTo = sanitizeEmailForHeader(email);
    if (!safeReplyTo) {
      return res.status(400).json({ error: 'Invalid email format for reply-to' });
    }

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
        subject: safeSubject ? `Contact Form: ${safeSubject}` : `New message from ${safeName}`,
        html: emailHtml,
        reply_to: safeReplyTo
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Your message has been sent successfully!'
    });

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
