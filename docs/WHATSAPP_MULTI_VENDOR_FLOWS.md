# WhatsApp Multi-Vendor Conversation Flows

## Overview: How Multi-Vendor Management Works

**Key Concepts:**
- **One Phone Number, Multiple Programs**: A customer can be enrolled in unlimited vendor programs
- **Context-Based Routing**: System determines which vendor based on QR code, session, or explicit selection
- **Data Isolation**: All queries filtered by vendor_id to ensure complete tenant separation
- **Seamless Switching**: Customers can manage multiple programs through a single WhatsApp conversation

**Architecture Highlights:**
- Each customer can have multiple entries in `customer_enrollments` table (one per vendor)
- Points, tiers, and rewards are completely isolated per vendor
- Session context tracks active vendor to route commands correctly
- QR codes provide instant context switching

---

## MULTI-VENDOR CUSTOMER FLOWS

### Flow 1: Multi-Vendor Enrollment Journey

```
SCENARIO: Customer (John) enrolls with 3 different vendors over time

┌─────────────────────────────────────────────────────────┐
│ DAY 1: First Vendor (Mama Chi's Kitchen)               │
└─────────────────────────────────────────────────────────┘

Customer scans QR at Mama Chi's Kitchen
Opens: wa.me/234XXX?text=MAMAC001

┌─────────────────────────────────────────────────────────┐
│ Bot: 🎉 Welcome to *Mama Chi's Kitchen Rewards!*       │
│                                                          │
│ Earn points with every purchase of delicious food!      │
│                                                          │
│ Confirm your phone: +234 801 111 1111                  │
│ 1️⃣ Confirm | 2️⃣ Different number                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Customer: 1                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: ✅ Enrolled in Mama Chi's Kitchen!                 │
│                                                          │
│ 🎁 Welcome Bonus: +50 points                            │
│ Current Balance: *50 points*                            │
│                                                          │
│ Reply MENU anytime to manage your rewards!              │
└─────────────────────────────────────────────────────────┘

DATABASE OPERATIONS:
INSERT INTO customers (phone_number, created_via)
VALUES ('+234 801 111 1111', 'qr_code');

INSERT INTO customer_enrollments (customer_id, vendor_id, points_balance, status)
VALUES (customer_id, 'mamachis-kitchen-uuid', 50, 'active');

UPDATE customers SET last_active_vendor_id = 'mamachis-kitchen-uuid';

┌─────────────────────────────────────────────────────────┐
│ DAY 5: Second Vendor (Beauty Hub Lagos)                │
└─────────────────────────────────────────────────────────┘

Customer scans QR at Beauty Hub Lagos
Opens: wa.me/234XXX?text=BEAUTY001

┌─────────────────────────────────────────────────────────┐
│ Bot: 💄 Welcome to *Beauty Hub Lagos!*                  │
│                                                          │
│ Hey! I see you're already using our loyalty platform.   │
│ (You have a program with Mama Chi's Kitchen)           │
│                                                          │
│ Join Beauty Hub Lagos rewards program?                  │
│ 1️⃣ Yes, enroll me | 2️⃣ No thanks                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Customer: 1                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: ✅ Enrolled in Beauty Hub Lagos!                   │
│                                                          │
│ 🎁 Welcome Bonus: +50 points                            │
│ Current Balance: *50 points*                            │
│                                                          │
│ 💡 You now have 2 active loyalty programs!             │
│ Reply PROGRAMS anytime to see all                       │
└─────────────────────────────────────────────────────────┘

DATABASE OPERATIONS:
INSERT INTO customer_enrollments (customer_id, vendor_id, points_balance, status)
VALUES (existing_customer_id, 'beauty-hub-uuid', 50, 'active');

UPDATE customers SET last_active_vendor_id = 'beauty-hub-uuid';

┌─────────────────────────────────────────────────────────┐
│ DAY 12: Third Vendor (Fresh Groceries)                 │
└─────────────────────────────────────────────────────────┘

Customer scans QR at Fresh Groceries
Opens: wa.me/234XXX?text=FRESH001

[Same enrollment pattern - customer now has 3 active programs]

DATABASE STATE AFTER 3 ENROLLMENTS:
┌─────────────────────────────────────────────────────────┐
│ customers table:                                        │
│ - phone_number: +234 801 111 1111                      │
│ - last_active_vendor_id: fresh-groceries-uuid          │
│                                                          │
│ customer_enrollments table:                             │
│ 1. vendor_id: mamachis-kitchen | points: 50            │
│ 2. vendor_id: beauty-hub       | points: 50            │
│ 3. vendor_id: fresh-groceries  | points: 50            │
└─────────────────────────────────────────────────────────┘
```

---

### Flow 2: Context Switching Between Vendors

```
SCENARIO: Customer wants to check points but doesn't specify which vendor

┌─────────────────────────────────────────────────────────┐
│ Customer: Hi                                            │
│ (Messages bot without scanning QR - no vendor context) │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 👋 Welcome back John!                              │
│                                                          │
│ You have loyalty programs with:                         │
│                                                          │
│ 🍲 1️⃣ Mama Chi's Kitchen (250 pts)                     │
│ 💄 2️⃣ Beauty Hub Lagos (180 pts)                       │
│ 🛒 3️⃣ Fresh Groceries (420 pts)                        │
│                                                          │
│ Reply with number to select, or scan vendor QR          │
└─────────────────────────────────────────────────────────┘

DATABASE QUERY:
SELECT e.vendor_id, v.business_name, e.points_balance, v.emoji
FROM customer_enrollments e
JOIN vendors v ON e.vendor_id = v.id
WHERE e.customer_id = 'john-uuid' AND e.status = 'active'
ORDER BY e.last_interaction_at DESC;

┌─────────────────────────────────────────────────────────┐
│ Customer: 1                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 🍲 *Mama Chi's Kitchen*                            │
│                                                          │
│ Your Balance: *250 points*                              │
│ Lifetime Earned: 320 points                             │
│                                                          │
│ Main Menu:                                               │
│ 1️⃣ View Rewards                                         │
│ 2️⃣ Purchase History                                     │
│ 3️⃣ Redeem Points                                        │
│ 4️⃣ Switch Vendor                                        │
│ 5️⃣ View All Programs                                    │
└─────────────────────────────────────────────────────────┘

DATABASE UPDATE:
UPDATE customers 
SET last_active_vendor_id = 'mamachis-kitchen-uuid',
    conversation_context = jsonb_build_object('vendor_id', 'mamachis-kitchen-uuid')
WHERE id = 'john-uuid';

UPDATE customer_enrollments
SET last_interaction_at = NOW()
WHERE customer_id = 'john-uuid' AND vendor_id = 'mamachis-kitchen-uuid';

┌─────────────────────────────────────────────────────────┐
│ CONTEXT SWITCH: Customer scans different QR mid-session│
└─────────────────────────────────────────────────────────┘

While viewing Mama Chi's menu, customer scans Beauty Hub QR
Opens: wa.me/234XXX?text=BEAUTY001

┌─────────────────────────────────────────────────────────┐
│ Bot: 💄 *Beauty Hub Lagos*                              │
│                                                          │
│ Switched to Beauty Hub Lagos                            │
│                                                          │
│ Your Balance: *180 points*                              │
│                                                          │
│ What would you like to do?                              │
│ 1️⃣ View Rewards                                         │
│ 2️⃣ Purchase History                                     │
│ 3️⃣ Redeem Points                                        │
│ 4️⃣ Back to Mama Chi's Kitchen                          │
└─────────────────────────────────────────────────────────┘

CONTEXT SWITCHING LOGIC:
1. QR code parameter (text=BEAUTY001) overrides current session
2. last_active_vendor_id updated to new vendor
3. All subsequent queries filtered by new vendor_id
4. Session context preserved for quick switching back
```

---

### Flow 3: View All Programs Summary

```
┌─────────────────────────────────────────────────────────┐
│ Customer: PROGRAMS                                      │
│ (or "show all" or "my programs")                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 🎁 *Your Loyalty Programs*                         │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 🍲 1️⃣ *Mama Chi's Kitchen*                             │
│    Balance: 250 points                                  │
│    Tier: Silver Member ⭐                               │
│    Last purchase: 2 days ago                            │
│    Next reward: Free Meal (300 pts) - 83% there!       │
│    ████████░░                                           │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 💄 2️⃣ *Beauty Hub Lagos*                               │
│    Balance: 180 points                                  │
│    Tier: Bronze Member 🥉                               │
│    Last purchase: 5 days ago                            │
│    Next reward: Free Manicure (200 pts) - 90% there!   │
│    █████████░                                           │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 🛒 3️⃣ *Fresh Groceries*                                │
│    Balance: 420 points ⭐ Highest!                      │
│    Tier: Gold Member 🏆                                 │
│    Last purchase: Yesterday                             │
│    Next reward: Free Delivery (100 pts) ✅ Available!  │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                          │
│ 📊 Total Points: *850 across 3 vendors*                │
│ 🎯 Total Lifetime Earned: 1,240 points                 │
│                                                          │
│ Reply with number to manage program                     │
└─────────────────────────────────────────────────────────┘

DATABASE QUERY:
SELECT 
  v.business_name,
  v.emoji,
  e.points_balance,
  e.tier,
  e.lifetime_points_earned,
  e.last_purchase_at,
  (SELECT MIN(r.points_required) 
   FROM rewards r 
   WHERE r.vendor_id = v.id 
   AND r.points_required > e.points_balance) as next_reward_points,
  (SELECT name FROM rewards r 
   WHERE r.vendor_id = v.id 
   AND r.points_required = next_reward_points LIMIT 1) as next_reward_name
FROM customer_enrollments e
JOIN vendors v ON e.vendor_id = v.id
WHERE e.customer_id = 'john-uuid' AND e.status = 'active'
ORDER BY e.points_balance DESC;
```

---

### Flow 4: Purchase Notification with Multi-Vendor Context

```
SCENARIO: Staff at Fresh Groceries logs a purchase for John

Staff logs via vendor portal:
- Customer: +234 801 111 1111
- Amount: ₦8,500
- Points: +85 points

SYSTEM BEHAVIOR:
1. Identifies customer by phone number
2. Identifies vendor from staff's login context
3. Updates points for that specific vendor enrollment
4. Sends notification branded with vendor identity

┌─────────────────────────────────────────────────────────┐
│ Bot: 🛍️ *Purchase Confirmed!*                           │
│                                                          │
│ 🛒 *Fresh Groceries*                                    │
│                                                          │
│ Amount: ₦8,500                                          │
│ Points Earned: +85 points                               │
│                                                          │
│ New Balance: *505 points*                               │
│ Lifetime Earned: 655 points                             │
│                                                          │
│ 🎉 You're now a *Gold Member!*                          │
│                                                          │
│ 🎁 Available rewards:                                   │
│ • Free Delivery (100 pts) ✅                            │
│ • ₦500 Discount (250 pts) ✅                            │
│ • Free Basket (500 pts) ✅                              │
│                                                          │
│ Reply REWARDS to redeem from Fresh Groceries            │
│ Reply PROGRAMS to see all your loyalty programs         │
└─────────────────────────────────────────────────────────┘

DATABASE OPERATIONS:
-- Insert purchase (scoped to vendor)
INSERT INTO purchases (customer_id, vendor_id, amount_ngn, logged_by_user_id)
VALUES ('john-uuid', 'fresh-groceries-uuid', 8500, 'staff-uuid');

-- Update points (specific enrollment only)
UPDATE customer_enrollments
SET points_balance = points_balance + 85,
    lifetime_points_earned = lifetime_points_earned + 85,
    last_purchase_at = NOW()
WHERE customer_id = 'john-uuid' AND vendor_id = 'fresh-groceries-uuid';

-- Points transaction log
INSERT INTO points_transactions (customer_id, vendor_id, points, type, reference_id)
VALUES ('john-uuid', 'fresh-groceries-uuid', 85, 'earned', 'purchase-uuid');

-- Check tier upgrade
SELECT check_tier_upgrade('john-uuid', 'fresh-groceries-uuid');

ISOLATION NOTE:
- John's other programs (Mama Chi's, Beauty Hub) are NOT affected
- Only Fresh Groceries enrollment is updated
- Notification clearly shows which vendor
```

---

### Flow 5: Vendor-Specific Redemption

```
SCENARIO: Customer wants to redeem but has multiple programs

┌─────────────────────────────────────────────────────────┐
│ Customer: REDEEM                                        │
│ (No vendor context - customer just typed command)      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 🎁 *Which program to redeem from?*                 │
│                                                          │
│ 🍲 1️⃣ Mama Chi's Kitchen (250 pts)                     │
│    2 rewards available to you                           │
│                                                          │
│ 💄 2️⃣ Beauty Hub Lagos (180 pts)                       │
│    3 rewards available to you                           │
│                                                          │
│ 🛒 3️⃣ Fresh Groceries (505 pts) ⭐                     │
│    5 rewards available to you                           │
│                                                          │
│ Reply with number                                       │
└─────────────────────────────────────────────────────────┘

DATABASE QUERY:
SELECT 
  v.business_name,
  v.emoji,
  e.points_balance,
  (SELECT COUNT(*) FROM rewards r 
   WHERE r.vendor_id = v.id 
   AND r.points_required <= e.points_balance 
   AND r.status = 'active') as available_rewards_count
FROM customer_enrollments e
JOIN vendors v ON e.vendor_id = v.id
WHERE e.customer_id = 'john-uuid' AND e.status = 'active';

┌─────────────────────────────────────────────────────────┐
│ Customer: 3                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 🛒 *Fresh Groceries Rewards* 🎁                    │
│                                                          │
│ Your Balance: 505 points                                │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 1️⃣ *Free Delivery* 🚚                                  │
│    100 points | 234 redeemed                            │
│    Free delivery on your next order                     │
│    ✅ You can redeem                                    │
│                                                          │
│ 2️⃣ *₦500 Discount* 💰                                  │
│    250 points | 156 redeemed                            │
│    ₦500 off purchases over ₦5,000                      │
│    ✅ You can redeem                                    │
│                                                          │
│ 3️⃣ *Free Shopping Basket* 🧺                           │
│    500 points | Limited: 8 left                         │
│    Reusable eco-friendly basket                         │
│    ✅ You can redeem                                    │
│                                                          │
│ 4️⃣ *₦2,000 Voucher* 🎫                                │
│    1000 points | 45 redeemed                            │
│    Valid for 30 days                                    │
│    ❌ Need 495 more points                              │
│                                                          │
│ Reply with number to redeem                             │
└─────────────────────────────────────────────────────────┘

DATABASE QUERY (Filtered by vendor):
SELECT 
  id,
  name,
  description,
  points_required,
  redemption_count,
  stock_quantity,
  status
FROM rewards
WHERE vendor_id = 'fresh-groceries-uuid' -- CRITICAL: Scoped to vendor
  AND status = 'active'
ORDER BY points_required ASC;

┌─────────────────────────────────────────────────────────┐
│ Customer: 3                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 🎉 *Confirm Redemption*                            │
│                                                          │
│ 🛒 Fresh Groceries                                      │
│ Reward: Free Shopping Basket 🧺                         │
│                                                          │
│ Points Required: 500                                    │
│ Your Balance: 505                                       │
│ Balance After: 5                                        │
│                                                          │
│ Confirm?                                                 │
│ 1️⃣ Yes, redeem | 2️⃣ Cancel                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Customer: 1                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: ✅ *Reward Redeemed Successfully!*                 │
│                                                          │
│ 🛒 *Fresh Groceries*                                    │
│                                                          │
│ Show this code to Fresh Groceries staff:                │
│                                                          │
│ 🎫 *FRE-GH7K9M*                                         │
│                                                          │
│ Reward: Free Shopping Basket 🧺                         │
│ Valid until: Jan 30, 2024 (7 days)                     │
│                                                          │
│ New Balance: *5 points*                                 │
│                                                          │
│ 💡 Keep shopping at Fresh Groceries to earn more!      │
│                                                          │
│ Reply PROGRAMS to check your other loyalty programs     │
└─────────────────────────────────────────────────────────┘

DATABASE OPERATIONS (Vendor-Scoped):
-- Deduct points from THIS vendor enrollment only
UPDATE customer_enrollments
SET points_balance = points_balance - 500
WHERE customer_id = 'john-uuid' AND vendor_id = 'fresh-groceries-uuid';

-- Create redemption record
INSERT INTO reward_redemptions 
(customer_id, vendor_id, reward_id, points_deducted, redemption_code, expires_at)
VALUES 
('john-uuid', 'fresh-groceries-uuid', 'basket-uuid', 500, 'FRE-GH7K9M', NOW() + INTERVAL '7 days');

-- Points transaction
INSERT INTO points_transactions 
(customer_id, vendor_id, points, type, reference_id)
VALUES 
('john-uuid', 'fresh-groceries-uuid', -500, 'redeemed', 'redemption-uuid');

-- Update reward stock
UPDATE rewards
SET stock_quantity = stock_quantity - 1,
    redemption_count = redemption_count + 1
WHERE id = 'basket-uuid' AND vendor_id = 'fresh-groceries-uuid';

CRITICAL NOTE:
- John's other vendor enrollments (Mama Chi's: 250pts, Beauty Hub: 180pts) remain unchanged
- Only Fresh Groceries balance affected
- Redemption code scoped to Fresh Groceries vendor_id
```

---

### Flow 6: Smart Context Commands

```
SCENARIO: Customer uses commands with implicit context

┌─────────────────────────────────────────────────────────┐
│ CASE 1: Command with Active Context                    │
└─────────────────────────────────────────────────────────┘

Customer previously selected Mama Chi's Kitchen (stored in session)

┌─────────────────────────────────────────────────────────┐
│ Customer: POINTS                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
System checks: last_active_vendor_id = 'mamachis-kitchen-uuid'

┌─────────────────────────────────────────────────────────┐
│ Bot: 🍲 *Mama Chi's Kitchen*                            │
│                                                          │
│ 💰 Your Points: *250 points*                            │
│                                                          │
│ Lifetime Earned: 320 points                             │
│ Tier: Silver Member ⭐                                  │
│                                                          │
│ Reply PROGRAMS to see all your loyalty programs         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CASE 2: Command without Context                        │
└─────────────────────────────────────────────────────────┘

Customer hasn't interacted in 24 hours (session expired)

┌─────────────────────────────────────────────────────────┐
│ Customer: REWARDS                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
System checks: last_active_vendor_id = NULL or expired

┌─────────────────────────────────────────────────────────┐
│ Bot: 🎁 *Which program's rewards?*                      │
│                                                          │
│ 🍲 1️⃣ Mama Chi's Kitchen (250 pts)                     │
│ 💄 2️⃣ Beauty Hub Lagos (180 pts)                       │
│ 🛒 3️⃣ Fresh Groceries (505 pts)                        │
│                                                          │
│ 💡 Tip: Scan a vendor's QR code to set context         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CASE 3: QR Code Overrides Everything                   │
└─────────────────────────────────────────────────────────┘

Customer in Mama Chi's context, then scans Beauty Hub QR

┌─────────────────────────────────────────────────────────┐
│ Customer clicks: wa.me/234XXX?text=BEAUTY001            │
└─────────────────────────────────────────────────────────┘
                        ↓
System immediately switches context based on BEAUTY001 code

┌─────────────────────────────────────────────────────────┐
│ Bot: 💄 *Beauty Hub Lagos*                              │
│                                                          │
│ Switched to Beauty Hub Lagos                            │
│                                                          │
│ Your Balance: *180 points*                              │
│ Tier: Bronze Member 🥉                                  │
│                                                          │
│ What would you like to do?                              │
│ 1️⃣ View Rewards                                         │
│ 2️⃣ Purchase History                                     │
│ 3️⃣ Check Points                                         │
│ 4️⃣ View All Programs                                    │
└─────────────────────────────────────────────────────────┘

CONTEXT RESOLUTION PRIORITY:
1. QR code parameter (highest priority)
2. Explicit vendor selection in conversation
3. last_active_vendor_id from database
4. Ask customer to select vendor
```

---

### Flow 7: Vendor-Specific Broadcast Messages

```
SCENARIO: Fresh Groceries sends broadcast to their customers

Vendor Portal Action:
- Fresh Groceries creates broadcast: "Weekend Sale - Double Points!"
- Target: Active customers with 3+ purchases in last 30 days
- System sends to 1,247 eligible customers

┌─────────────────────────────────────────────────────────┐
│ Bot: 🛒 *Fresh Groceries* - Special Announcement        │
│                                                          │
│ 🎉 *WEEKEND DOUBLE POINTS SALE!*                        │
│                                                          │
│ This Saturday & Sunday only:                            │
│ Earn 2X points on ALL purchases! 🔥                     │
│                                                          │
│ Your current Fresh Groceries balance: 505 points        │
│                                                          │
│ 💡 Spend ₦10,000 → Earn 200 points (instead of 100)   │
│                                                          │
│ Valid: Jan 27-28, 2024                                  │
│                                                          │
│ Reply STOP to unsubscribe from Fresh Groceries offers   │
│ Reply PROGRAMS to see all your loyalty programs         │
└─────────────────────────────────────────────────────────┘

DATABASE QUERY (Scoped to vendor):
SELECT c.phone_number, e.points_balance
FROM customers c
JOIN customer_enrollments e ON c.id = e.customer_id
WHERE e.vendor_id = 'fresh-groceries-uuid'
  AND e.status = 'active'
  AND e.marketing_opted_in = true
  AND c.opted_in = true
  AND (
    SELECT COUNT(*) FROM purchases p
    WHERE p.customer_id = c.id 
    AND p.vendor_id = 'fresh-groceries-uuid'
    AND p.created_at > NOW() - INTERVAL '30 days'
  ) >= 3;

IMPORTANT NOTES:
1. Only customers enrolled with Fresh Groceries receive message
2. Customers enrolled with Mama Chi's/Beauty Hub do NOT receive it
3. Message branded with Fresh Groceries identity
4. Unsubscribe only affects Fresh Groceries broadcasts
5. Complete vendor isolation maintained

┌─────────────────────────────────────────────────────────┐
│ SAME DAY: Mama Chi's Kitchen sends different broadcast │
└─────────────────────────────────────────────────────────┘

Mama Chi's broadcast: "New Menu Items!"

┌─────────────────────────────────────────────────────────┐
│ Bot: 🍲 *Mama Chi's Kitchen* - What's New               │
│                                                          │
│ 🆕 *New Menu Alert!*                                    │
│                                                          │
│ Try our new Jollof Special & Suya Platter!             │
│                                                          │
│ Your Mama Chi's balance: 250 points                     │
│                                                          │
│ 🎁 Special: Order today, get +20 bonus points!         │
│                                                          │
│ Reply MENU to see all options                           │
└─────────────────────────────────────────────────────────┘

John receives BOTH messages (enrolled in both programs):
- Fresh Groceries broadcast at 10:00 AM
- Mama Chi's broadcast at 2:00 PM

Each message is:
- Branded with correct vendor
- Shows correct points balance for that vendor
- Independent unsubscribe options
```

---

### Flow 8: Cross-Vendor Purchase History

```
┌─────────────────────────────────────────────────────────┐
│ Customer: HISTORY                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 📊 *Which program's history?*                      │
│                                                          │
│ 🍲 1️⃣ Mama Chi's Kitchen                               │
│ 💄 2️⃣ Beauty Hub Lagos                                 │
│ 🛒 3️⃣ Fresh Groceries                                  │
│ 📈 4️⃣ All Programs Combined                            │
│                                                          │
│ Reply with number                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Customer: 4                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 📈 *All Your Loyalty Activity*                     │
│                                                          │
│ Last 30 Days                                            │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Jan 22 │ 🛒 Fresh Groceries                             │
│        │ Purchase: ₦8,500 → +85 pts                    │
│        │ New Balance: 505 pts                           │
│                                                          │
│ Jan 20 │ 💄 Beauty Hub Lagos                            │
│        │ Redeemed: Free Manicure (-200 pts)             │
│        │ New Balance: 180 pts                           │
│                                                          │
│ Jan 18 │ 🍲 Mama Chi's Kitchen                          │
│        │ Purchase: ₦12,000 → +120 pts                  │
│        │ New Balance: 250 pts                           │
│                                                          │
│ Jan 15 │ 🛒 Fresh Groceries                             │
│        │ Purchase: ₦15,000 → +150 pts                  │
│        │ Milestone Bonus: +50 pts                       │
│                                                          │
│ Jan 12 │ 🍲 Mama Chi's Kitchen                          │
│        │ Redeemed: Free Coffee (-50 pts)                │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                          │
│ 📊 Summary (Last 30 Days):                              │
│ • Total Spent: ₦35,500                                  │
│ • Points Earned: 405                                    │
│ • Points Redeemed: 250                                  │
│ • Active Vendors: 3                                     │
│                                                          │
│ Reply with vendor number for detailed history           │
└─────────────────────────────────────────────────────────┘

DATABASE QUERY:
SELECT 
  v.business_name,
  v.emoji,
  pt.created_at,
  pt.points,
  pt.transaction_type,
  CASE 
    WHEN pt.transaction_type = 'earned' THEN p.amount_ngn
    WHEN pt.transaction_type = 'redeemed' THEN r.name
  END as details
FROM points_transactions pt
JOIN vendors v ON pt.vendor_id = v.id
LEFT JOIN purchases p ON pt.reference_type = 'purchase' AND pt.reference_id = p.id
LEFT JOIN reward_redemptions rr ON pt.reference_type = 'redemption' AND pt.reference_id = rr.id
LEFT JOIN rewards r ON rr.reward_id = r.id
WHERE pt.customer_id = 'john-uuid'
  AND pt.created_at > NOW() - INTERVAL '30 days'
ORDER BY pt.created_at DESC
LIMIT 10;
```

---

### Flow 9: Multi-Vendor Opt-Out Management

```
SCENARIO: Customer wants to unsubscribe from one vendor's broadcasts

┌─────────────────────────────────────────────────────────┐
│ Customer: STOP                                          │
│ (While in Fresh Groceries context)                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: 🛒 *Fresh Groceries*                               │
│                                                          │
│ Are you sure you want to unsubscribe?                   │
│                                                          │
│ You will:                                                │
│ ✅ Keep your 505 points                                 │
│ ✅ Still earn & redeem rewards                          │
│ ❌ Stop receiving Fresh Groceries broadcasts            │
│                                                          │
│ Your other programs (Mama Chi's, Beauty Hub)           │
│ will NOT be affected.                                   │
│                                                          │
│ Unsubscribe options:                                     │
│ 1️⃣ Unsubscribe from Fresh Groceries only               │
│ 2️⃣ Unsubscribe from ALL vendors                        │
│ 3️⃣ Cancel, keep subscribed                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Customer: 1                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Bot: ✅ Unsubscribed from Fresh Groceries broadcasts    │
│                                                          │
│ You will no longer receive:                             │
│ • Fresh Groceries promotions                            │
│ • Fresh Groceries special offers                        │
│                                                          │
│ You WILL still receive:                                 │
│ • Purchase confirmations                                │
│ • Reward redemption codes                               │
│ • Points expiry warnings                                │
│                                                          │
│ You're still subscribed to:                             │
│ • 🍲 Mama Chi's Kitchen                                 │
│ • 💄 Beauty Hub Lagos                                   │
│                                                          │
│ Reply START to re-subscribe anytime                     │
└─────────────────────────────────────────────────────────┘

DATABASE OPERATIONS:
UPDATE customer_enrollments
SET marketing_opted_in = false,
    marketing_opted_out_at = NOW()
WHERE customer_id = 'john-uuid' 
  AND vendor_id = 'fresh-groceries-uuid';

-- Other vendor enrollments remain opted_in = true
```

---

## TECHNICAL IMPLEMENTATION

### Context Resolution Algorithm

```javascript
async function resolveVendorContext(customerId, messageText, urlParams) {
  // Priority 1: QR code parameter (highest)
  if (urlParams.text) {
    const vendorCode = urlParams.text;
    const vendor = await getVendorByCode(vendorCode);
    if (vendor) {
      await updateActiveContext(customerId, vendor.id);
      return vendor;
    }
  }
  
  // Priority 2: Explicit vendor selection in conversation
  const conversationContext = await getConversationContext(customerId);
  if (conversationContext?.selected_vendor_id) {
    return await getVendorById(conversationContext.selected_vendor_id);
  }
  
  // Priority 3: Last active vendor (within 24 hours)
  const customer = await getCustomer(customerId);
  if (customer.last_active_vendor_id) {
    const lastInteraction = await getLastInteraction(customerId, customer.last_active_vendor_id);
    const hoursSinceLastInteraction = (Date.now() - lastInteraction) / (1000 * 60 * 60);
    
    if (hoursSinceLastInteraction < 24) {
      return await getVendorById(customer.last_active_vendor_id);
    }
  }
  
  // Priority 4: Check if customer has only one enrollment
  const enrollments = await getCustomerEnrollments(customerId);
  if (enrollments.length === 1) {
    await updateActiveContext(customerId, enrollments[0].vendor_id);
    return await getVendorById(enrollments[0].vendor_id);
  }
  
  // Priority 5: Ask customer to select vendor
  return null; // Triggers vendor selection prompt
}
```

### Vendor-Scoped Database Queries

```javascript
// CORRECT: All queries filtered by vendor_id
async function getCustomerPoints(customerId, vendorId) {
  return await db.query(
    `SELECT points_balance, tier, lifetime_points_earned
     FROM customer_enrollments
     WHERE customer_id = $1 AND vendor_id = $2`,
    [customerId, vendorId]
  );
}

async function getAvailableRewards(customerId, vendorId) {
  const enrollment = await getEnrollment(customerId, vendorId);
  
  return await db.query(
    `SELECT id, name, description, points_required, stock_quantity
     FROM rewards
     WHERE vendor_id = $1 -- CRITICAL: Scoped to vendor
       AND status = 'active'
       AND points_required <= $2
     ORDER BY points_required ASC`,
    [vendorId, enrollment.points_balance]
  );
}

async function logPurchase(customerId, vendorId, amountNgn, loggedByUserId) {
  // Verify staff belongs to this vendor
  const staff = await getUser(loggedByUserId);
  if (staff.vendor_id !== vendorId) {
    throw new Error('Unauthorized: Staff does not belong to this vendor');
  }
  
  // Insert purchase (scoped to vendor)
  const purchase = await db.query(
    `INSERT INTO purchases (customer_id, vendor_id, amount_ngn, logged_by_user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [customerId, vendorId, amountNgn, loggedByUserId]
  );
  
  // Calculate points (vendor-specific conversion rate)
  const vendor = await getVendor(vendorId);
  const pointsEarned = Math.floor(amountNgn / vendor.points_conversion_rate);
  
  // Update points (specific enrollment only)
  await db.query(
    `UPDATE customer_enrollments
     SET points_balance = points_balance + $1,
         lifetime_points_earned = lifetime_points_earned + $1,
         last_purchase_at = NOW()
     WHERE customer_id = $2 AND vendor_id = $3`,
    [pointsEarned, customerId, vendorId]
  );
  
  return { purchase, pointsEarned };
}
```

### Multi-Vendor Session Management

```javascript
const SESSION_CONTEXT = {
  // Store in Redis or customer.conversation_context JSONB field
  customer_id: 'john-uuid',
  active_vendor_id: 'fresh-groceries-uuid',
  conversation_flow: 'reward_redemption',
  awaiting: 'reward_selection',
  context_data: {
    selected_vendor_id: 'fresh-groceries-uuid',
    available_rewards: ['reward-1-uuid', 'reward-2-uuid'],
    points_at_selection: 505
  },
  last_interaction: '2024-01-23T10:30:00Z',
  expires_at: '2024-01-23T11:00:00Z' // 30 minute timeout
};

// Update context on every interaction
async function updateConversationContext(customerId, vendorId, updates) {
  await db.query(
    `UPDATE customers
     SET conversation_context = jsonb_set(
       conversation_context,
       '{active_vendor_id}',
       $1
     ),
     last_active_vendor_id = $2,
     updated_at = NOW()
     WHERE id = $3`,
    [JSON.stringify(vendorId), vendorId, customerId]
  );
  
  // Also update enrollment interaction timestamp
  await db.query(
    `UPDATE customer_enrollments
     SET last_interaction_at = NOW()
     WHERE customer_id = $1 AND vendor_id = $2`,
    [customerId, vendorId]
  );
}
```

### Broadcast Message Segmentation

```javascript
async function sendVendorBroadcast(vendorId, message, segmentation) {
  // Get customers enrolled with THIS vendor only
  const query = `
    SELECT DISTINCT c.id, c.phone_number, e.points_balance
    FROM customers c
    JOIN customer_enrollments e ON c.id = e.customer_id
    WHERE e.vendor_id = $1
      AND e.status = 'active'
      AND e.marketing_opted_in = true
      AND c.opted_in = true
  `;
  
  const params = [vendorId];
  let conditions = [];
  
  // Apply segmentation filters (all vendor-scoped)
  if (segmentation.min_purchases) {
    conditions.push(`(
      SELECT COUNT(*) FROM purchases p
      WHERE p.customer_id = c.id 
        AND p.vendor_id = $${params.length + 1}
    ) >= $${params.length + 2}`);
    params.push(vendorId, segmentation.min_purchases);
  }
  
  if (segmentation.min_points) {
    conditions.push(`e.points_balance >= $${params.length + 1}`);
    params.push(segmentation.min_points);
  }
  
  if (segmentation.tier) {
    conditions.push(`e.tier = $${params.length + 1}`);
    params.push(segmentation.tier);
  }
  
  const finalQuery = conditions.length > 0 
    ? `${query} AND ${conditions.join(' AND ')}`
    : query;
  
  const recipients = await db.query(finalQuery, params);
  
  // Send messages with vendor branding
  const vendor = await getVendor(vendorId);
  for (const recipient of recipients.rows) {
    await sendWhatsAppMessage(recipient.phone_number, {
      vendor_name: vendor.business_name,
      vendor_emoji: vendor.emoji,
      message: message,
      customer_points: recipient.points_balance
    });
  }
  
  // Log broadcast (scoped to vendor)
  await db.query(
    `INSERT INTO broadcasts (vendor_id, message, recipients_count, sent_at)
     VALUES ($1, $2, $3, NOW())`,
    [vendorId, message, recipients.rows.length]
  );
}
```

---

## KEY DESIGN PRINCIPLES

### 1. **Complete Vendor Isolation**
- Every database query MUST include `vendor_id` filter
- Points, rewards, purchases are all scoped per vendor
- No cross-vendor data leakage

### 2. **Transparent Customer Experience**
- Customers see all their programs in one place
- Clear vendor branding on every message
- Easy switching between programs

### 3. **Context-Aware Routing**
- QR codes provide instant context
- Session context remembered for convenience
- Fallback to vendor selection when ambiguous

### 4. **Independent Management**
- Each vendor controls only their program
- Broadcasts only go to their customers
- Opt-outs are vendor-specific

### 5. **Scalable Architecture**
- New vendors don't affect existing ones
- Customer can join unlimited programs
- Database designed for multi-tenancy

---

## COMMON MULTI-VENDOR SCENARIOS

### Scenario A: Customer shops at two vendors same day
1. Morning: Purchase at Fresh Groceries → +85 pts (Fresh Groceries only)
2. Evening: Purchase at Mama Chi's → +120 pts (Mama Chi's only)
3. Result: Two separate notifications, two separate point balances

### Scenario B: Customer has enough points for reward in multiple programs
1. Command: "REDEEM"
2. Bot asks which program
3. Shows available rewards per program
4. Redemption only affects selected program

### Scenario C: Customer gets broadcasts from multiple vendors
1. Fresh Groceries: "Weekend Sale" at 10 AM
2. Beauty Hub: "New Products" at 2 PM
3. Each branded separately
4. Separate unsubscribe options

### Scenario D: Staff logs purchase for wrong customer
1. Purchase logged to vendor_id of logged-in staff
2. Cannot affect other vendors' data
3. Vendor isolation prevents cross-contamination

---

## FAQ

**Q: Can customers transfer points between vendors?**
A: No. Points are completely isolated per vendor. Each vendor manages their own economy.

**Q: What happens if customer enrolled with same vendor twice?**
A: System prevents duplicate enrollments using UNIQUE constraint on (customer_id, vendor_id).

**Q: Can vendors see customers from other vendors?**
A: No. All vendor portal queries filtered by vendor_id. Complete data isolation.

**Q: How does the bot know which vendor in ambiguous situations?**
A: Follows priority: QR code > Explicit selection > Last active vendor > Ask customer.

**Q: Can a customer have different tiers with different vendors?**
A: Yes. Tier is stored per enrollment. Customer can be Gold with one vendor, Bronze with another.
