-- DropForeignKey
ALTER TABLE "clinical_assessments" DROP CONSTRAINT IF EXISTS "clinical_assessments_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "clinical_assessments" DROP CONSTRAINT IF EXISTS "clinical_assessments_visit_id_fkey";

-- DropForeignKey
ALTER TABLE "follow_up_schedules" DROP CONSTRAINT IF EXISTS "follow_up_schedules_patient_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "clinical_assessments";

-- DropTable
DROP TABLE IF EXISTS "follow_up_schedules";

-- CreateTable
CREATE TABLE "patient_follow_ups" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "originating_visit_id" UUID NOT NULL,
    "completed_visit_id" UUID,
    "follow_up_date" DATE NOT NULL,
    "assessment_date" DATE NOT NULL,
    "physician_in_charge" TEXT NOT NULL,
    "facility" "ClinicBranch" NOT NULL DEFAULT 'HANG_BONG',
    "schedule_status" "FollowUpScheduleStatus" NOT NULL DEFAULT 'NOT_SCHEDULED',
    "assessment_result" "ClinicalAssessmentResult",
    "assessment_note" TEXT,
    "assessed_at" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_follow_ups_follow_up_date_schedule_status_idx" ON "patient_follow_ups"("follow_up_date", "schedule_status");

-- CreateIndex
CREATE INDEX "patient_follow_ups_assessment_date_assessment_result_idx" ON "patient_follow_ups"("assessment_date", "assessment_result");

-- CreateIndex
CREATE INDEX "patient_follow_ups_patient_id_idx" ON "patient_follow_ups"("patient_id");

-- CreateIndex
CREATE INDEX "patient_follow_ups_originating_visit_id_idx" ON "patient_follow_ups"("originating_visit_id");

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_originating_visit_id_fkey" FOREIGN KEY ("originating_visit_id") REFERENCES "medical_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_completed_visit_id_fkey" FOREIGN KEY ("completed_visit_id") REFERENCES "medical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
