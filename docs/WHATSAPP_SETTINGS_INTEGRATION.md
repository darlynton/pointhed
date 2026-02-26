# WhatsApp Settings Integration

## Overview
The settings page now connects to real backend data, allowing vendors to customize WhatsApp messages and other loyalty program settings.

## Backend Implementation

### API Endpoints

#### GET /api/v1/settings
Retrieves all tenant settings including:
- **Business Info**: name, email, phone, address, vendor code
- **Loyalty Settings**: welcome bonus, points per naira, minimum purchase, expiry
- **WhatsApp Messages**: welcome message, purchase message, auto-reply toggle
- **Notifications**: which events trigger notifications
- **Branding**: primary color, logo URL

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "business": {
    "name": "Fashion Hub Lagos",
    "email": "contact@fashionhub.ng",
    "phone": "+234 901 234 5678",
    "address": "123 Admiralty Way, Lekki",
    "vendorCode": "FASH001"
  },
  "loyalty": {
    "welcomeBonusEnabled": true,
    "welcomeBonusPoints": 50,
    "pointsPerNaira": 1,
    "minimumPurchase": 1000,
    "pointsExpiryEnabled": false,
    "pointsExpiryDays": 365
  },
  "whatsapp": {
    "welcomeMessage": "Welcome to our rewards program! 🎉",
    "purchaseMessage": "🛍️ Purchase Confirmed! You earned {points} points. New balance: {balance} points",
    "autoReplyEnabled": true
  },
  "notifications": {
    "notifyPurchase": true,
    "notifyRedemption": true,
    "notifyExpiry": true,
    "expiryReminderDays": 7,
    "notifyMilestone": true
  },
  "branding": {
    "primaryColor": "#2563eb",
    "logoUrl": ""
  }
}
```

#### PUT /api/v1/settings
Updates tenant settings. Accepts partial updates - only send the fields you want to change.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "whatsapp": {
    "welcomeMessage": "Welcome to Fashion Hub Lagos! 🎉",
    "purchaseMessage": "Thanks for shopping! You earned {points} points.",
    "autoReplyEnabled": true
  }
}
```

**Response**:
```json
{
  "message": "Settings updated successfully",
  "settings": { /* full settings object */ }
}
```

## Frontend Implementation

### SettingsTab Component Updates

1. **State Management**: All settings now initialize empty and load from API
2. **useEffect Hook**: Fetches settings on component mount
3. **Loading State**: Shows spinner while fetching data
4. **Save Handler**: Sends all settings to backend via PUT request
5. **Error Handling**: Shows toast notifications for success/error states

### Usage

The settings are automatically applied when:

1. **Customer Registration**: Uses custom welcome message from `whatsappConfig.welcome_message`
   - Falls back to default if not set
   - Automatically appends welcome bonus points information

2. **Purchase Notifications**: Uses custom purchase message from `whatsappConfig.purchase_message`
   - Supports placeholders: `{points}`, `{balance}`, `{amount}`
   - Example: `🛍️ Purchase Confirmed! You earned {points} points. New balance: {balance} points`

## Database Schema

Settings are stored in the `tenant` table:

```prisma
model Tenant {
  id             String   @id @default(uuid())
  name           String
  email          String?
  phone          String?
  address        String?
  vendorCode     String   @unique
  
  // JSON fields for flexible settings
  settings       Json     @default("{}")      // Loyalty & notification settings
  branding       Json     @default("{}")      // UI branding settings  
  whatsappConfig Json     @default("{}")      // WhatsApp message templates
}
```

### WhatsApp Config Structure

```json
{
  "welcome_message": "Welcome to our loyalty program! 🎉",
  "purchase_message": "🛍️ You earned {points} points. Balance: {balance}",
  "auto_reply_enabled": true
}
```

### Settings Structure

```json
{
  "welcome_bonus_enabled": true,
  "welcome_bonus_points": 50,
  "points_per_naira": 1,
  "minimum_purchase": 1000,
  "points_expiry_enabled": false,
  "points_expiry_days": 365,
  "notify_purchase": true,
  "notify_redemption": true,
  "notify_expiry": true,
  "expiry_reminder_days": 7,
  "notify_milestone": true
}
```

### Branding Structure

```json
{
  "primary_color": "#2563eb",
  "logo_url": "https://example.com/logo.png"
}
```

## Message Placeholders

When vendors customize WhatsApp messages, they can use these placeholders:

- `{points}` - Points earned in this transaction
- `{balance}` - Current total points balance
- `{amount}` - Purchase amount (formatted with ₦ symbol)

The system automatically replaces these placeholders with actual values when sending messages.

## Testing

1. **Login** as a vendor
2. **Navigate** to Settings page
3. **Verify** data loads from backend (check browser network tab)
4. **Edit** WhatsApp messages or other settings
5. **Save** and verify success toast
6. **Refresh** page to confirm settings persisted
7. **Test** by registering a new customer or making a purchase
8. **Verify** customer receives customized WhatsApp messages

## Future Enhancements

Potential additions:
- Message preview with sample data
- Send test WhatsApp message button
- Template library with pre-built messages
- Multi-language message support
- Schedule-based messages (birthday, anniversary)
- Rich media support (images, videos)
