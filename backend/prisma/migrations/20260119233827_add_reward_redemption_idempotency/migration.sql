/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `reward_redemptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "reward_redemptions" ADD COLUMN     "idempotency_key" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_idempotency_key_key" ON "reward_redemptions"("idempotency_key");
