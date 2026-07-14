-- CreateTable
CREATE TABLE "patient_treatment_sessions" (
    "id" UUID NOT NULL,
    "patient_service_record_id" UUID NOT NULL,
    "session_number" INTEGER NOT NULL,
    "doctor_id" UUID,
    "pt_ktv_id" UUID,
    "professional_support" TEXT,
    "treatment_content" TEXT NOT NULL,
    "note" TEXT,
    "next_content" TEXT,
    "next_treatment_date" TIMESTAMPTZ(6),
    "performed_at" TIMESTAMPTZ(6) NOT NULL,
    "performed_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_treatment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_treatment_sessions_patient_service_record_id_sessio_idx" ON "patient_treatment_sessions"("patient_service_record_id", "session_number");

-- CreateIndex
CREATE UNIQUE INDEX "patient_treatment_sessions_patient_service_record_id_sessio_key" ON "patient_treatment_sessions"("patient_service_record_id", "session_number");

-- AddForeignKey
ALTER TABLE "patient_treatment_sessions" ADD CONSTRAINT "patient_treatment_sessions_patient_service_record_id_fkey" FOREIGN KEY ("patient_service_record_id") REFERENCES "patient_service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_treatment_sessions" ADD CONSTRAINT "patient_treatment_sessions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_treatment_sessions" ADD CONSTRAINT "patient_treatment_sessions_pt_ktv_id_fkey" FOREIGN KEY ("pt_ktv_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_treatment_sessions" ADD CONSTRAINT "patient_treatment_sessions_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
