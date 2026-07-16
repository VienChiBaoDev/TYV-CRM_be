-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "ended_at" TIMESTAMPTZ(6);

-- Backfill existing rows with 30-minute default duration
UPDATE "appointments"
SET "ended_at" = "scheduled_at" + INTERVAL '30 minutes'
WHERE "ended_at" IS NULL;

ALTER TABLE "appointments" ALTER COLUMN "ended_at" SET NOT NULL;
