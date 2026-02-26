# WhatsApp Flow Public Key Setup

## Your Public Key (Copy This)

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhS2YTdvMeHPj4497Pxik
l3jNM3rj1B/IZ1+Qf7+TKhgS0dJ5u2v4Wi/ZGv1SZYt+2MGCSXuwnDQ/KUaB39uf
y/EWXB6lvOV3fULDfX4BIZKp7utbLKH6VPmEWdM8f59SlB4zeWIvP/W9aB10kBcr
87mnAc2Xb2SuV+2oqcl2SJnWAiWcITr63w1c871VnUNNIFDC4Kv58cftQQH/79bL
nYzMsHjX0C9BTEyLM91Km1hW6uDM2o8KCix/QRmQUAL7fwGuvLuSVFWI7ZHf9/L2
YqjAwSipFBQ+akgPKPVZx0kBTNqREQSXDVag49O+xOvEYxX/iVxPAWuRJIw/3nJt
MwIDAQAB
-----END PUBLIC KEY-----
```

## How to Add This to Your WhatsApp Flow

1. **Go to Meta Business Manager**
   - Visit: https://business.facebook.com/
   - Navigate to: WhatsApp Manager → WhatsApp Flows

2. **Select Your Flow**
   - Click on your "Purchase Claim" Flow

3. **Go to Flow Settings**
   - Click the **Settings** or **Configure** button (usually a gear icon)

4. **Find "Signing Public Key" Section**
   - Look for a field called:
     - "Public Key"
     - "Signing Public Key"
     - "RSA Public Key"
     - "Encryption Key"

5. **Paste the Public Key**
   - Copy the ENTIRE public key above (including the BEGIN and END lines)
   - Paste it into the text field
   - Click **Save** or **Update**

## Why This Is Needed

WhatsApp uses this public key to:
- Verify that claim submissions actually came from your server
- Prevent tampering with Flow responses
- Ensure secure communication between WhatsApp and your backend

Your **private key** stays on your server (`flow_private_key.pem`) and is never shared.

## Troubleshooting

### "Invalid Key Format" Error
- Make sure you copied the ENTIRE key including:
  - `-----BEGIN PUBLIC KEY-----`
  - All the encoded text
  - `-----END PUBLIC KEY-----`
- No extra spaces or line breaks

### "Key Not Working" After Adding
- Wait 5-10 minutes for Meta to process the key
- The Flow signature verification will log: `✅ Flow signature verified`
- If not working, check backend logs when submitting a claim

## Testing After Setup

1. Send "CLAIM_8QDERH" to your WhatsApp number
2. Fill out and submit the Flow
3. Check backend logs for: `✅ Flow signature verified`
4. Check vendor dashboard for the claim

## Files Created

- `flow_private_key.pem` - Keep this SECRET and secure (never commit to git!)
- `flow_public_key.pem` - This is public and shared with Meta

## Security Notes

⚠️ **IMPORTANT**: Add to your `.gitignore`:
```
flow_private_key.pem
flow_public_key.pem
```

Never commit private keys to version control!
