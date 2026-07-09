-- AlterTable
ALTER TABLE "patient_follow_ups" ADD COLUMN     "reschedule_note" TEXT,
ADD COLUMN     "rescheduled_at" TIMESTAMPTZ(6),
ADD COLUMN     "rescheduled_by_id" UUID,
ADD COLUMN     "rescheduled_follow_up_date" DATE,
ADD COLUMN     "scheduled_appointment_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "patient_follow_ups_scheduled_appointment_id_key" ON "patient_follow_ups"("scheduled_appointment_id");

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_rescheduled_by_id_fkey" FOREIGN KEY ("rescheduled_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_scheduled_appointment_id_fkey" FOREIGN KEY ("scheduled_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
