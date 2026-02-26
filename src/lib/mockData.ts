// Mock data for the LaaS platform

export interface Tenant {
  id: string;
  business_name: string;
  vendor_code: string;
  phone_number: string;
  email: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_plan: string;
  total_customers: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  loyalty_status: 'active' | 'inactive' | 'blocked';
  current_points: number;
  total_purchases: number;
  total_spent_ngn: number;
  last_purchase_at: string;
  opted_in: boolean;
  created_at: string;
  tags: string[];
}

export interface Reward {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  points_required: number;
  monetary_value_ngn: number;
  is_active: boolean;
  stock_quantity: number | null;
  total_redemptions: number;
  category: string;
}

export interface Purchase {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  amount_ngn: number;
  points_awarded: number;
  product_name?: string;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  description: string;
  created_at: string;
}

export interface Broadcast {
  id: string;
  tenant_id: string;
  name: string;
  message_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  scheduled_at?: string;
  created_at: string;
}

export const mockTenants: Tenant[] = [
  {
    id: '1',
    business_name: 'Fashion Hub Lagos',
    vendor_code: 'FASH001',
    phone_number: '+2348012345678',
    email: 'info@fashionhub.ng',
    subscription_status: 'active',
    subscription_plan: 'Growth',
    total_customers: 342,
    is_active: true,
    created_at: '2023-11-15T10:00:00Z'
  },
  {
    id: '2',
    business_name: 'Mama\'s Kitchen',
    vendor_code: 'MAMA001',
    phone_number: '+2348098765432',
    email: 'contact@mamaskitchen.ng',
    subscription_status: 'active',
    subscription_plan: 'Starter',
    total_customers: 156,
    is_active: true,
    created_at: '2024-01-05T14:30:00Z'
  },
  {
    id: '3',
    business_name: 'TechGadgets NG',
    vendor_code: 'TECH001',
    phone_number: '+2348087654321',
    email: 'sales@techgadgets.ng',
    subscription_status: 'trial',
    subscription_plan: 'Trial',
    total_customers: 45,
    is_active: true,
    created_at: '2024-12-10T09:00:00Z'
  }
];

export const mockCustomers: Customer[] = [
  {
    id: '1',
    tenant_id: '1',
    phone_number: '+2348011111111',
    first_name: 'Chinedu',
    last_name: 'Okafor',
    loyalty_status: 'active',
    current_points: 450,
    total_purchases: 18,
    total_spent_ngn: 18000000, // ₦180,000 in kobo
    last_purchase_at: '2024-12-18T14:30:00Z',
    opted_in: true,
    created_at: '2023-12-01T10:00:00Z',
    tags: ['vip', 'frequent_buyer']
  },
  {
    id: '2',
    tenant_id: '1',
    phone_number: '+2348022222222',
    first_name: 'Aisha',
    last_name: 'Mohammed',
    loyalty_status: 'active',
    current_points: 230,
    total_purchases: 12,
    total_spent_ngn: 9500000, // ₦95,000
    last_purchase_at: '2024-12-15T11:20:00Z',
    opted_in: true,
    created_at: '2024-01-15T09:00:00Z',
    tags: []
  },
  {
    id: '3',
    tenant_id: '1',
    phone_number: '+2348033333333',
    first_name: 'Emeka',
    last_name: 'Nwosu',
    loyalty_status: 'active',
    current_points: 85,
    total_purchases: 5,
    total_spent_ngn: 4200000, // ₦42,000
    last_purchase_at: '2024-12-12T16:45:00Z',
    opted_in: true,
    created_at: '2024-06-20T15:30:00Z',
    tags: []
  }
];

export const mockRewards: Reward[] = [
  {
    id: '1',
    tenant_id: '1',
    name: 'Free Accessory',
    description: 'Get any accessory worth up to ₦5,000 free',
    points_required: 100,
    monetary_value_ngn: 500000, // ₦5,000
    is_active: true,
    stock_quantity: null,
    total_redemptions: 67,
    category: 'product'
  },
  {
    id: '2',
    tenant_id: '1',
    name: '10% Discount Voucher',
    description: '10% off your next purchase (up to ₦10,000)',
    points_required: 200,
    monetary_value_ngn: 1000000, // ₦10,000
    is_active: true,
    stock_quantity: null,
    total_redemptions: 34,
    category: 'discount'
  },
  {
    id: '3',
    tenant_id: '1',
    name: 'Designer T-Shirt',
    description: 'Premium designer t-shirt from our latest collection',
    points_required: 500,
    monetary_value_ngn: 2000000, // ₦20,000
    is_active: true,
    stock_quantity: 15,
    total_redemptions: 12,
    category: 'product'
  },
  {
    id: '4',
    tenant_id: '1',
    name: 'VIP Shopping Hour',
    description: 'Exclusive 1-hour private shopping session',
    points_required: 1000,
    monetary_value_ngn: 5000000, // ₦50,000
    is_active: true,
    stock_quantity: 5,
    total_redemptions: 3,
    category: 'service'
  }
];

export const mockPurchases: Purchase[] = [
  {
    id: '1',
    tenant_id: '1',
    customer_id: '1',
    customer_name: 'Chinedu Okafor',
    amount_ngn: 1500000, // ₦15,000
    points_awarded: 15,
    product_name: 'Denim Jeans',
    created_at: '2024-12-18T14:30:00Z'
  },
  {
    id: '2',
    tenant_id: '1',
    customer_id: '2',
    customer_name: 'Aisha Mohammed',
    amount_ngn: 800000, // ₦8,000
    points_awarded: 8,
    product_name: 'Cotton Blouse',
    created_at: '2024-12-15T11:20:00Z'
  },
  {
    id: '3',
    tenant_id: '1',
    customer_id: '1',
    customer_name: 'Chinedu Okafor',
    amount_ngn: 2500000, // ₦25,000
    points_awarded: 25,
    product_name: 'Sneakers',
    created_at: '2024-12-10T09:15:00Z'
  }
];

export const mockPointsTransactions: PointsTransaction[] = [
  {
    id: '1',
    transaction_type: 'earned',
    points: 15,
    description: 'Purchase reward - ₦15,000',
    created_at: '2024-12-18T14:30:00Z'
  },
  {
    id: '2',
    transaction_type: 'redeemed',
    points: -100,
    description: 'Redeemed: Free Accessory',
    created_at: '2024-12-16T10:00:00Z'
  },
  {
    id: '3',
    transaction_type: 'earned',
    points: 25,
    description: 'Purchase reward - ₦25,000',
    created_at: '2024-12-10T09:15:00Z'
  },
  {
    id: '4',
    transaction_type: 'adjusted',
    points: 50,
    description: 'Birthday bonus',
    created_at: '2024-12-05T08:00:00Z'
  }
];

export const mockBroadcasts: Broadcast[] = [
  {
    id: '1',
    tenant_id: '1',
    name: 'Christmas Sale Announcement',
    message_content: '🎄 Special Christmas Sale! Get 2x points on all purchases this week! Valid until Dec 25.',
    status: 'completed',
    total_recipients: 320,
    sent_count: 320,
    delivered_count: 315,
    scheduled_at: '2024-12-15T09:00:00Z',
    created_at: '2024-12-14T16:00:00Z'
  },
  {
    id: '2',
    tenant_id: '1',
    name: 'Points Expiry Reminder',
    message_content: '⚠️ Reminder: Your points are expiring soon! Check your balance and redeem your rewards.',
    status: 'completed',
    total_recipients: 89,
    sent_count: 89,
    delivered_count: 85,
    scheduled_at: '2024-12-10T10:00:00Z',
    created_at: '2024-12-09T14:30:00Z'
  },
  {
    id: '3',
    tenant_id: '1',
    name: 'New Year Sale Preview',
    message_content: '🎉 Get ready for our biggest New Year Sale! Coming January 1st - exclusive rewards for loyal customers!',
    status: 'scheduled',
    total_recipients: 342,
    sent_count: 0,
    delivered_count: 0,
    scheduled_at: '2024-12-31T08:00:00Z',
    created_at: '2024-12-18T11:00:00Z'
  }
];

export const mockAnalytics = {
  overview: {
    period: 'last_30_days',
    customers: {
      total: 342,
      new: 45,
      active: 280,
      growth_rate: 15.2
    },
    purchases: {
      total: 856,
      total_revenue_ngn: 42800000, // ₦428,000
      average_order_value_ngn: 5000000 // ₦50,000
    },
    points: {
      total_earned: 8560,
      total_redeemed: 2340,
      redemption_rate: 27.3
    },
    engagement: {
      messages_received: 1250,
      messages_sent: 1180
    }
  },
  topCustomers: [
    {
      customer_id: '1',
      phone_number: '+2348011111111',
      first_name: 'Chinedu',
      last_name: 'Okafor',
      total_spent_ngn: 18000000,
      total_purchases: 18
    },
    {
      customer_id: '2',
      phone_number: '+2348022222222',
      first_name: 'Aisha',
      last_name: 'Mohammed',
      total_spent_ngn: 9500000,
      total_purchases: 12
    }
  ],
  topRewards: [
    { reward_name: 'Free Accessory', redemptions: 67 },
    { reward_name: '10% Discount Voucher', redemptions: 34 },
    { reward_name: 'Designer T-Shirt', redemptions: 12 }
  ]
};

// Helper function to format NGN amounts from kobo
// Dynamic currency formatter. Uses `localStorage.home_currency` when available.
export function getCurrencyConfig(currency?: string) {
  const code = currency || (typeof window !== 'undefined' ? (localStorage.getItem('home_currency') || 'NGN') : 'NGN');
  const map: Record<string, { locale: string; minor: number }> = {
    NGN: { locale: 'en-NG', minor: 100 },
    GBP: { locale: 'en-GB', minor: 100 },
    USD: { locale: 'en-US', minor: 100 },
    EUR: { locale: 'de-DE', minor: 100 },
  };
  return { code, ...(map[code] || map['NGN']) };
}

export function getCurrencySymbol(currency?: string): string {
  const { code, locale } = getCurrencyConfig(currency);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: 0 }).formatToParts(0).find(p => p.type === 'currency')?.value || code;
  } catch (e) {
    return code;
  }
}

// Format amounts stored in minor units (e.g. kobo, cents). If amountMinor is already major units,
// pass the appropriate scaled value. The UI currently stores NGN amounts in kobo.
export function formatNGN(amountMinor: number): string {
  const { code, locale, minor } = getCurrencyConfig();
  const amountMajor = amountMinor / minor;
  try {
    // All supported currencies use 2 fraction digits
    const fractionDigits = minor === 1 ? 0 : 2;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(amountMajor);
  } catch (e) {
    // Fallback: simple prefix
    const symbol = code === 'NGN' ? '₦' : code + ' ';
    return `${symbol}${amountMajor.toLocaleString()}`;
  }
}

// Format an amount expressed in major units (e.g., 5000 for ₦5,000)
export function formatMajor(amountMajor: number, currency?: string): string {
  const { minor } = getCurrencyConfig(currency);
  const amountMinor = Math.round(amountMajor * minor);
  return formatNGN(amountMinor);
}

// Helper function to format dates
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
