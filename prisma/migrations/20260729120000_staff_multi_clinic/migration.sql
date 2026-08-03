-- CreateTable
CREATE TABLE "staff_clinics" (
    "staff_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_clinics_pkey" PRIMARY KEY ("staff_id","clinic_id")
);

-- Migrate existing staff.clinic_id into join table
INSERT INTO "staff_clinics" ("staff_id", "clinic_id")
SELECT "id", "clinic_id"
FROM "staff"
WHERE "clinic_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT IF EXISTS "staff_clinic_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "staff_clinic_id_idx";

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "clinic_id";

-- CreateIndex
CREATE INDEX "staff_clinics_clinic_id_idx" ON "staff_clinics"("clinic_id");

-- AddForeignKey
ALTER TABLE "staff_clinics" ADD CONSTRAINT "staff_clinics_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_clinics" ADD CONSTRAINT "staff_clinics_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
