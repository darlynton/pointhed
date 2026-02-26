# Multi-Currency Architecture

## Overview

The system supports multiple currencies (NGN, GBP, USD, EUR, JPY) with proper exchange rate handling for point calculations and reward values.

## Core Concepts

### 1. Currency Units

Every currency has two representations:
- **Major Units**: User-facing (e.g., £1, $1, ₦1, ¥1)
- **Minor Units**: Database storage (e.g., 100 pence, 100 cents, 100 kobo, 1 yen)

The **scale factor** (minor units per major unit):
```
NGN: 100 (1 Naira = 100 kobo)
GBP: 100 (1 Pound = 100 pence)
USD: 100 (1 Dollar = 100 cents)
EUR: 100 (1 Euro = 100 cents)
JPY: 1   (1 Yen = 1 yen, no subunit)
```

### 2. Points Calculation Formula

**The 1% Rule**: Customers earn points worth 1% of their spending.

```
majorUnitsPerPoint = How many currency units needed to earn 1 point

Examples:
- NGN: majorUnitsPerPoint = 1000 (spend ₦1,000 = earn 1 point, worth ₦10)
- GBP: majorUnitsPerPoint = 1 (spend £1 = earn 1 point, worth 1p)
- USD: majorUnitsPerPoint = 1 (spend $1 = earn 1 point, worth 1¢)
```

**Purchase Points Formula**:
```javascript
points = floor(amountMinor / (currencyMinor × majorUnitsPerPoint))

// Example: ₦15,000 purchase with NGN (majorUnitsPerPoint=1000)
points = floor(1500000 / (100 × 1000)) = floor(15) = 15 points

// Example: £50 purchase with GBP (majorUnitsPerPoint=1)
points = floor(5000 / (100 × 1)) = floor(50) = 50 points
```

### 3. Reward Value Calculation

**Suggested Points for Reward**:
```javascript
points = ceil((monetaryValueMajor × 100) / majorUnitsPerPoint)

// Example: ₦5,000 reward (majorUnitsPerPoint=1000)
points = ceil((5000 × 100) / 1000) = ceil(500) = 500 points

// Example: £5 reward (majorUnitsPerPoint=1)
points = ceil((5 × 100) / 1) = ceil(500) = 500 points
```

**Suggested Monetary Value from Points**:
```javascript
monetaryValueMajor = points × majorUnitsPerPoint × 0.01

// Example: 500 points with NGN (majorUnitsPerPoint=1000)
monetaryValueMajor = 500 × 1000 × 0.01 = 5000 (₦5,000)

// Example: 500 points with GBP (majorUnitsPerPoint=1)
monetaryValueMajor = 500 × 1 × 0.01 = 5 (£5)
```

## Implementation Details

### Backend Storage

All monetary values are stored in **minor units** (kobo/pence/cents):

```sql
-- rewards table
monetaryValueNgn INTEGER  -- Always in minor units, despite the "Ngn" name (legacy)
pointsRequired INTEGER

-- purchases table
amountNgn INTEGER  -- Always in minor units

-- tenants table
settings JSONB {
  "loyalty": {
    "majorUnitsPerPoint": 1000  -- NGN
    // or 1 for GBP/USD/EUR
  },
  "business": {
    "homeCurrency": "NGN"
  }
}
```

### Frontend Display

#### Settings Page (SettingsTab.tsx)

```tsx
// Conversion: minor units to major units for display
const pointsPerMajor = Math.max(0, parseFloat(pointsPerNaira || '0'));

// When saving: major units to store as majorUnitsPerPoint
majorUnitsPerPoint = 1000 / pointsPerMajor  // for NGN
// or 1 / pointsPerMajor for GBP/USD
```

#### Rewards Page (RewardsTab.tsx)

**Create/Edit Reward Dialog**:
```tsx
// State uses major units
const [newReward, setNewReward] = useState({
  monetaryValueMajor: '',  // User enters: 5000 (NGN) or 5 (GBP)
  pointsRequired: ''
});

// On save: convert major to minor for backend
monetaryValueNgn = monetaryValueMajor × getCurrencyConfig().minor
// NGN: 5000 × 100 = 500000 (stored as 500000 kobo)
// GBP: 5 × 100 = 500 (stored as 500 pence)

// On load: convert minor to major for display
monetaryValueMajor = monetaryValueNgn / getCurrencyConfig().minor
// NGN: 500000 / 100 = 5000
// GBP: 500 / 100 = 5
```

**Dynamic Placeholders**:
```tsx
placeholder={
  homeCurrency === 'NGN' ? '5000' :
  homeCurrency === 'JPY' ? '500' :
  '5'  // GBP, USD, EUR
}

step={
  homeCurrency === 'NGN' ? '100' :
  homeCurrency === 'JPY' ? '10' :
  '0.01'  // GBP, USD, EUR
}
```

#### Purchases Page (PurchasesTab.tsx)

```tsx
// Calculate points preview
const homeCurrency = localStorage.getItem('home_currency') || 'NGN';
const currencyMinor = getCurrencyScale(homeCurrency);
const majorUnitsPerPoint = tenantSettings?.loyalty?.majorUnitsPerPoint || 1;

const points = Math.floor(
  (parseFloat(amount) * currencyMinor) / 
  (currencyMinor * majorUnitsPerPoint)
);
```

## Currency Configuration

### Adding a New Currency

1. **Add to getCurrencyConfig()** in `src/lib/mockData.ts`:
```typescript
case 'INR':
  return { symbol: '₹', code: 'INR', minor: 100 };
```

2. **Add minimum reward value** in `RewardsTab.tsx`:
```typescript
const floorByCurrency: Record<string, number> = {
  NGN: 100,
  GBP: 1,
  USD: 1,
  EUR: 1,
  JPY: 100,
  INR: 10  // New currency
};
```

3. **Add to backend** in `backend/src/utils/currency.js`:
```javascript
function getCurrencyMinor(code) {
  const map = {
    NGN: 100,
    GBP: 100,
    USD: 100,
    EUR: 100,
    JPY: 1,
    INR: 100  // New currency
  };
  return map[code] || 100;
}
```

4. **Update default majorUnitsPerPoint** based on currency value:
```javascript
// High-value currencies (low purchasing power)
NGN: majorUnitsPerPoint = 1000  // ₦1,000 = 1 point
JPY: majorUnitsPerPoint = 100   // ¥100 = 1 point
INR: majorUnitsPerPoint = 100   // ₹100 = 1 point

// Low-value currencies (high purchasing power)
GBP: majorUnitsPerPoint = 1     // £1 = 1 point
USD: majorUnitsPerPoint = 1     // $1 = 1 point
EUR: majorUnitsPerPoint = 1     // €1 = 1 point
```

## Testing Multi-Currency

### Test Scenario 1: NGN Vendor

**Settings**:
- Home Currency: NGN
- majorUnitsPerPoint: 1000
- Points per 1000 NGN: 1

**Create Reward**:
- Enter Monetary Value: 5000
- System suggests: 500 points (5000 × 100 / 1000)
- Stored in DB: 500000 (minor units)

**Customer Purchase**:
- Purchase: ₦15,000
- Points earned: 15 (1,500,000 / (100 × 1000))
- Customer sees: +15 points

### Test Scenario 2: GBP Vendor

**Settings**:
- Home Currency: GBP
- majorUnitsPerPoint: 1
- Points per £1: 1

**Create Reward**:
- Enter Monetary Value: 5
- System suggests: 500 points (5 × 100 / 1)
- Stored in DB: 500 (minor units)

**Customer Purchase**:
- Purchase: £50
- Points earned: 50 (5000 / (100 × 1))
- Customer sees: +50 points

## Common Pitfalls

### ❌ Hardcoded Currency Assumptions
```typescript
// BAD: Assumes NGN
const placeholder = "5000";
const points = amount / 1000;
```

```typescript
// GOOD: Uses currency config
const placeholder = homeCurrency === 'NGN' ? '5000' : '5';
const points = amount / majorUnitsPerPoint;
```

### ❌ Mixing Major and Minor Units
```typescript
// BAD: Storing major units
monetaryValueNgn = 5000;  // Is this ₦5,000 or 5000 kobo?

// GOOD: Always store minor units, convert at UI boundary
monetaryValueNgn = 5000 * getCurrencyConfig().minor;  // 500,000 kobo
```

### ❌ Currency Symbol in Field Names
```typescript
// BAD: Field name implies NGN only
monetaryValueNgn: number;

// BETTER: Use neutral name
monetaryValue: number;  // Always in minor units
```

## Migration Path

The codebase has legacy `monetaryValueNgn` field names that work for all currencies because:

1. **Backend storage is currency-agnostic**: Stores minor units for any currency
2. **Frontend converts correctly**: Uses `getCurrencyConfig()` for major/minor conversion
3. **Calculations use `majorUnitsPerPoint`**: Not hardcoded to NGN values

**No breaking changes needed**, but consider renaming for clarity:
- `monetaryValueNgn` → `monetaryValueMinor` (backend)
- Display as `monetaryValueMajor` in UI state

## Quick Reference

| Currency | Symbol | Minor/Major | majorUnitsPerPoint | Example: 1 Point Worth |
|----------|--------|-------------|-------------------|------------------------|
| NGN      | ₦      | 100         | 1000              | ₦10                    |
| GBP      | £      | 100         | 1                 | 1p                     |
| USD      | $      | 100         | 1                 | 1¢                     |
| EUR      | €      | 100         | 1                 | 1¢                     |
| JPY      | ¥      | 1           | 100               | ¥1                     |

**Key Formula**:
```
1 point = majorUnitsPerPoint × 0.01 currency units
```

This ensures 1% value across all currencies!
