# API Endpoints Documentation

## Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.loyaltylaas.com/api/v1
```

## Authentication

All API endpoints (except public webhooks) require JWT authentication.

```http
Authorization: Bearer <jwt_token>
```

### JWT Payload Structure
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "owner|admin|staff",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 1. AUTHENTICATION & AUTHORIZATION

### 1.1 Platform Admin Login
```http
POST /auth/admin/login
Content-Type: application/json

{
  "email": "admin@loyaltylaas.com",
  "password": "password123"
}

Response 200:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "admin@loyaltylaas.com",
    "role": "super_admin"
  }
}
```

### 1.2 Vendor User Login
```http
POST /auth/vendor/login
Content-Type: application/json

{
  "email": "owner@vendor.com",
  "password": "password123"
}

Response 200:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "owner@vendor.com",
    "role": "owner",
    "business_name": "My Business"
  }
}
```

### 1.3 Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}

Response 200:
{
  "access_token": "eyJhbGc...",
  "expires_in": 900
}
```

### 1.4 Logout
```http
POST /auth/logout
Authorization: Bearer <token>

Response 204: No Content
```

---

## 2. TENANT MANAGEMENT (Platform Admin)

### 2.1 List All Tenants
```http
GET /admin/tenants?page=1&limit=20&status=active&search=business
Authorization: Bearer <admin_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "business_name": "John's Store",
      "vendor_code": "JOHNS001",
      "phone_number": "+2348012345678",
      "email": "john@store.com",
      "subscription_status": "active",
      "subscription_plan": {
        "name": "Starter",
        "price_ngn": 500000
      },
      "total_customers": 150,
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 245,
    "page": 1,
    "limit": 20,
    "pages": 13
  }
}
```

### 2.2 Create Tenant (Onboard Vendor)
```http
POST /admin/tenants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "business_name": "Jane's Boutique",
  "phone_number": "+2348098765432",
  "email": "jane@boutique.com",
  "subscription_plan_id": "uuid",
  "owner": {
    "full_name": "Jane Doe",
    "email": "jane@boutique.com",
    "password": "securePassword123"
  }
}

Response 201:
{
  "id": "uuid",
  "business_name": "Jane's Boutique",
  "vendor_code": "JANES001",
  "slug": "janes-boutique",
  "qr_code_url": "https://storage.com/qr/JANES001.png",
  "whatsapp_link": "https://wa.me/2349012345678?text=JANES001",
  "subscription_status": "trial",
  "trial_ends_at": "2024-02-15T10:00:00Z",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### 2.3 Get Tenant Details
```http
GET /admin/tenants/:tenantId
Authorization: Bearer <admin_token>

Response 200:
{
  "id": "uuid",
  "business_name": "John's Store",
  "vendor_code": "JOHNS001",
  "phone_number": "+2348012345678",
  "email": "john@store.com",
  "address": "123 Lagos Street",
  "subscription": {
    "plan": "Starter",
    "status": "active",
    "started_at": "2024-01-15",
    "next_billing_date": "2024-02-15"
  },
  "stats": {
    "total_customers": 150,
    "active_customers": 120,
    "total_purchases": 450,
    "total_revenue_ngn": 2500000,
    "messages_sent_this_month": 340
  },
  "settings": {
    "currency": "NGN",
    "timezone": "Africa/Lagos"
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

### 2.4 Update Tenant
```http
PATCH /admin/tenants/:tenantId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subscription_status": "suspended",
  "is_active": false
}

Response 200:
{
  "id": "uuid",
  "subscription_status": "suspended",
  "is_active": false,
  "updated_at": "2024-01-20T10:00:00Z"
}
```

### 2.5 Delete Tenant (Soft Delete)
```http
DELETE /admin/tenants/:tenantId
Authorization: Bearer <admin_token>

Response 204: No Content
```

---

## 3. VENDOR MANAGEMENT (Self-Service)

### 3.1 Get Own Tenant Profile
```http
GET /vendor/profile
Authorization: Bearer <vendor_token>

Response 200:
{
  "id": "uuid",
  "business_name": "My Store",
  "vendor_code": "MYSTO001",
  "phone_number": "+2348012345678",
  "qr_code_url": "https://storage.com/qr/MYSTO001.png",
  "whatsapp_link": "https://wa.me/2349012345678?text=MYSTO001",
  "subscription": {
    "plan": "Growth",
    "status": "active",
    "features": {
      "max_customers": 2000,
      "broadcasts_per_month": 100
    }
  },
  "usage_this_month": {
    "customers_added": 45,
    "broadcasts_sent": 8
  }
}
```

### 3.2 Update Vendor Settings
```http
PATCH /vendor/settings
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "branding": {
    "logo_url": "https://storage.com/logo.png",
    "primary_color": "#FF5733"
  },
  "whatsapp_config": {
    "greeting_message": "Welcome to My Store Rewards! 🎉",
    "business_hours": {
      "monday": "09:00-18:00",
      "tuesday": "09:00-18:00"
    }
  }
}

Response 200:
{
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

---

## 4. CUSTOMER MANAGEMENT

### 4.1 List Customers
```http
GET /vendor/customers?page=1&limit=20&status=active&search=john
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "phone_number": "+2348011111111",
      "first_name": "John",
      "last_name": "Customer",
      "loyalty_status": "active",
      "current_points": 250,
      "total_purchases": 12,
      "total_spent_ngn": 120000,
      "last_purchase_at": "2024-01-10T14:30:00Z",
      "opted_in": true,
      "created_at": "2023-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### 4.2 Get Customer Details
```http
GET /vendor/customers/:customerId
Authorization: Bearer <vendor_token>

Response 200:
{
  "id": "uuid",
  "phone_number": "+2348011111111",
  "first_name": "John",
  "last_name": "Customer",
  "email": "john@email.com",
  "loyalty_status": "active",
  "current_points": 250,
  "total_purchases": 12,
  "total_spent_ngn": 120000,
  "average_order_value_ngn": 10000,
  "last_purchase_at": "2024-01-10T14:30:00Z",
  "tags": ["vip", "frequent_buyer"],
  "recent_purchases": [
    {
      "id": "uuid",
      "amount_ngn": 15000,
      "points_awarded": 15,
      "created_at": "2024-01-10T14:30:00Z"
    }
  ],
  "points_history": [
    {
      "transaction_type": "earned",
      "points": 15,
      "description": "Purchase reward",
      "created_at": "2024-01-10T14:30:00Z"
    }
  ]
}
```

### 4.3 Create Customer (Manual)
```http
POST /vendor/customers
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "phone_number": "+2348022222222",
  "first_name": "Jane",
  "last_name": "New",
  "email": "jane@email.com",
  "opted_in": true
}

Response 201:
{
  "id": "uuid",
  "phone_number": "+2348022222222",
  "first_name": "Jane",
  "last_name": "New",
  "current_points": 0,
  "created_at": "2024-01-20T10:00:00Z"
}
```

### 4.4 Update Customer
```http
PATCH /vendor/customers/:customerId
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "tags": ["vip", "premium"],
  "notes": "High-value customer"
}

Response 200:
{
  "id": "uuid",
  "email": "newemail@example.com",
  "tags": ["vip", "premium"],
  "updated_at": "2024-01-20T10:00:00Z"
}
```

### 4.5 Block/Unblock Customer
```http
POST /vendor/customers/:customerId/block
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "reason": "Suspected fraud"
}

Response 200:
{
  "id": "uuid",
  "loyalty_status": "blocked",
  "updated_at": "2024-01-20T10:00:00Z"
}
```

---

## 5. PURCHASE MANAGEMENT

### 5.1 Log Purchase
```http
POST /vendor/purchases
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "customer_id": "uuid",
  "amount_ngn": 15000,
  "quantity": 1,
  "product_name": "T-shirt",
  "product_sku": "TSH-001",
  "notes": "In-store purchase"
}

Response 201:
{
  "id": "uuid",
  "customer_id": "uuid",
  "amount_ngn": 15000,
  "points_awarded": 15,
  "customer": {
    "phone_number": "+2348011111111",
    "first_name": "John",
    "new_points_balance": 265
  },
  "created_at": "2024-01-20T10:00:00Z"
}
```

### 5.2 Get Purchase History
```http
GET /vendor/purchases?page=1&limit=20&customer_id=uuid&from=2024-01-01&to=2024-01-31
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "customer": {
        "id": "uuid",
        "phone_number": "+2348011111111",
        "first_name": "John"
      },
      "amount_ngn": 15000,
      "points_awarded": 15,
      "product_name": "T-shirt",
      "logged_by": {
        "full_name": "Staff Member"
      },
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 5.3 Log Purchase via Staff PIN (WhatsApp flow simulation)
```http
POST /vendor/purchases/staff
Content-Type: application/json

{
  "staff_pin": "123456",
  "customer_phone": "+2348011111111",
  "amount_ngn": 15000
}

Response 201:
{
  "success": true,
  "points_awarded": 15,
  "customer_new_balance": 265
}
```

---

## 6. POINTS MANAGEMENT

### 6.1 Get Customer Points Balance
```http
GET /vendor/customers/:customerId/points
Authorization: Bearer <vendor_token>

Response 200:
{
  "customer_id": "uuid",
  "current_balance": 250,
  "total_earned": 320,
  "total_redeemed": 50,
  "total_expired": 20,
  "expiring_soon": {
    "points": 30,
    "expires_at": "2024-01-25T00:00:00Z"
  }
}
```

### 6.2 Adjust Points (Manual)
```http
POST /vendor/customers/:customerId/points/adjust
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "points": 50,
  "transaction_type": "adjusted",
  "description": "Goodwill gesture"
}

Response 201:
{
  "transaction_id": "uuid",
  "old_balance": 250,
  "new_balance": 300,
  "points_changed": 50
}
```

### 6.3 Get Points Transaction History
```http
GET /vendor/customers/:customerId/points/history?page=1&limit=20
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "transaction_type": "earned",
      "points": 15,
      "description": "Purchase reward",
      "expires_at": "2024-07-20T00:00:00Z",
      "created_at": "2024-01-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "transaction_type": "redeemed",
      "points": -50,
      "description": "Redeemed: Free Coffee",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 7. REWARDS MANAGEMENT

### 7.1 List Rewards
```http
GET /api/v1/rewards?active=true
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "Free Coffee",
      "description": "Get a free coffee on us!",
      "pointsRequired": 50,
      "monetaryValueNgn": 50000,
      "isActive": true,
      "stockQuantity": 100,
      "totalRedemptions": 45,
      "validUntil": "2024-12-31T23:59:59Z"
    }
  ]
}
```

### 7.2 Create Reward
```http
POST /api/v1/rewards
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "10% Discount",
  "description": "Get 10% off your next purchase",
  "pointsRequired": 100,
  "monetaryValueNgn": 100000,
  "stockQuantity": null,
  "maxRedemptionsPerCustomer": 5,
  "category": "discount",
  "validUntil": "2024-12-31T23:59:59Z",
  "termsAndConditions": "Valid on weekdays only"
}

Response 201:
{
  "data": {
    "id": "uuid",
    "name": "10% Discount",
    "pointsRequired": 100,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

### 7.3 Update Reward
```http
PUT /api/v1/rewards/:rewardId
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "pointsRequired": 80,
  "isActive": true,
  "stockQuantity": 150
}

Response 200:
{
  "data": {
    "id": "uuid",
    "pointsRequired": 80,
    "stockQuantity": 150,
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

### 7.4 Delete Reward (Soft Delete)
```http
DELETE /api/v1/rewards/:rewardId
Authorization: Bearer <vendor_token>

Response 204: No Content
```

---

## 8. REWARD REDEMPTIONS

### 8.1 List Redemptions
```http
GET /vendor/redemptions?status=pending&page=1&limit=20
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "customer": {
        "id": "uuid",
        "phone_number": "+2348011111111",
        "first_name": "John"
      },
      "reward": {
        "id": "uuid",
        "name": "Free Coffee"
      },
      "points_deducted": 50,
      "redemption_code": "RED-ABC123",
      "status": "pending",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 8.2 Initiate Redemption (Customer via WhatsApp, handled by webhook)
```http
POST /vendor/redemptions
Content-Type: application/json

{
  "customer_id": "uuid",
  "reward_id": "uuid"
}

Response 201:
{
  "id": "uuid",
  "redemption_code": "RED-ABC123",
  "status": "pending",
  "message": "Show this code to staff: RED-ABC123"
}
```

### 8.3 Verify & Fulfill Redemption
```http
POST /vendor/redemptions/:redemptionId/fulfill
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "redemption_code": "RED-ABC123",
  "fulfilment_notes": "Coffee served"
}

Response 200:
{
  "id": "uuid",
  "status": "fulfilled",
  "fulfilled_at": "2024-01-20T10:15:00Z"
}
```

### 8.4 Cancel Redemption
```http
POST /vendor/redemptions/:redemptionId/cancel
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "cancellation_reason": "Out of stock"
}

Response 200:
{
  "id": "uuid",
  "status": "cancelled",
  "points_refunded": 50
}
```

---

## 9. POINTS RULES & CAMPAIGNS

### 9.1 List Points Rules
```http
GET /vendor/points-rules
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "Standard Purchase Points",
      "rule_type": "per_amount_spent",
      "config": {
        "points_per_ngn": 1,
        "minimum_purchase": 100000
      },
      "is_active": true,
      "priority": 1
    }
  ]
}
```

### 9.2 Create Points Rule
```http
POST /vendor/points-rules
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "Double Points Weekend",
  "description": "Earn 2x points on weekends",
  "rule_type": "per_amount_spent",
  "config": {
    "points_per_ngn": 2,
    "days": ["saturday", "sunday"]
  },
  "priority": 2,
  "valid_from": "2024-01-20T00:00:00Z",
  "valid_until": "2024-12-31T23:59:59Z"
}

Response 201:
{
  "id": "uuid",
  "name": "Double Points Weekend",
  "is_active": true,
  "created_at": "2024-01-20T10:00:00Z"
}
```

### 9.3 Update Points Rule
```http
PATCH /vendor/points-rules/:ruleId
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "is_active": false
}

Response 200:
{
  "id": "uuid",
  "is_active": false,
  "updated_at": "2024-01-20T10:00:00Z"
}
```

---

## 10. BROADCASTS & MESSAGING

### 10.1 Create Broadcast
```http
POST /vendor/broadcasts
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "name": "New Year Sale",
  "message_content": "Happy New Year! 🎉 Get 2x points on all purchases this week!",
  "target_segment": {
    "loyalty_status": "active",
    "min_purchases": 1
  },
  "scheduled_at": "2024-01-20T09:00:00Z"
}

Response 201:
{
  "id": "uuid",
  "name": "New Year Sale",
  "status": "scheduled",
  "total_recipients": 120,
  "scheduled_at": "2024-01-20T09:00:00Z"
}
```

### 10.2 List Broadcasts
```http
GET /vendor/broadcasts?status=completed
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "New Year Sale",
      "status": "completed",
      "total_recipients": 120,
      "sent_count": 120,
      "delivered_count": 115,
      "read_count": 85,
      "scheduled_at": "2024-01-20T09:00:00Z",
      "completed_at": "2024-01-20T09:15:00Z"
    }
  ]
}
```

### 10.3 Cancel Scheduled Broadcast
```http
DELETE /vendor/broadcasts/:broadcastId
Authorization: Bearer <vendor_token>

Response 204: No Content
```

---

## 11. ANALYTICS & REPORTING

### 11.1 Get Dashboard Overview
```http
GET /vendor/analytics/overview?period=30d
Authorization: Bearer <vendor_token>

Response 200:
{
  "period": "last_30_days",
  "customers": {
    "total": 150,
    "new": 25,
    "active": 120,
    "growth_rate": 20.0
  },
  "purchases": {
    "total": 340,
    "total_revenue_ngn": 3400000,
    "average_order_value_ngn": 10000
  },
  "points": {
    "total_earned": 3400,
    "total_redeemed": 850,
    "redemption_rate": 25.0
  },
  "engagement": {
    "messages_received": 450,
    "messages_sent": 380
  },
  "top_rewards": [
    {
      "reward_name": "Free Coffee",
      "redemptions": 12
    }
  ]
}
```

### 11.2 Get Customer Insights
```http
GET /vendor/analytics/customers?metric=top_spenders&limit=10
Authorization: Bearer <vendor_token>

Response 200:
{
  "top_spenders": [
    {
      "customer_id": "uuid",
      "phone_number": "+2348011111111",
      "first_name": "John",
      "total_spent_ngn": 250000,
      "total_purchases": 25
    }
  ]
}
```

### 11.3 Export Data (CSV)
```http
GET /vendor/exports/customers?format=csv&from=2024-01-01&to=2024-01-31
Authorization: Bearer <vendor_token>

Response 200:
Content-Type: text/csv
Content-Disposition: attachment; filename="customers_2024-01-31.csv"

id,phone_number,first_name,last_name,current_points,total_purchases,created_at
uuid,+2348011111111,John,Doe,250,12,2024-01-01T10:00:00Z
```

---

## 12. WHATSAPP WEBHOOK (Meta Cloud API)

### 12.1 Webhook Verification (GET)
```http
GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING

Response 200:
CHALLENGE_STRING
```

### 12.2 Receive WhatsApp Messages (POST)
```http
POST /webhooks/whatsapp
Content-Type: application/json
X-Hub-Signature-256: sha256=signature

{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "2349012345678",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "2348011111111"
              }
            ],
            "messages": [
              {
                "from": "2348011111111",
                "id": "wamid.XXX",
                "timestamp": "1234567890",
                "text": {
                  "body": "MYSTO001"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}

Response 200:
{
  "success": true
}
```

---

## 13. STAFF MANAGEMENT

### 13.1 List Staff
```http
GET /vendor/staff
Authorization: Bearer <vendor_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Staff Member",
      "email": "staff@vendor.com",
      "role": "staff",
      "staff_pin": "123456",
      "pin_enabled": true,
      "is_active": true,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### 13.2 Add Staff
```http
POST /vendor/staff
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "full_name": "New Staff",
  "email": "newstaff@vendor.com",
  "password": "securePassword123",
  "role": "staff",
  "staff_pin": "654321",
  "pin_enabled": true,
  "permissions": {
    "can_log_purchases": true,
    "can_verify_redemptions": true
  }
}

Response 201:
{
  "id": "uuid",
  "full_name": "New Staff",
  "email": "newstaff@vendor.com",
  "staff_pin": "654321"
}
```

### 13.3 Update Staff
```http
PATCH /vendor/staff/:staffId
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "pin_enabled": false,
  "is_active": false
}

Response 200:
{
  "id": "uuid",
  "pin_enabled": false,
  "is_active": false
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone_number",
      "value": "invalid"
    }
  }
}
```

### HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid auth token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_REQUIRED` - No auth token provided
- `INVALID_TOKEN` - Auth token is invalid or expired
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INSUFFICIENT_POINTS` - Customer doesn't have enough points
- `SUBSCRIPTION_LIMIT_REACHED` - Tenant hit subscription limit

---

## Rate Limiting

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1234567890
```

- **Per IP**: 100 requests/minute
- **Per tenant**: 1000 requests/minute
- **Webhook**: 100 requests/minute per IP

---

## Pagination

All list endpoints support pagination:

```http
GET /vendor/customers?page=2&limit=50

Response:
{
  "data": [...],
  "pagination": {
    "total": 500,
    "page": 2,
    "limit": 50,
    "pages": 10,
    "has_next": true,
    "has_prev": true
  }
}
```

---

## Filtering & Sorting

```http
GET /vendor/customers?status=active&sort=-created_at&search=john

# Multiple filters
GET /vendor/purchases?from=2024-01-01&to=2024-01-31&min_amount=10000
```

## Webhooks (Outgoing)

Vendors can register webhook URLs to receive events:

```json
{
  "event": "purchase.created",
  "tenant_id": "uuid",
  "data": {
    "purchase_id": "uuid",
    "customer_id": "uuid",
    "amount_ngn": 15000,
    "points_awarded": 15
  },
  "timestamp": "2024-01-20T10:00:00Z"
}
```

**Supported Events:**
- `purchase.created`
- `points.earned`
- `points.redeemed`
- `reward.redeemed`
- `customer.created`
- `points.expiring_soon`
