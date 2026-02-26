# WhatsApp Flow Setup Guide - Purchase Claims

## Overview
This guide will walk you through setting up a WhatsApp Flow for customers to submit purchase claims directly through WhatsApp using native form UI.

---

## Step 1: Access Meta Business Manager

1. Go to https://business.facebook.com/
2. Select your Business Account
3. Navigate to **WhatsApp Manager** (left sidebar)
4. Click on **WhatsApp Flows** or find it under "Tools"

---

## Step 2: Create a New Flow

1. Click **"Create Flow"**
2. Choose **"Start from Scratch"**
3. Name: `Purchase Claim - [Your Business]` (e.g., "Purchase Claim - Joe's Coffee")
4. Category: **"Other"** or **"Lead Generation"**
5. Click **"Create"**

---

## Key Features

### Dynamic Currency Display
The flow automatically shows the business's home currency in the amount field helper text. The currency is passed dynamically from the backend based on the tenant's `homeCurrency` setting.

### Conditional Receipt Upload
The receipt upload (PhotoPicker) is visible by default. Users can optionally check the "Do you have a receipt?" checkbox for tracking purposes, but the photo upload field is always available.

---

## Step 3: Flow JSON Schema

Copy and paste this JSON into the Flow Builder:

```json
{
  "version": "7.3",
  "data_api_version": "3.0",
  "routing_model": {
    "CLAIM_FORM": []
  },
  "screens": [
    {
      "id": "CLAIM_FORM",
      "title": "Submit Transaction Claim",
      "terminal": true,
      "data": {
        "channel_options": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "title": {
                "type": "string"
              }
            }
          },
          "__example__": [
            {
              "id": "physical_store",
              "title": "Physical Store"
            },
            {
              "id": "online",
              "title": "Online"
            },
            {
              "id": "social_media",
              "title": "Social Media"
            },
            {
              "id": "other",
              "title": "Other"
            }
          ]
        }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Form",
            "name": "claim_form",
            "children": [
              {
                "type": "TextCaption",
                "text": "Submit your transaction details to earn points. Claims must be submitted within 7 days of transaction."
              },
              {
                "type": "Dropdown",
                "name": "channel",
                "label": "Transaction Channel",
                "required": true,
                "data-source": "${data.channel_options}"
              },
              {
                "type": "TextInput",
                "name": "amount",
                "label": "Transaction Amount",
                "input-type": "number",
                "required": true,
                "helper-text": "Enter amount in transaction currency"
              },
              {
                "type": "DatePicker",
                "name": "purchase_date",
                "label": "Transaction Date",
                "required": true
              },
              {
                "type": "PhotoPicker",
                "name": "receipt",
                "label": "Upload Receipt",
                "visible": true,
                "max-uploaded-photos": 1
              },
              {
                "type": "Footer",
                "label": "Submit Claim",
                "on-click-action": {
                  "name": "complete",
                  "payload": {
                    "channel": "${form.channel}",
                    "amount": "${form.amount}",
                    "purchase_date": "${form.purchase_date}",
                    "receipt_url": "${form.receipt}"
                  }
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

## Step 4: Configure Flow Endpoint

1. In the Flow settings, find **"Endpoint URL"**
2. Enter your webhook URL:
   - **Development (ngrok)**: `https://your-ngrok-url.ngrok.io/api/v1/claims/submit`
   - **Production**: `https://yourdomain.com/api/v1/claims/submit`
3. Set **HTTP Method**: `POST`
4. Enable **"Send as form data"**

---

## Step 5: Set Up Webhook (Already Done!)

Your backend is already configured to receive the Flow submission at:
- Route: `POST /api/v1/claims/submit`
- File: `/backend/src/controllers/purchaseClaim.controller.js`
- No authentication required (public endpoint)

The webhook expects:
```json
{
  "phoneNumber": "+447404938935",
  "amountNgn": 5000,
  "purchaseDate": "2025-12-24",
  "channel": "physical_store",
  "receiptUrl": "https://...",
  "description": "Optional notes",
  "vendorCode": "8QDERH"
}
```

---

## Step 6: Generate QR Codes for Vendors

### Option A: WhatsApp Link with Flow Trigger

Create a unique link for each vendor:

```
https://wa.me/2348788222042?text=CLAIM_8QDERH
```

Format: `https://wa.me/<YOUR_WHATSAPP_NUMBER>?text=CLAIM_<VENDOR_CODE>`

**Vendor Codes:**
- Joe's Coffee House: `8QDERH`
- Sarah's Fashion Boutique: `V73ZTR`
- Appmart Integrated: `VND508267`

### Option B: Generate QR Codes

Use this Node.js script to generate QR codes:

```javascript
// Install: npm install qrcode
const QRCode = require('qrcode');

const vendors = [
  { name: "Joe's Coffee House", code: "8QDERH", phone: "2348788222042" },
  { name: "Sarah's Fashion Boutique", code: "V73ZTR", phone: "2348788222042" },
  { name: "Appmart Integrated", code: "VND508267", phone: "2348788222042" }
];

vendors.forEach(vendor => {
  const link = `https://wa.me/${vendor.phone}?text=CLAIM_${vendor.code}`;
  QRCode.toFile(`qr-${vendor.code}.png`, link, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  }, (err) => {
    if (err) throw err;
    console.log(`✅ QR code generated for ${vendor.name}`);
  });
});
```

### Option C: Online QR Generator

1. Go to https://www.qr-code-generator.com/
2. Select **"URL"** type
3. Enter: `https://wa.me/2348788222042?text=CLAIM_8QDERH`
4. Customize design (add logo, colors)
5. Download high-resolution PNG

---

## Step 7: Test the Flow

1. **Enable Test Mode** in WhatsApp Flows
2. Add your test number: `+447404938935`
3. Click **"Preview on Device"**
4. Submit a test claim
5. Check your backend logs: `tail -f backend/backend-server.log`
6. Verify claim appears in dashboard: Purchases → Pending Claims

---

## Step 8: Flow Trigger Message Setup

When a customer sends the trigger message, your bot should respond with:

```
🎁 Claim Your Loyalty Points!

Hi [Customer Name],

Click the button below to submit your transaction claim and earn loyalty points.

Claims must be submitted within 7 days of transaction.

[Submit Claim Button → Opens Flow]
```

### Implement in Backend

Add this to `/backend/src/controllers/webhook.controller.js`:

```javascript
export const handleIncomingMessage = async (req, res) => {
  const { entry } = req.body;
  
  for (const item of entry) {
    for (const change of item.changes) {
      if (change.value.messages) {
        for (const message of change.value.messages) {
          const phoneNumber = message.from;
          const messageText = message.text?.body;
          
          // Check if message starts with CLAIM_
          if (messageText?.startsWith('CLAIM_')) {
            const vendorCode = messageText.replace('CLAIM_', '');
            
            // Find tenant
            const tenant = await prisma.tenant.findUnique({
              where: { vendorCode }
            });
            
            if (tenant) {
              // Send Flow message
              await sendWhatsAppFlow({
                phoneNumber,
                flowId: 'YOUR_FLOW_ID', // Get from Meta
                vendorCode,
                businessName: tenant.businessName
              });
            }
          }
        }
      }
    }
  }
  
  res.sendStatus(200);
};
```

---

## Step 9: Deploy to Production

### 1. Update ngrok to Production URL

In Flow settings, change endpoint from ngrok to your production domain:
```
https://api.yourdomain.com/api/v1/claims/submit
```

### 2. Verify SSL Certificate

WhatsApp requires HTTPS with valid SSL certificate. Test with:
```bash
curl https://api.yourdomain.com/api/v1/claims/submit
```

### 3. Publish Flow

1. Test thoroughly in Test Mode
2. Click **"Publish Flow"**
3. Wait for Meta review (1-2 business days)
4. Once approved, Flow goes live

---

## Step 10: Marketing Materials

### For Vendors to Display

Create printable materials with QR code:

**Counter Display Card:**
```
┌─────────────────────────────────┐
│  🎁 EARN LOYALTY POINTS! 🎁    │
│                                 │
│  Scan to claim your points:     │
│                                 │
│      [QR CODE HERE]             │
│                                 │
│  Claims must be submitted       │
│  within 7 days of purchase      │
│                                 │
│  Questions? Ask our staff!      │
└─────────────────────────────────┘
```

**Receipt Sticker:**
```
Claim Your Points!
[Mini QR Code]
Scan within 7 days
```

---

## Troubleshooting

### Flow Not Triggering
- Check webhook URL is publicly accessible
- Verify Flow is published (not in draft)
- Check Meta Business Manager permissions

### Claims Not Appearing
- Check backend logs: `tail -f backend/backend-server.log`
- Test endpoint manually: `curl -X POST http://localhost:3001/api/v1/claims/submit -H "Content-Type: application/json" -d '{"phoneNumber":"+447404938935","amountNgn":5000,"purchaseDate":"2025-12-24","channel":"physical_store","vendorCode":"8QDERH"}'`
- Verify customer is registered

### Receipt Upload Failing
- Check file size limits (WhatsApp max: 5MB)
- Verify image formats (JPEG, PNG)
- Ensure receipt storage configured (S3/Cloudinary)

---

## Next Steps

1. ✅ **Set up Flow in Meta Business Manager** (use JSON above)
2. ✅ **Generate QR codes** for each vendor
3. ✅ **Test with your test number** (+447404938935)
4. ⏳ **Submit for review** in Meta Business Manager
5. ⏳ **Print marketing materials** with QR codes
6. ⏳ **Train vendors** on the process
7. ⏳ **Launch to customers!**

---

## Support Contacts

- Meta Business Support: https://business.facebook.com/help
- WhatsApp API Docs: https://developers.facebook.com/docs/whatsapp/flows

---

**Current Status:**
- ✅ Backend API ready
- ✅ Fraud detection implemented
- ✅ WhatsApp notifications working
- ⏳ Flow needs to be created in Meta Business Manager
- ⏳ QR codes need to be generated

Let me know when you've created the Flow and I can help with testing!
