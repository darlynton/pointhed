-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "home_currency" CHAR(3),
ADD COLUMN     "timezone" VARCHAR(100);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "customer_id" UUID,
    "amount_local" DECIMAL(20,8) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "amount_base" DECIMAL(20,8) NOT NULL,
    "exchange_rate" DECIMAL(30,12) NOT NULL,
    "timestamp_utc" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL,
    "from_currency" CHAR(3) NOT NULL,
    "to_currency" CHAR(3) NOT NULL,
    "rate" DECIMAL(30,12) NOT NULL,
    "retrieved_at" TIMESTAMPTZ(6) NOT NULL,
    "provider" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_vendor_id_idx" ON "transactions"("vendor_id");

-- CreateIndex
CREATE INDEX "transactions_customer_id_idx" ON "transactions"("customer_id");

-- CreateIndex
CREATE INDEX "exchange_rates_from_currency_to_currency_idx" ON "exchange_rates"("from_currency", "to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_from_currency_to_currency_retrieved_at_key" ON "exchange_rates"("from_currency", "to_currency", "retrieved_at");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
