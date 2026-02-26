-- CreateTable
CREATE TABLE "purchase_claims" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "amount_ngn" DOUBLE PRECISION NOT NULL,
    "purchase_date" TIMESTAMPTZ(6) NOT NULL,
    "channel" VARCHAR(50) DEFAULT 'physical_store',
    "receipt_url" TEXT,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "purchase_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_claims_tenant_id_idx" ON "purchase_claims"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_claims_customer_id_idx" ON "purchase_claims"("customer_id");

-- CreateIndex
CREATE INDEX "purchase_claims_status_idx" ON "purchase_claims"("status");

-- CreateIndex
CREATE INDEX "purchase_claims_created_at_idx" ON "purchase_claims"("created_at" DESC);

-- CreateIndex
CREATE INDEX "purchase_claims_tenant_id_status_idx" ON "purchase_claims"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "purchase_claims" ADD CONSTRAINT "purchase_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_claims" ADD CONSTRAINT "purchase_claims_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
