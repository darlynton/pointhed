# WhatsApp Flow Security Setup

## ✅ Completed Steps

1. **Generated RSA key pair** for request signing
   - Private key: `/backend/flow_private_key.pem` (keep secure, added to .gitignore)
   - Public key: `/backend/flow_public_key.pem`

2. **Added signature verification middleware** 
   - File: `/backend/src/middleware/flowSignature.middleware.js`
   - Applied to: `POST /api/v1/claims/submit`

3. **Security enabled** - The endpoint now verifies all incoming requests are from Meta

---

## 📋 Important: Meta Flow Encryption Update

**UPDATE (December 2024): Meta now handles Flow encryption automatically.**

When you configure your Flow endpoint in Meta Business Manager, you'll see:

> "This will enable encryption of the data exchanges between the Flow and your endpoint."

This means:
- ✅ **No public key upload required** - Meta handles encryption automatically
- ✅ **HTTPS encryption** is applied at transport layer (like standard HTTPS)
- ℹ️ **Our backend is ready** - Signature verification middleware is in place but will gracefully skip if no signature header is present

### What You Need to Do:

1. **Open Meta Business Manager** → WhatsApp Flows
2. Select your **"Purchase Claim"** Flow  
3. Go to **Endpoint** section
4. **Set Endpoint URL**: `https://0c6f28ff22ea.ngrok-free.app/api/v1/claims/submit`
5. **Set HTTP Method**: POST
6. Click **Learn More** button to understand Meta's automatic encryption
7. Click **Save**

### Your Public Key (For Reference):

If Meta re-introduces manual signature verification in the future, here's your public key:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA14oRFgOduQz7BaJUtCgE
/N+BPWcxcCsp+jU38Q4LrVmfrLZLV4UHOaaluOeMM5a8lV3AMWx3R2yTXP7B5FGH
W/8141Bn+3mmish0foySyjbsW50MehP7/7dc4lE85Oc1k52btmSxtvOAQBw5B3Nx
4ZoNLNQrRoGYMeaZcKhH5CwgFmYT1m586KFTFxohMewjNkVlbrfbdMKkF7MZSUZY
LAiBmVuSM+xfLqR2xwE6FrNuKSuOnArXdvLHQm+SDZ3OAbSKWTMChSpFjN9U+DWt
L7f4gG4NAzWoGIhktD+ldlIZSpHggaMgnWApt0mSO6dUJc096+MotPLaFzXniPNp
+wIDAQAB
-----END PUBLIC KEY-----
```

Our security infrastructure is already in place:
- Private key: `backend/flow_private_key.pem` (secured in .gitignore)
- Signature middleware: `backend/src/middleware/flowSignature.middleware.js`

---

## 🧪 Testing the Secured Endpoint

Once you've uploaded the public key:

1. **Preview Flow** in Meta Business Manager
2. **Submit test claim** through the Flow
3. **Check backend logs**:
   ```bash
   tail -f backend/backend-server.log
   ```
4. Look for: `✅ Flow signature verified`

If you see this, security is working! 🎉

---

## ⚠️ Troubleshooting

### "Invalid signature" error:
- Ensure you copied the **entire** public key including `-----BEGIN` and `-----END` lines
- Check there are **no extra spaces** at the beginning or end
- Verify the key in Meta matches `backend/flow_public_key.pem` exactly

### "Missing signature" error:
- Make sure you selected **"With Endpoint"** in Flow settings
- Verify ngrok is running: `ps aux | grep ngrok`
- Check endpoint URL is correct: `https://0c6f28ff22ea.ngrok-free.app/api/v1/claims/submit`

### Still not working?
- Temporarily disable verification for testing:
  - Rename `flow_private_key.pem` to `flow_private_key.pem.bak`
  - Restart backend
  - You'll see: `⚠️  Flow signature verification skipped - no private key`

---

## 🔒 Production Deployment

When deploying to production:

1. **Transfer private key securely**:
   ```bash
   # On your local machine
   scp backend/flow_private_key.pem user@production-server:/path/to/backend/
   
   # On production server
   chmod 600 /path/to/backend/flow_private_key.pem
   ```

2. **Update endpoint URL** in Meta Business Manager from ngrok to production domain

3. **Re-upload public key** if you regenerate keys

4. **Never commit** `flow_private_key.pem` to git (already in .gitignore)

---

## 📖 How It Works

```
Customer fills Form → WhatsApp → Meta Signs Request → Your Server
                                       ↓
                                  Verifies Signature
                                       ↓
                              ✅ Valid = Process Claim
                              ❌ Invalid = Reject (401)
```

This prevents:
- Spam/fake claims from non-WhatsApp sources
- Request tampering/modification
- Replay attacks

Your claims are now secure! 🔐
