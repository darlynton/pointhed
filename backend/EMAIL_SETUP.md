# Email Service Setup Guide

## Quick Start

The email service supports multiple providers. Choose one based on your needs:

## Option 1: Gmail (Best for Testing)

### Setup Steps:

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update `.env` file:**
   ```env
   EMAIL_SERVICE="gmail"
   EMAIL_FROM="your-email@gmail.com"
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"  # App password
   ```

### Gmail Limitations:
- 500 emails per day for free accounts
- 2000 emails per day for Google Workspace
- Not recommended for production

---

## Option 2: SendGrid (Best for Production)

### Setup Steps:

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Free tier: 100 emails/day

2. **Get API Key**
   - Go to Settings > API Keys
   - Create new API key with "Mail Send" permission
   - Copy the API key

3. **Update `.env` file:**
   ```env
   EMAIL_SERVICE="sendgrid"
   EMAIL_FROM="noreply@yourdomain.com"
   SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxx"
   ```

### SendGrid Features:
- 100 emails/day free, then paid plans
- Email analytics and tracking
- High deliverability
- Production-ready

---

## Option 3: AWS SES (Best for Scale)

### Setup Steps:

1. **Setup AWS SES**
   - Go to AWS Console > SES
   - Verify your domain or email
   - Get SMTP credentials

2. **Update `.env` file:**
   ```env
   SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="your-aws-smtp-username"
   SMTP_PASSWORD="your-aws-smtp-password"
   EMAIL_FROM="noreply@yourdomain.com"
   ```

### AWS SES Features:
- 62,000 emails/month free (if sent from EC2)
- $0.10 per 1,000 emails after
- Extremely scalable
- Requires domain verification

---

## Option 4: Custom SMTP

Any SMTP provider (Mailgun, Postmark, etc.):

```env
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_SECURE="false"  # true for port 465
SMTP_USER="your-username"
SMTP_PASSWORD="your-password"
EMAIL_FROM="noreply@yourdomain.com"
```

---

## Testing Your Setup

### 1. Test email configuration:
```bash
cd backend
node -e "import('./src/services/email.service.js').then(m => m.testEmailConfig())"
```

### 2. Send a test email:
```bash
curl -X POST http://localhost:3001/api/v1/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "your-real-email@example.com", "source": "test"}'
```

Check your inbox (and spam folder) for the confirmation email.

---

## Troubleshooting

### Gmail "Less secure app access" error
- Use App Passwords (requires 2FA enabled)
- Don't use your regular Gmail password

### "Connection timeout" errors
- Check your firewall allows outbound connections on port 587/465
- Some ISPs block SMTP ports

### Emails going to spam
- Use a verified domain (not @gmail.com) in production
- Set up SPF, DKIM, and DMARC records
- Use a reputable email service (SendGrid, AWS SES)

### SendGrid "Sender Identity" error
- Verify your sender email in SendGrid dashboard
- Or verify your entire domain

---

## Production Recommendations

1. **Use a dedicated email service** (SendGrid, AWS SES, Postmark)
2. **Verify your domain** with proper DNS records
3. **Set up SPF, DKIM, DMARC** to avoid spam folders
4. **Use a professional from address** (e.g., noreply@yourdomain.com)
5. **Monitor bounce rates** and unsubscribes
6. **Implement rate limiting** to prevent abuse

---

## Email Template Customization

Edit `/backend/src/services/email.service.js`:

```javascript
export const sendWaitlistConfirmation = async (email) => {
  // Customize the email content here
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Custom Subject',
    html: `Your custom HTML template`,
    text: `Your custom plain text version`
  };
  // ...
};
```

---

## Additional Features

You can extend the email service to:
- Send welcome emails
- Send password reset emails  
- Send notification emails
- Send promotional emails
- Track email opens and clicks (with SendGrid/Mailgun)

Just create new functions in `email.service.js` and call them from your controllers.
