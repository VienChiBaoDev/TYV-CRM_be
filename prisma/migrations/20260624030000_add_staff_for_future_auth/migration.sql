-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'DOCTOR', 'CSKH', 'RECEPTION');

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "clinic_branch" "ClinicBranch",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE INDEX "staff_role_idx" ON "staff"("role");

-- CreateIndex
CREATE INDEX "staff_clinic_branch_idx" ON "staff"("clinic_branch");

-- AlterTable
ALTER TABLE "medical_visits" ADD COLUMN IF NOT EXISTS "created_by_id" UUID;
ALTER TABLE "medical_visits" ADD COLUMN IF NOT EXISTS "updated_by_id" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "patient_follow_ups_created_by_id_idx" ON "patient_follow_ups"("created_by_id");

-- AddForeignKey
ALTER TABLE "medical_visits" ADD CONSTRAINT "medical_visits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_visits" ADD CONSTRAINT "medical_visits_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
