-- CreateTable
CREATE TABLE "whatsapp_leads" (
    "id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "country_code" VARCHAR(5) NOT NULL,
    "raw_number" VARCHAR(20) NOT NULL,
    "source" VARCHAR(100) NOT NULL DEFAULT 'landing_page',
    "status" VARCHAR(50) NOT NULL DEFAULT 'sent',
    "message_id" VARCHAR(255),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_leads_phone_number_idx" ON "whatsapp_leads"("phone_number");

-- CreateIndex
CREATE INDEX "whatsapp_leads_status_idx" ON "whatsapp_leads"("status");

-- CreateIndex
CREATE INDEX "whatsapp_leads_created_at_idx" ON "whatsapp_leads"("created_at" DESC);
