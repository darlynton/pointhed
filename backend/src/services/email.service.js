import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Lazy transporter - created on demand
let transporter = null;
let resendClient = null;

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

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

  // No SMTP-style email service configured
  // (Resend may still be configured via RESEND_API_KEY)
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

const hasEmailProviderConfigured = () => {
  if (process.env.RESEND_API_KEY) return true;
  if (process.env.EMAIL_SERVICE === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) return true;
  if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) return true;
  return false;
};

const sendEmail = async ({ from, to, subject, html, text }) => {
  const resend = getResendClient();

  if (resend) {
    try {
      const response = await resend.emails.send({ from, to, subject, html, text });
      console.log('📧 Resend response:', JSON.stringify(response?.data || response));
      return { messageId: response?.data?.id || response?.id || 'resend' };
    } catch (resendErr) {
      console.warn('⚠️ Resend failed, falling back to SMTP:', resendErr?.message || resendErr);
      // Fall through to SMTP
    }
  }

  const smtpTransporter = getTransporter();
  if (!smtpTransporter) {
    throw new Error('Email service not configured');
  }

  const info = await smtpTransporter.sendMail({ from, to, subject, html, text });
  return { messageId: info.messageId };
};

// Test email configuration
export const testEmailConfig = async () => {
  if (getResendClient()) {
    return { success: true, message: 'Resend is configured' };
  }

  const smtpTransporter = getTransporter();

  if (!smtpTransporter) {
    return { success: false, message: 'No email service configured' };
  }

  try {
    await smtpTransporter.verify();
    console.log('✅ Email service is ready to send messages');
    return { success: true, message: 'Email service verified' };
  } catch (error) {
    console.error('❌ Email service verification failed:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email to newly created vendor account
export const sendWelcomeEmail = async ({
  email,
  fullName,
  businessName,
  dashboardUrl,
}) => {
  if (!hasEmailProviderConfigured()) {
    console.log('📧 Email service not configured. Skipping welcome email to:', email);
    return { success: false, message: 'Email service not configured' };
  }

  const appBaseUrl = (dashboardUrl || process.env.FRONTEND_URL || 'https://pointhed.com').replace(/\/+$/, '');
  const dashboardLandingUrl = `${appBaseUrl}/dashboard/overview`;
  const recipientName = fullName || 'there';

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@pointhed.com',
      to: email,
      subject: `Welcome to Pointhed, ${businessName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #264EFF 0%, #1e3fd6 100%); color: white; padding: 28px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 28px; }
            .button { display: inline-block; background: #264EFF; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 14px 0; }
            .tip { background: #f3f7ff; border: 1px solid #dbe7ff; border-radius: 8px; padding: 14px; margin-top: 16px; }
            .footer { color: #6b7280; font-size: 12px; text-align: center; padding: 18px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0;">Welcome to Pointhed</h2>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>Your account for <strong>${businessName || 'your business'}</strong> is ready.</p>
              <p>Open your dashboard to continue.</p>
              <p style="text-align:center;">
                <a href="${dashboardLandingUrl}" class="button" style="display:inline-block;background:#264EFF;color:#FFFFFF !important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;margin:14px 0;">Open Dashboard</a>
              </p>
              <div class="tip">
                <strong>Quick start:</strong>
                <ul style="margin:8px 0 0 18px; padding:0;">
                  <li>Open your dashboard</li>
                  <li>Add your first customer</li>
                  <li>Log a first transaction</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Pointhed. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Pointhed!

Hi ${recipientName},

Your account for ${businessName || 'your business'} has been created successfully.

Dashboard: ${dashboardLandingUrl}

Quick start:
- Complete onboarding details
- Add your first customer
- Log a first transaction

© ${new Date().getFullYear()} Pointhed
      `.trim(),
    };

    const info = await sendEmail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId, 'to', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
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
  if (!hasEmailProviderConfigured()) {
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

    const info = await sendEmail(mailOptions);
    console.log('✅ Vendor notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending vendor notification email:', error);
    return { success: false, error: error.message };
  }
};
