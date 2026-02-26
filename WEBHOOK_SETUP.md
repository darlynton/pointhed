# WhatsApp Webhook Setup Guide

## Overview
Your webhook is now ready at: `https://your-domain.com/webhook/whatsapp`

For local testing, you'll need to expose your localhost to the internet using a service like ngrok.

## Step 1: Expose Local Server (for testing)

Install and run ngrok:
```bash
ngrok http 3001
```

You'll get a URL like: `https://abc123.ngrok.io`

Your webhook URL will be: `https://abc123.ngrok.io/webhook/whatsapp`

## Step 2: Configure Webhook in Meta

1. Go to: https://developers.facebook.com/apps
2. Select your app → WhatsApp → Configuration
3. Click "Configure Webhooks"
4. Enter:
   - **Callback URL**: `https://your-domain.com/webhook/whatsapp`
   - **Verify Token**: `Awele` (from your .env file)
5. Click "Verify and Save"

## Step 3: Subscribe to Webhook Fields

In the same Configuration page, subscribe to these fields:
- ✅ `messages` - Receive customer messages
- ✅ `message_status` - Get delivery/read receipts

## What the Webhook Handles

### Incoming Events:
1. **Customer Messages**
   - Text messages
   - Button responses
   - Interactive messages
   
2. **Status Updates**
   - `sent` - Message sent to WhatsApp
   - `delivered` - Delivered to customer's phone
   - `read` - Customer opened the message
   - `failed` - Delivery failed

### Current Functionality:
- ✅ Webhook verification
- ✅ Message receipt logging
- ✅ Status update tracking
- ✅ Basic command detection (balance, help, rewards)
- 🚧 Auto-responses (ready to implement)
- 🚧 Database storage (schema ready)

## Testing the Webhook

### 1. Verify Setup:
```bash
curl "http://localhost:3001/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=Awele&hub.challenge=test123"
```

Should return: `test123`

### 2. Test Message Receipt:
Send a test message from Meta's Test Number to your registered test recipient (07404938935).

Check backend logs:
```bash
tail -f backend/server.log
```

You should see:
```
📨 Received webhook event:
💬 Incoming message:
From: 447404938935
```

## For Production

1. Deploy backend to a server (Railway, Render, AWS, etc.)
2. Get a permanent domain/URL
3. Update webhook URL in Meta
4. Update WHATSAPP_VERIFY_TOKEN to a secure random string
5. Enable SSL/HTTPS (required by Meta)

## Webhook Endpoints

- **GET** `/webhook/whatsapp` - Verification endpoint (Meta calls this first)
- **POST** `/webhook/whatsapp` - Event receiver (Meta sends events here)

## Environment Variables

Already configured in your `.env`:
```
WHATSAPP_API_TOKEN="EAAVp..."
WHATSAPP_PHONE_NUMBER_ID="878222042049774"
WHATSAPP_VERIFY_TOKEN="Awele"
```

## Next Steps

1. Set up ngrok for testing
2. Configure webhook in Meta Console
3. Send test message to 07404938935
4. Verify webhook receives the event
5. Implement auto-responses (balance checks, help commands)
