import nodemailer from 'nodemailer';

// Lazy transporter - created on demand
let transporter = null;

// Create transporter based on environment
const createTransporter = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) console.log('📧 Creating email transporter...');
  
  // Option 1: Gmail (for testing)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    if (isDev) console.log('📧 Configuring Gmail transporter');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
      },
    });
  }

  // Option 2: SendGrid
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    if (isDev) console.log('📧 Configuring SendGrid transporter');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Option 3: Custom SMTP
  if (process.env.SMTP_HOST) {
    if (isDev) console.log('📧 Configuring custom SMTP transporter');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // No email service configured
  console.warn('⚠️  No email service configured. Emails will not be sent.');
  return null;
};

// Get or create transporter (lazy initialization)
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// Send waitlist confirmation email
export const sendWaitlistConfirmation = async (email, position = null) => {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.log('📧 Email service not configured. Skipping email to:', email);
    return { success: false, message: 'Email service not configured' };
  }

  const positionText = position ? `<p style="font-size: 18px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0;">📊 You are number ${position} on the waitlist!</p>` : '';
  const positionTextPlain = position ? `\n📊 You are number ${position} on the waitlist!\n` : '';

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@loyolq.com',
      to: email,
      subject: 'Welcome to Loyolq Waitlist! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're on the Waitlist!</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              <p>Thanks for joining the Loyolq waitlist. We're excited to have you on board! 🚀</p>
              ${positionText}
              <p>We're working hard to bring you the best customer loyalty platform for businesses. You'll be among the first to know when we launch.</p>
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>We'll keep you updated on our progress</li>
                <li>You'll get early access when we launch</li>
                <li>Special offers for early adopters</li>
              </ul>
              <p>In the meantime, want to try our instant demo?</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Try Instant Demo</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Loyolq. All rights reserved.</p>
              <p>If you didn't sign up for this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Loyolq Waitlist!

Thanks for joining the Loyolq waitlist. We're excited to have you on board!
${positionTextPlain}
We're working hard to bring you the best customer loyalty platform for businesses. You'll be among the first to know when we launch.

What happens next?
- We'll keep you updated on our progress
- You'll get early access when we launch  
- Special offers for early adopters

Visit ${process.env.FRONTEND_URL || 'http://localhost:5173'} to try our instant demo.

© ${new Date().getFullYear()} Loyolq. All rights reserved.
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  const transporter = getTransporter();
  
  if (!transporter) {
    return { success: false, message: 'No email service configured' };
  }

  try {
    await transporter.verify();
    console.log('✅ Email service is ready to send messages');
    return { success: true, message: 'Email service verified' };
  } catch (error) {
    console.error('❌ Email service verification failed:', error);
    return { success: false, error: error.message };
  }
};

// Send new claim notification to vendor
export const sendNewClaimNotification = async ({ 
  vendorEmail, 
  vendorName, 
  businessName, 
  customerName, 
  customerPhone, 
  amount, 
  currency,
  purchaseDate, 
  channel,
  claimId,
  pendingClaimsCount = 0
}) => {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.log('📧 Email service not configured. Skipping vendor notification.');
    return { success: false, message: 'Email service not configured' };
  }

  const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const formattedDate = new Date(purchaseDate).toLocaleDateString('en-GB');
  const channelDisplay = channel?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@pointara.com',
      to: vendorEmail,
      subject: `🔔 New Claim Pending - ${customerName || customerPhone} (${amount})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 22px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .claim-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
            .claim-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .claim-label { color: #666; font-size: 14px; }
            .claim-value { font-weight: 600; color: #333; }
            .amount { font-size: 24px; color: #667eea; font-weight: bold; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .button:hover { background: #5a6fd6; }
            .pending-badge { background: #fff3cd; color: #856404; padding: 8px 15px; border-radius: 20px; display: inline-block; font-size: 13px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Transaction Claim</h1>
            </div>
            <div class="content">
              <p>Hi ${vendorName || 'there'},</p>
              <p>A customer has submitted a new transaction claim for <strong>${businessName}</strong> that requires your review.</p>
              
              <div class="claim-box">
                <div class="claim-row">
                  <span class="claim-label">Customer</span>
                  <span class="claim-value">${customerName || 'Unknown'}</span>
                </div>
                <div class="claim-row">
                  <span class="claim-label">Phone</span>
                  <span class="claim-value">${customerPhone}</span>
                </div>
                <div class="claim-row">
                  <span class="claim-label">Amount</span>
                  <span class="claim-value amount">${amount}</span>
                </div>
                <div class="claim-row">
                  <span class="claim-label">Transaction Date</span>
                  <span class="claim-value">${formattedDate}</span>
                </div>
                <div class="claim-row">
                  <span class="claim-label">Channel</span>
                  <span class="claim-value">${channelDisplay}</span>
                </div>
              </div>

              <p style="text-align: center;">
                <a href="${dashboardUrl}/claims" class="button">Review Claim →</a>
              </p>

              ${pendingClaimsCount > 1 ? `<p style="text-align: center;"><span class="pending-badge">📋 You have ${pendingClaimsCount} pending claims to review</span></p>` : ''}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Pointara. All rights reserved.</p>
              <p style="margin-top: 10px; font-size: 11px;">To stop receiving these notifications, update your settings in the dashboard.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
New Transaction Claim - ${businessName}

Hi ${vendorName || 'there'},

A customer has submitted a new transaction claim that requires your review.

Customer: ${customerName || 'Unknown'}
Phone: ${customerPhone}
Amount: ${amount}
Transaction Date: ${formattedDate}
Channel: ${channelDisplay}

Review this claim: ${dashboardUrl}/claims

${pendingClaimsCount > 1 ? `You have ${pendingClaimsCount} pending claims to review.` : ''}

© ${new Date().getFullYear()} Pointara. All rights reserved.
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Vendor notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending vendor notification email:', error);
    return { success: false, error: error.message };
  }
};
