# Database Schema - Multi-Tenant Loyalty Platform

## Schema Design Principles

1. **Multi-tenant isolation**: Every table has `tenant_id` (except platform-level tables)
2. **Soft deletes**: Use `deleted_at` instead of hard deletes for audit trails
3. **Timestamps**: All tables have `created_at` and `updated_at`
4. **UUIDs**: Use UUIDs for all primary keys (better for distributed systems)
5. **Indexes**: Strategic indexes on foreign keys and query-heavy columns
6. **JSONB**: For flexible metadata and settings

## Complete SQL Schema

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PLATFORM-LEVEL TABLES (No tenant_id)
-- ============================================================================

-- Platform subscription plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_ngn INTEGER NOT NULL, -- in kobo (100 kobo = 1 NGN)
  billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  features JSONB NOT NULL DEFAULT '{}', -- { "max_customers": 1000, "broadcasts_per_month": 10 }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform administrators
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_admins_email ON platform_admins(email);

-- ============================================================================
-- TENANT MANAGEMENT
-- ============================================================================

-- Tenants (vendors/businesses)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  vendor_code VARCHAR(20) UNIQUE NOT NULL, -- Short code for QR/WhatsApp routing
  
  -- Contact info
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  address TEXT,
  
  -- Subscription
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  subscription_status VARCHAR(50) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  
  -- Settings
  settings JSONB DEFAULT '{}', -- { "currency": "NGN", "timezone": "Africa/Lagos" }
  branding JSONB DEFAULT '{}', -- { "logo_url": "", "primary_color": "#000" }
  
  -- WhatsApp configuration
  whatsapp_config JSONB DEFAULT '{}', -- { "greeting_message": "Welcome!", "business_hours": {} }
  
  -- Limits
  monthly_usage JSONB DEFAULT '{}', -- { "messages_sent": 0, "customers_added": 0 }
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_vendor_code ON tenants(vendor_code);
CREATE INDEX idx_tenants_phone_number ON tenants(phone_number);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);

-- Tenant billing history
CREATE TABLE tenant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  
  amount_ngn INTEGER NOT NULL, -- in kobo
  tax_amount_ngn INTEGER DEFAULT 0,
  total_amount_ngn INTEGER NOT NULL,
  
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50), -- 'paystack', 'flutterwave', 'bank_transfer'
  payment_reference VARCHAR(255),
  
  paid_at TIMESTAMPTZ,
  due_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_invoices_tenant_id ON tenant_invoices(tenant_id);
CREATE INDEX idx_tenant_invoices_status ON tenant_invoices(status);

-- ============================================================================
-- VENDOR USERS & STAFF
-- ============================================================================

-- Vendor admin users and staff
CREATE TABLE vendor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  full_name VARCHAR(255) NOT NULL,
  
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  
  -- Staff PIN for purchase logging via WhatsApp
  staff_pin VARCHAR(6),
  pin_enabled BOOLEAN DEFAULT false,
  
  permissions JSONB DEFAULT '{}', -- { "can_broadcast": true, "can_view_analytics": false }
  
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_vendor_users_tenant_id ON vendor_users(tenant_id);
CREATE INDEX idx_vendor_users_email ON vendor_users(email);
CREATE INDEX idx_vendor_users_staff_pin ON vendor_users(tenant_id, staff_pin) WHERE staff_pin IS NOT NULL;

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

-- Customer profiles (scoped to tenant)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  phone_number VARCHAR(20) NOT NULL, -- Primary identifier for WhatsApp
  whatsapp_name VARCHAR(255), -- Name from WhatsApp profile
  
  -- Optional profile
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  
  -- Loyalty program
  loyalty_status VARCHAR(50) DEFAULT 'active' CHECK (loyalty_status IN ('active', 'inactive', 'blocked')),
  opted_in BOOLEAN DEFAULT true, -- Marketing consent
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  
  -- Engagement
  total_purchases INTEGER DEFAULT 0,
  total_spent_ngn INTEGER DEFAULT 0, -- in kobo
  last_purchase_at TIMESTAMPTZ,
  
  -- WhatsApp conversation state
  conversation_state JSONB DEFAULT '{}', -- { "current_flow": "purchase", "awaiting": "amount" }
  
  -- Metadata
  tags JSONB DEFAULT '[]', -- ["vip", "frequent_buyer"]
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_phone_number ON customers(phone_number);
CREATE INDEX idx_customers_loyalty_status ON customers(tenant_id, loyalty_status);
CREATE INDEX idx_customers_last_purchase ON customers(tenant_id, last_purchase_at DESC);

-- ============================================================================
-- POINTS SYSTEM
-- ============================================================================

-- Points ledger (immutable event log)
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'reversed')),
  points INTEGER NOT NULL, -- Positive for earned, negative for redeemed/expired
  
  -- Related entities
  purchase_id UUID, -- Links to purchases table
  reward_redemption_id UUID, -- Links to reward_redemptions table
  campaign_id UUID, -- Links to campaigns table if from a campaign
  
  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}', -- { "purchase_amount": 5000, "rule_id": "uuid" }
  
  -- Expiry tracking
  expires_at TIMESTAMPTZ,
  expired BOOLEAN DEFAULT false,
  
  -- Audit
  created_by_user_id UUID REFERENCES vendor_users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_transactions_tenant_id ON points_transactions(tenant_id);
CREATE INDEX idx_points_transactions_customer_id ON points_transactions(customer_id);
CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type);
CREATE INDEX idx_points_transactions_expires_at ON points_transactions(expires_at) WHERE expires_at IS NOT NULL;

-- Customer points balance (materialized view for performance)
CREATE TABLE customer_points_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  total_points_earned INTEGER DEFAULT 0,
  total_points_redeemed INTEGER DEFAULT 0,
  total_points_expired INTEGER DEFAULT 0,
  current_balance INTEGER DEFAULT 0,
  
  last_earned_at TIMESTAMPTZ,
  last_redeemed_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_customer_points_balance_tenant_id ON customer_points_balance(tenant_id);
CREATE INDEX idx_customer_points_balance_customer_id ON customer_points_balance(customer_id);
CREATE INDEX idx_customer_points_balance_current_balance ON customer_points_balance(tenant_id, current_balance DESC);

-- ============================================================================
-- REWARDS CATALOG
-- ============================================================================

-- Rewards available for redemption
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Cost & limits
  points_required INTEGER NOT NULL,
  monetary_value_ngn INTEGER, -- Optional: real value of reward
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER, -- NULL = unlimited
  max_redemptions_per_customer INTEGER, -- NULL = unlimited
  
  -- Validity
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  
  -- Metadata
  image_url TEXT,
  terms_and_conditions TEXT,
  category VARCHAR(100), -- 'product', 'discount', 'service'
  
  -- Stats
  total_redemptions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_rewards_tenant_id ON rewards(tenant_id);
CREATE INDEX idx_rewards_is_active ON rewards(tenant_id, is_active);
CREATE INDEX idx_rewards_points_required ON rewards(tenant_id, points_required);

-- Reward redemptions
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  
  -- Redemption details
  points_deducted INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  
  -- Verification
  redemption_code VARCHAR(20) UNIQUE NOT NULL, -- Shown to customer, verified by staff
  verified_by_user_id UUID REFERENCES vendor_users(id),
  verified_at TIMESTAMPTZ,
  
  -- Fulfilment
  fulfilled_at TIMESTAMPTZ,
  fulfilment_notes TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_redemptions_tenant_id ON reward_redemptions(tenant_id);
CREATE INDEX idx_reward_redemptions_customer_id ON reward_redemptions(customer_id);
CREATE INDEX idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX idx_reward_redemptions_code ON reward_redemptions(redemption_code);

-- ============================================================================
-- PURCHASE TRACKING
-- ============================================================================

-- Purchase transactions
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Purchase details
  amount_ngn INTEGER NOT NULL, -- in kobo
  quantity INTEGER DEFAULT 1,
  
  -- Product info (optional)
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  
  -- Proof of purchase
  receipt_url TEXT, -- S3/Cloudinary URL if customer uploaded receipt
  receipt_verified BOOLEAN DEFAULT false,
  
  -- Source
  source VARCHAR(50) DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'manual', 'pos_integration', 'api')),
  
  -- Logging
  logged_by_user_id UUID REFERENCES vendor_users(id),
  logged_via VARCHAR(50), -- 'staff_pin', 'admin_portal', 'customer_self'
  
  -- Points
  points_awarded INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_tenant_id ON purchases(tenant_id);
CREATE INDEX idx_purchases_customer_id ON purchases(customer_id);
CREATE INDEX idx_purchases_created_at ON purchases(tenant_id, created_at DESC);

-- ============================================================================
-- LOYALTY RULES & CAMPAIGNS
-- ============================================================================

-- Points earning rules
CREATE TABLE points_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Rule type
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('per_purchase', 'per_amount_spent', 'first_purchase_bonus', 'referral', 'birthday', 'milestone')),
  
  -- Configuration
  config JSONB NOT NULL, 
  -- Examples:
  -- { "points_per_ngn": 1, "minimum_purchase": 100000 }
  -- { "points_per_purchase": 10 }
  -- { "milestone_purchases": 5, "bonus_points": 50 }
  
  -- Priority & conditions
  priority INTEGER DEFAULT 0, -- Higher priority rules apply first
  conditions JSONB DEFAULT '{}', -- { "min_amount": 100000, "product_categories": ["food"] }
  
  -- Validity
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_points_rules_tenant_id ON points_rules(tenant_id);
CREATE INDEX idx_points_rules_is_active ON points_rules(tenant_id, is_active);

-- Marketing campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Campaign type
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('bonus_points', 'double_points', 'reward_discount', 'referral', 'reactivation')),
  
  -- Configuration
  config JSONB NOT NULL, -- { "multiplier": 2, "target_segment": "inactive_30_days" }
  
  -- Targeting
  target_segment JSONB DEFAULT '{}', -- { "customer_tags": ["vip"], "min_purchases": 5 }
  
  -- Schedule
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  
  -- Stats
  total_participants INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_dates ON campaigns(starts_at, ends_at);

-- ============================================================================
-- NOTIFICATIONS & MESSAGES
-- ============================================================================

-- WhatsApp message log
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Message details
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'interactive', 'template'
  
  -- Content
  message_body TEXT,
  media_url TEXT,
  
  -- WhatsApp metadata
  whatsapp_message_id VARCHAR(255) UNIQUE,
  whatsapp_status VARCHAR(50), -- 'sent', 'delivered', 'read', 'failed'
  
  -- Context
  conversation_id VARCHAR(255), -- Groups messages in same conversation
  triggered_by VARCHAR(100), -- 'purchase_confirmation', 'points_expiry_reminder', 'broadcast'
  
  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,
  
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_messages_customer_id ON whatsapp_messages(customer_id);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_whatsapp_id ON whatsapp_messages(whatsapp_message_id);

-- Broadcast campaigns
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  
  -- Targeting
  target_segment JSONB DEFAULT '{}', -- { "loyalty_status": "active", "min_points": 100 }
  total_recipients INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  
  -- Stats
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_by_user_id UUID REFERENCES vendor_users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_tenant_id ON broadcasts(tenant_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(status);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

-- Daily aggregated metrics per tenant
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  churned_customers INTEGER DEFAULT 0,
  
  -- Transaction metrics
  total_purchases INTEGER DEFAULT 0,
  total_revenue_ngn INTEGER DEFAULT 0,
  average_order_value_ngn INTEGER DEFAULT 0,
  
  -- Points metrics
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  points_expired INTEGER DEFAULT 0,
  
  -- Reward metrics
  rewards_redeemed INTEGER DEFAULT 0,
  
  -- Engagement metrics
  messages_received INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, metric_date)
);

CREATE INDEX idx_daily_metrics_tenant_id ON daily_metrics(tenant_id);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date DESC);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- Audit log for sensitive operations
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Actor
  user_id UUID, -- Can be platform_admin or vendor_user
  user_type VARCHAR(50), -- 'platform_admin', 'vendor_user', 'system'
  
  -- Action
  action VARCHAR(255) NOT NULL, -- 'customer.created', 'points.adjusted', 'reward.redeemed'
  entity_type VARCHAR(100), -- 'customer', 'purchase', 'reward'
  entity_id UUID,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Background jobs tracking
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL, -- 'points_expiry', 'daily_metrics', 'broadcast_send'
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  
  payload JSONB,
  result JSONB,
  error_message TEXT,
  
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_job_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_scheduled_at ON background_jobs(scheduled_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_users_updated_at BEFORE UPDATE ON vendor_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON reward_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate customer points balance
CREATE OR REPLACE FUNCTION calculate_customer_points_balance(p_customer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0)
  INTO v_balance
  FROM points_transactions
  WHERE customer_id = p_customer_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND expired = false;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to update customer points balance (materialized view)
CREATE OR REPLACE FUNCTION update_customer_points_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_points_balance (tenant_id, customer_id, current_balance, updated_at)
  VALUES (
    NEW.tenant_id,
    NEW.customer_id,
    calculate_customer_points_balance(NEW.customer_id),
    NOW()
  )
  ON CONFLICT (tenant_id, customer_id) DO UPDATE SET
    current_balance = calculate_customer_points_balance(NEW.customer_id),
    total_points_earned = customer_points_balance.total_points_earned + CASE WHEN NEW.transaction_type = 'earned' THEN NEW.points ELSE 0 END,
    total_points_redeemed = customer_points_balance.total_points_redeemed + CASE WHEN NEW.transaction_type = 'redeemed' THEN ABS(NEW.points) ELSE 0 END,
    total_points_expired = customer_points_balance.total_points_expired + CASE WHEN NEW.transaction_type = 'expired' THEN ABS(NEW.points) ELSE 0 END,
    last_earned_at = CASE WHEN NEW.transaction_type = 'earned' THEN NOW() ELSE customer_points_balance.last_earned_at END,
    last_redeemed_at = CASE WHEN NEW.transaction_type = 'redeemed' THEN NOW() ELSE customer_points_balance.last_redeemed_at END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_points_transaction
AFTER INSERT ON points_transactions
FOR EACH ROW EXECUTE FUNCTION update_customer_points_balance();

-- ============================================================================
-- ROW-LEVEL SECURITY (Optional but recommended)
-- ============================================================================

-- Enable RLS on tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Example policy for tenants table
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy ON customers
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_ngn, billing_period, features) VALUES
('Free Trial', 'trial', '30-day free trial with limited features', 0, 'monthly', '{"max_customers": 50, "broadcasts_per_month": 5, "max_staff": 1}'),
('Starter', 'starter', 'Perfect for small businesses', 500000, 'monthly', '{"max_customers": 500, "broadcasts_per_month": 20, "max_staff": 3}'),
('Growth', 'growth', 'For growing businesses', 1500000, 'monthly', '{"max_customers": 2000, "broadcasts_per_month": 100, "max_staff": 10}'),
('Pro', 'pro', 'Advanced features for established businesses', 3000000, 'monthly', '{"max_customers": -1, "broadcasts_per_month": -1, "max_staff": -1}');

-- Insert platform admin
INSERT INTO platform_admins (email, password_hash, full_name, role) VALUES
('admin@loyaltylaas.com', crypt('ChangeMeInProduction!', gen_salt('bf')), 'Platform Administrator', 'super_admin');
```

## Key Design Decisions

### 1. Points Ledger (Event Sourcing)
- **Immutable log**: Never update/delete points_transactions
- **Materialized balance**: customer_points_balance for fast queries
- **Expiry tracking**: Background job marks points as expired

### 2. Multi-Tenant Isolation
- **tenant_id on every table**: Ensures complete data separation
- **RLS policies**: Database-level security
- **Unique constraints**: Scoped to tenant (tenant_id + phone_number)

### 3. Soft Deletes
- **deleted_at column**: Allows data recovery and audit trails
- **Queries filter**: WHERE deleted_at IS NULL

### 4. JSONB for Flexibility
- **Settings & config**: Avoid schema changes for feature flags
- **Metadata**: Store extra context without migrations
- **Segment targeting**: Complex filters without joins

### 5. Performance Optimizations
- **Strategic indexes**: On foreign keys and filter columns
- **Materialized views**: customer_points_balance, daily_metrics
- **Partitioning (future)**: Partition whatsapp_messages by created_at monthly

## Query Examples

```sql
-- Get customer's current points balance
SELECT current_balance 
FROM customer_points_balance 
WHERE tenant_id = $1 AND customer_id = $2;

-- Get top 10 customers by points
SELECT c.*, cpb.current_balance
FROM customers c
JOIN customer_points_balance cpb ON c.id = cpb.customer_id
WHERE c.tenant_id = $1
ORDER BY cpb.current_balance DESC
LIMIT 10;

-- Get points transaction history for customer
SELECT * FROM points_transactions
WHERE tenant_id = $1 AND customer_id = $2
ORDER BY created_at DESC
LIMIT 50;

-- Get rewards available for redemption
SELECT * FROM rewards
WHERE tenant_id = $1
  AND is_active = true
  AND deleted_at IS NULL
  AND (valid_from IS NULL OR valid_from <= NOW())
  AND (valid_until IS NULL OR valid_until >= NOW())
  AND (stock_quantity IS NULL OR stock_quantity > 0)
ORDER BY points_required ASC;

-- Get tenant analytics for last 30 days
SELECT 
  SUM(new_customers) as new_customers,
  SUM(total_purchases) as total_purchases,
  SUM(total_revenue_ngn) as total_revenue_ngn,
  SUM(points_earned) as points_earned,
  SUM(points_redeemed) as points_redeemed
FROM daily_metrics
WHERE tenant_id = $1
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days';

-- Find customers with expiring points (next 7 days)
SELECT DISTINCT c.*, pt.points, pt.expires_at
FROM customers c
JOIN points_transactions pt ON c.id = pt.customer_id
WHERE c.tenant_id = $1
  AND pt.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND pt.expired = false
  AND pt.transaction_type = 'earned'
ORDER BY pt.expires_at ASC;
```
