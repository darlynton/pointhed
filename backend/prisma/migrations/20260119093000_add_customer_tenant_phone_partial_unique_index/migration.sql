-- Reinstate uniqueness for active customers per tenant
-- Allows duplicates only if a record is soft-deleted

CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_phone_number_key"
ON "customers" ("tenant_id", "phone_number")
WHERE "deleted_at" IS NULL;
