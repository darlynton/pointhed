# When Redemption Code is Copied - Complete Flow

## Answer: What Happens Next

When a customer receives and copies their redemption code (e.g., `RLVGOX8RNFJ`), here's the complete flow:

### Stage 1: Customer Has Code ✅
```
Customer WhatsApp Screen:
🎉 Redemption Successful!
🎟️ Code: RLVGOX8RNFJ
Show this code to vendor to claim your reward.
💎 Remaining Balance: 0 points

Status: Code is "pending" in database
```

### Stage 2: Customer Goes to Business
Customer travels to the business location with:
- WhatsApp message visible on phone (code screenshot)
- OR code written down
- Ready to show staff

### Stage 3: Staff Verifies Code (New Feature ✅)
When customer shows code to staff:

```bash
# Staff enters code into vendor system
POST /api/v1/redemptions/verify
{
  "redemptionCode": "RLVGOX8RNFJ"
}

Response:
{
  "success": true,
  "data": {
    "code": "RLVGOX8RNFJ",
    "reward": { "name": "Free Espresso Shot", "points": 50 },
    "customer": { "name": "John Doe", "phone": "+447404938935" },
    "verifiedAt": "2026-01-20T13:45:00Z",
    "status": "verified"
  }
}
```

**What happens in system:**
- Code looked up in database ✓
- Found! Status changes: pending → **verified**
- Staff member ID recorded (who verified)
- Timestamp recorded
- Customer sent WhatsApp: "✅ Your code has been verified"

### Stage 4: Reward Given to Customer
Staff physically gives the reward (espresso shot) to customer

### Stage 5: Staff Marks as Fulfilled (New Feature ✅)
After customer receives reward:

```bash
# Staff clicks "Fulfilled" button or calls API
POST /api/v1/redemptions/:id/fulfill
{
  "notes": "Gave customer espresso shot at counter"
}

Response:
{
  "success": true,
  "data": {
    "status": "fulfilled",
    "fulfilledAt": "2026-01-20T13:46:00Z"
  }
}
```

**What happens in system:**
- Code status changes: verified → **fulfilled**
- Fulfillment timestamp recorded
- Staff notes saved (optional)
- Customer sent WhatsApp: "🎉 Reward fulfilled!"
- Code moved from "pending" to "history" section in vendor dashboard

### Stage 6: Complete! ✅
```
Status in System: "fulfilled"
│
├─ Customer: Received reward ✓
├─ Vendor: Audited fulfillment ✓
├─ Points: Deducted correctly ✓
└─ Tracking: Complete record maintained ✓
```

---

## What If Something Goes Wrong?

### Scenario 1: Customer Lost Code
```
Before showing code:
POST /api/v1/redemptions/:id/cancel
{
  "reason": "Customer lost code"
}

Result:
- Status → "cancelled"
- 50 points refunded to customer
- New message sent: "Points refunded due to lost code"
```

### Scenario 2: Wrong Code Entered
```
POST /api/v1/redemptions/verify
{
  "redemptionCode": "WRONG123"
}

Response (404):
{
  "error": "Redemption code not found or already cancelled"
}
```

### Scenario 3: Code Already Verified
```
POST /api/v1/redemptions/verify
{
  "redemptionCode": "RLVGOX8RNFJ"  // Already verified
}

Response (400):
{
  "error": "Code already verified"
}
```

---

## Dashboard Views for Vendors

### Pending Redemptions
```
GET /api/v1/redemptions?status=pending

Shows:
┌─────────────────────────────────────────────┐
│ Code      │ Reward           │ Customer     │
├─────────────────────────────────────────────┤
│ RLVGOX8R  │ Free Espresso    │ John Doe     │
│ PENDING   │ 50 pts           │ +44740...    │
├─────────────────────────────────────────────┤
│ [Verify]  │                                 │
└─────────────────────────────────────────────┘
```

### Verified Waiting for Fulfillment
```
GET /api/v1/redemptions?status=verified

Shows:
┌──────────────────────────────────────────────┐
│ Code      │ Verified By │ Time Verified      │
├──────────────────────────────────────────────┤
│ RLVGOX8R  │ Sarah (Staff)│ 13:45 Jan 20      │
│ VERIFIED  │ Espresso     │ 5 min ago         │
├──────────────────────────────────────────────┤
│ [Fulfill] │                                  │
└──────────────────────────────────────────────┘
```

### Completed/Fulfilled
```
GET /api/v1/redemptions?status=fulfilled

Shows:
┌────────────────────────────────────────────┐
│ Code     │ Fulfilled │ Notes               │
├────────────────────────────────────────────┤
│ RLVGOX8R │ 13:46     │ "Gave at counter"  │
│ DONE ✓   │ Jan 20    │                    │
└────────────────────────────────────────────┘
```

### Statistics/Analytics
```
GET /api/v1/redemptions/stats

{
  "total": 50,           // Total codes issued
  "pending": 5,          // Not yet shown to vendor
  "verified": 8,         // Shown, code valid
  "fulfilled": 35,       // Actually given ✓
  "cancelled": 2,        // Refunded
  "completionRate": "70%"  // 35/50 completed
}
```

---

## Timeline of a Redemption

```
T+0:00    Customer clicks "Redeem"
          → Code generated: RLVGOX8RNFJ
          → WhatsApp sent to customer
          → Status: PENDING

T+5:00    Customer arrives at business
          → Shows code to staff
          → Status: Still PENDING

T+5:15    Staff verifies code
          → POST /verify
          → Status: VERIFIED ✓
          → Timestamp: 13:45
          → Verified by: Sarah (staff)

T+6:00    Customer receives reward
          → Staff gives espresso shot

T+6:30    Staff marks as fulfilled
          → POST /fulfill
          → Status: FULFILLED ✓
          → Timestamp: 13:46
          → Notes: "Gave at counter"

Result:   Code in history with complete audit trail
```

---

## API Summary

| Action | Endpoint | Method | Result |
|--------|----------|--------|--------|
| Customer gets code | /webhook/whatsapp | POST | pending |
| View pending | /api/v1/redemptions | GET | List |
| Verify code | /api/v1/redemptions/verify | POST | verified |
| Mark fulfilled | /api/v1/redemptions/:id/fulfill | POST | fulfilled |
| Cancel/refund | /api/v1/redemptions/:id/cancel | POST | cancelled |
| View stats | /api/v1/redemptions/stats | GET | Analytics |

---

## Status: Complete & Live ✅

- ✅ Customer gets code (WhatsApp)
- ✅ Vendor lists pending codes
- ✅ Vendor verifies code when shown
- ✅ Vendor marks as fulfilled
- ✅ System tracks everything
- ✅ Customer notified at each step
- ✅ Can cancel/refund if needed
- ✅ Analytics available

**Ready for production!**
