-- CreateEnum
CREATE TYPE "PatientServiceStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "medical_cases" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "form_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "medical_cases_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "patient_service_records" ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_by_id" UUID,
ADD COLUMN     "status" "PatientServiceStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "medical_cases_patient_id_key" ON "medical_cases"("patient_id");

-- CreateIndex
CREATE INDEX "patient_service_records_patient_id_status_idx" ON "patient_service_records"("patient_id", "status");

-- AddForeignKey
ALTER TABLE "medical_cases" ADD CONSTRAINT "medical_cases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_service_records" ADD CONSTRAINT "patient_service_records_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
