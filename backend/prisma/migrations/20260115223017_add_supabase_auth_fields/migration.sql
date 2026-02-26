-- AlterTable
ALTER TABLE "platform_admins" ADD COLUMN     "supabase_user_id" UUID;

-- AlterTable
ALTER TABLE "vendor_users" ADD COLUMN     "supabase_user_id" UUID;

-- CreateIndex
CREATE INDEX "platform_admins_supabase_user_id_idx" ON "platform_admins"("supabase_user_id");

-- CreateIndex
CREATE INDEX "vendor_users_supabase_user_id_idx" ON "vendor_users"("supabase_user_id");
