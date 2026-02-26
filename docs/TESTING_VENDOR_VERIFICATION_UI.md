# Testing the Complete Redemption Flow

## Quick Start

### Prerequisites
- Backend running on http://localhost:3001
- Frontend running on http://localhost:5173
- Vendor authenticated (logged in to dashboard)
- Customer with a phone number registered

## Step-by-Step Test

### 1. Generate a Redemption Code (via WhatsApp Webhook)

**Option A: Use test customer (+447404938935)**
```bash
# Check if customer exists
curl -X GET http://localhost:3001/api/v1/customers \
  -H "Authorization: Bearer <your-token>"

# If not found, run backend seed
cd backend && node scripts/seedTestCustomer.mjs
```

**Option B: Send WhatsApp message to bot**
Send WhatsApp message to your bot number with a button click:
- Customer sends: "Hi" or any message
- Bot responds with reward buttons
- Customer clicks "redeem_<rewardId>" button
- Backend webhook generates code automatically

### 2. Verify Code Was Generated

```bash
# Query database or check logs
tail -f /tmp/backend.log | grep "redemption_code\|REDEEM"

# Or check database directly (if you have access)
```

### 3. Test Vendor UI

1. **Login to Vendor Dashboard**
   - URL: http://localhost:5173
   - Enter vendor credentials

2. **Navigate to Rewards Tab**
   - Click "Rewards" in sidebar menu
   - Scroll down to "Pending Redemptions" section

3. **Verify Code Display**
   - Should see card with:
     - ✓ Redemption code (uppercase letters)
     - ✓ Customer name
     - ✓ Customer phone
     - ✓ Reward name
     - ✓ Points required
     - ✓ Time requested
     - ✓ Status badge "pending"

4. **Click Card to Open Dialog**
   - Code highlighted in large monospace
   - Three buttons visible:
     - "Verify Code" (blue, primary)
     - "Cancel & Refund" (red)
     - "Close" (ghost)

5. **Test Verify Code**
   - Click "Verify Code" button
   - Wait for loading state
   - See success toast: "Code verified successfully"
   - Status badge changes to "verified"
   - New button appears: "Mark as Fulfilled"

6. **Test Mark as Fulfilled**
   - Type optional notes in textarea (e.g., "Item shipped to +447404938935")
   - Click "Mark as Fulfilled"
   - Wait for loading state
   - See success toast: "Redemption fulfilled"
   - Dialog closes
   - Pending list refreshes (code removed if status=fulfilled)

7. **Test Cancel & Refund (Fresh Code)**
   - Generate another code
   - Click card to open dialog
   - Click "Cancel & Refund"
   - Confirm in browser popup
   - See success toast: "Redemption cancelled and points refunded"
   - Code removed from pending list

### 4. Verify Backend Logs

```bash
tail -50 /tmp/backend.log | grep -A5 -B5 "redemption\|fulfill"
```

Expected log entries:
- Redemption code generation
- Code verification with customer lookup
- Fulfillment with notes
- Cancellation with refund
- WhatsApp notifications sent

### 5. Verify Customer Notifications (Optional)

Check customer's WhatsApp:
- After verify: "Your redemption code has been verified"
- After fulfill: "Your redemption has been fulfilled"
- After cancel: "Your redemption has been cancelled, points refunded"

### 6. Test Error Scenarios

**Invalid Code Format**
- Click "Verify Code" with code already verified
- Expected: Error toast "Code already verified"

**No Pending Codes**
- No codes generated yet
- Navigate to Rewards Tab
- Expected: "No pending redemptions" message in section

**Network Error**
- Stop backend: `pkill -f "node src/server.js"`
- Try to verify code
- Expected: Network error toast
- Restart backend: `node /path/to/backend/src/server.js`

**Authorization Error**
- Logout and login again
- Backend should send new token
- Verify still works

### 7. Verify State Management

**Loading States**
- Click refresh button → See "Loading..." message
- Click verify → See "Verifying..." button
- Click fulfill → See "Processing..." button

**Dialog Cleanup**
- Open dialog
- Close dialog (X or Close button)
- Reopen → Notes field should be empty
- Selected redemption should be cleared

## Expected API Calls

When you interact with the UI, check network tab (F12 → Network):

```
GET /api/v1/redemptions?status=pending
  - Headers: Authorization: Bearer <token>
  - Response: { data: [...redemptions] }

POST /api/v1/redemptions/verify
  - Body: { redemptionCode: "XXXXX" }
  - Response: { id, status: "verified", ... }

POST /api/v1/redemptions/{id}/fulfill
  - Body: { notes: "..." }
  - Response: { id, status: "fulfilled", ... }

POST /api/v1/redemptions/{id}/cancel
  - Body: {}
  - Response: { id, status: "cancelled", ... }
```

## Troubleshooting

### Issue: "No pending redemptions" always shown

**Causes:**
1. No codes generated
2. Codes already fulfilled/cancelled
3. Wrong customer tenant
4. Wrong time range

**Fix:**
- Generate new code via WhatsApp button
- Check backend logs for generation success
- Verify customer belongs to same tenant

### Issue: Button says "Processing..." forever

**Causes:**
1. Backend not responding
2. Database connection issue
3. Network timeout

**Fix:**
```bash
# Check backend running
curl http://localhost:3001/health

# Check logs
tail -100 /tmp/backend.log | grep -i error

# Restart backend
pkill -f "node src/server.js"
node /path/to/backend/src/server.js > /tmp/backend.log 2>&1 &
```

### Issue: "Invalid token" error

**Causes:**
1. Token expired
2. Session cleared
3. Wrong auth method

**Fix:**
- Logout and login again
- Clear browser cookies/localStorage
- Check browser DevTools → Application → localStorage → auth_token

### Issue: Code not showing in pending list

**Causes:**
1. Code status not "pending"
2. API filter excluding it
3. Different tenant context

**Fix:**
- Check database directly (if possible)
- Verify code was generated
- Verify vendor tenant_id matches code tenant_id

## Success Checklist

- [ ] Vendor can see pending redemptions section
- [ ] Pending codes display with correct information
- [ ] Click on code opens verification dialog
- [ ] "Verify Code" button changes status to verified
- [ ] "Mark as Fulfilled" button appears after verify
- [ ] Notes field optional but accepts text
- [ ] "Mark as Fulfilled" button updates status to fulfilled
- [ ] Dialog closes after fulfill
- [ ] Pending list refreshes automatically
- [ ] "Cancel & Refund" works and shows confirmation
- [ ] All buttons show loading state while processing
- [ ] Error messages display as toasts
- [ ] Success messages display as toasts
- [ ] Mobile responsive (works on small screens)
- [ ] Can refresh list manually
- [ ] Logout and login again → Still works

## Performance Expectations

- List loads: < 2 seconds
- Verify code: < 1 second
- Fulfill redemption: < 1 second
- Cancel & refund: < 1 second
- WhatsApp notification: 1-5 seconds (async)

## Notes

- All operations use Bearer token authentication
- Role must be 'staff' or 'admin' to access endpoints
- All times displayed in browser local timezone
- Codes are case-insensitive in database (stored as uppercase)
- Notes field has 500 character limit (set in backend)
