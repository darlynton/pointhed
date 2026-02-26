-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "price_ngn" INTEGER NOT NULL,
    "billing_period" VARCHAR(20) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "vendor_code" VARCHAR(20) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "address" TEXT,
    "subscription_plan_id" UUID,
    "subscription_status" VARCHAR(50) NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMPTZ(6),
    "subscription_starts_at" TIMESTAMPTZ(6),
    "subscription_ends_at" TIMESTAMPTZ(6),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "whatsapp_config" JSONB NOT NULL DEFAULT '{}',
    "monthly_usage" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "amount_ngn" INTEGER NOT NULL,
    "tax_amount_ngn" INTEGER NOT NULL DEFAULT 0,
    "total_amount_ngn" INTEGER NOT NULL,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(255),
    "paid_at" TIMESTAMPTZ(6),
    "due_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "full_name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'staff',
    "staff_pin" VARCHAR(6),
    "pin_enabled" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "whatsapp_name" VARCHAR(255),
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" VARCHAR(255),
    "loyalty_status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "opted_in" BOOLEAN NOT NULL DEFAULT true,
    "opted_in_at" TIMESTAMPTZ(6),
    "opted_out_at" TIMESTAMPTZ(6),
    "total_purchases" INTEGER NOT NULL DEFAULT 0,
    "total_spent_ngn" INTEGER NOT NULL DEFAULT 0,
    "last_purchase_at" TIMESTAMPTZ(6),
    "conversation_state" JSONB NOT NULL DEFAULT '{}',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_type" VARCHAR(50) NOT NULL,
    "points" INTEGER NOT NULL,
    "purchase_id" UUID,
    "reward_redemption_id" UUID,
    "campaign_id" UUID,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ(6),
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_points_balance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "total_points_earned" INTEGER NOT NULL DEFAULT 0,
    "total_points_redeemed" INTEGER NOT NULL DEFAULT 0,
    "total_points_expired" INTEGER NOT NULL DEFAULT 0,
    "current_balance" INTEGER NOT NULL DEFAULT 0,
    "last_earned_at" TIMESTAMPTZ(6),
    "last_redeemed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_points_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "points_required" INTEGER NOT NULL,
    "monetary_value_ngn" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stock_quantity" INTEGER,
    "max_redemptions_per_customer" INTEGER,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "image_url" TEXT,
    "terms_and_conditions" TEXT,
    "category" VARCHAR(100),
    "total_redemptions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reward_id" UUID NOT NULL,
    "points_deducted" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "redemption_code" VARCHAR(20) NOT NULL,
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "fulfilled_at" TIMESTAMPTZ(6),
    "fulfilment_notes" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount_ngn" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "product_name" VARCHAR(255),
    "product_sku" VARCHAR(100),
    "receipt_url" TEXT,
    "receipt_verified" BOOLEAN NOT NULL DEFAULT false,
    "source" VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    "logged_by_user_id" UUID,
    "logged_via" VARCHAR(50),
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "rule_type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "points_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "campaign_type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "target_segment" JSONB NOT NULL DEFAULT '{}',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "total_participants" INTEGER NOT NULL DEFAULT 0,
    "total_conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "direction" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(50) NOT NULL,
    "message_body" TEXT,
    "media_url" TEXT,
    "whatsapp_message_id" VARCHAR(255),
    "whatsapp_status" VARCHAR(50),
    "conversation_id" VARCHAR(255),
    "triggered_by" VARCHAR(100),
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "message_content" TEXT NOT NULL,
    "target_segment" JSONB NOT NULL DEFAULT '{}',
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMPTZ(6),
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "active_customers" INTEGER NOT NULL DEFAULT 0,
    "churned_customers" INTEGER NOT NULL DEFAULT 0,
    "total_purchases" INTEGER NOT NULL DEFAULT 0,
    "total_revenue_ngn" INTEGER NOT NULL DEFAULT 0,
    "average_order_value_ngn" INTEGER NOT NULL DEFAULT 0,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "points_redeemed" INTEGER NOT NULL DEFAULT 0,
    "points_expired" INTEGER NOT NULL DEFAULT 0,
    "rewards_redeemed" INTEGER NOT NULL DEFAULT 0,
    "messages_received" INTEGER NOT NULL DEFAULT 0,
    "messages_sent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "user_type" VARCHAR(50),
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_admins_email_idx" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_vendor_code_key" ON "tenants"("vendor_code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_phone_number_key" ON "tenants"("phone_number");

-- CreateIndex
CREATE INDEX "tenants_vendor_code_idx" ON "tenants"("vendor_code");

-- CreateIndex
CREATE INDEX "tenants_phone_number_idx" ON "tenants"("phone_number");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_subscription_status_idx" ON "tenants"("subscription_status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invoices_invoice_number_key" ON "tenant_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "tenant_invoices_tenant_id_idx" ON "tenant_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_invoices_status_idx" ON "tenant_invoices"("status");

-- CreateIndex
CREATE INDEX "vendor_users_tenant_id_idx" ON "vendor_users"("tenant_id");

-- CreateIndex
CREATE INDEX "vendor_users_email_idx" ON "vendor_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_users_tenant_id_email_key" ON "vendor_users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_phone_number_idx" ON "customers"("phone_number");

-- CreateIndex
CREATE INDEX "customers_tenant_id_loyalty_status_idx" ON "customers"("tenant_id", "loyalty_status");

-- CreateIndex
CREATE INDEX "customers_tenant_id_last_purchase_at_idx" ON "customers"("tenant_id", "last_purchase_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_phone_number_key" ON "customers"("tenant_id", "phone_number");

-- CreateIndex
CREATE INDEX "points_transactions_tenant_id_idx" ON "points_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "points_transactions_customer_id_idx" ON "points_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "points_transactions_transaction_type_idx" ON "points_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "points_transactions_expires_at_idx" ON "points_transactions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_points_balance_customer_id_key" ON "customer_points_balance"("customer_id");

-- CreateIndex
CREATE INDEX "customer_points_balance_tenant_id_idx" ON "customer_points_balance"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_points_balance_customer_id_idx" ON "customer_points_balance"("customer_id");

-- CreateIndex
CREATE INDEX "customer_points_balance_tenant_id_current_balance_idx" ON "customer_points_balance"("tenant_id", "current_balance" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_points_balance_tenant_id_customer_id_key" ON "customer_points_balance"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "rewards_tenant_id_idx" ON "rewards"("tenant_id");

-- CreateIndex
CREATE INDEX "rewards_tenant_id_is_active_idx" ON "rewards"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "rewards_tenant_id_points_required_idx" ON "rewards"("tenant_id", "points_required");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_redemption_code_key" ON "reward_redemptions"("redemption_code");

-- CreateIndex
CREATE INDEX "reward_redemptions_tenant_id_idx" ON "reward_redemptions"("tenant_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_customer_id_idx" ON "reward_redemptions"("customer_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_reward_id_idx" ON "reward_redemptions"("reward_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_status_idx" ON "reward_redemptions"("status");

-- CreateIndex
CREATE INDEX "reward_redemptions_redemption_code_idx" ON "reward_redemptions"("redemption_code");

-- CreateIndex
CREATE INDEX "purchases_tenant_id_idx" ON "purchases"("tenant_id");

-- CreateIndex
CREATE INDEX "purchases_customer_id_idx" ON "purchases"("customer_id");

-- CreateIndex
CREATE INDEX "purchases_tenant_id_created_at_idx" ON "purchases"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "points_rules_tenant_id_idx" ON "points_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "points_rules_tenant_id_is_active_idx" ON "points_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_idx" ON "campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_starts_at_ends_at_idx" ON "campaigns"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_whatsapp_message_id_key" ON "whatsapp_messages"("whatsapp_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenant_id_idx" ON "whatsapp_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_customer_id_idx" ON "whatsapp_messages"("customer_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_direction_idx" ON "whatsapp_messages"("direction");

-- CreateIndex
CREATE INDEX "whatsapp_messages_created_at_idx" ON "whatsapp_messages"("created_at" DESC);

-- CreateIndex
CREATE INDEX "whatsapp_messages_whatsapp_message_id_idx" ON "whatsapp_messages"("whatsapp_message_id");

-- CreateIndex
CREATE INDEX "broadcasts_tenant_id_idx" ON "broadcasts"("tenant_id");

-- CreateIndex
CREATE INDEX "broadcasts_status_idx" ON "broadcasts"("status");

-- CreateIndex
CREATE INDEX "daily_metrics_tenant_id_idx" ON "daily_metrics"("tenant_id");

-- CreateIndex
CREATE INDEX "daily_metrics_metric_date_idx" ON "daily_metrics"("metric_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_tenant_id_metric_date_key" ON "daily_metrics"("tenant_id", "metric_date");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_points_balance" ADD CONSTRAINT "customer_points_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_points_balance" ADD CONSTRAINT "customer_points_balance_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_logged_by_user_id_fkey" FOREIGN KEY ("logged_by_user_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_rules" ADD CONSTRAINT "points_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
