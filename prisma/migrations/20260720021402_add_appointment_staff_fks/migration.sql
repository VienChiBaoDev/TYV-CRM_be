-- DropIndex
DROP INDEX "medical_visits_status_idx";

-- DropIndex
DROP INDEX "patient_follow_ups_created_by_id_idx";

-- DropIndex
DROP INDEX "patient_treatment_sessions_patient_service_record_id_sessio_idx";

-- DropIndex
DROP INDEX "referrers_full_name_idx";

-- DropIndex
DROP INDEX "referrers_phone_idx";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "assistant_id" UUID,
ADD COLUMN     "doctor_id" UUID;

-- CreateIndex
CREATE INDEX "appointments_doctor_id_scheduled_at_idx" ON "appointments"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_assistant_id_scheduled_at_idx" ON "appointments"("assistant_id", "scheduled_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
