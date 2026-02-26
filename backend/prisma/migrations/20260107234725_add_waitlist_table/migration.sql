-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "source" VARCHAR(100) NOT NULL DEFAULT 'landing_page',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_key" ON "waitlist"("email");

-- CreateIndex
CREATE INDEX "waitlist_email_idx" ON "waitlist"("email");

-- CreateIndex
CREATE INDEX "waitlist_status_idx" ON "waitlist"("status");

-- CreateIndex
CREATE INDEX "waitlist_created_at_idx" ON "waitlist"("created_at" DESC);
