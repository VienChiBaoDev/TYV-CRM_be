-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ClinicBranch" AS ENUM ('HANG_BONG', 'CAU_GIAY');

-- CreateEnum
CREATE TYPE "VisitMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('INITIAL_EXAM', 'FOLLOW_UP', 'ONLINE', 'NEED_ADJUSTMENT', 'PLANNED');

-- CreateEnum
CREATE TYPE "TreatmentPlanStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FollowUpScheduleStatus" AS ENUM ('SCHEDULED', 'NOT_SCHEDULED');

-- CreateEnum
CREATE TYPE "ClinicalAssessmentResult" AS ENUM ('GOOD_PROGRESS', 'NORMAL', 'NEED_CONSULTATION', 'GOOD_PROGRESS_ALT', 'CANCELLED');

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "patient_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" DATE,
    "occupation" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "avatar_initials" TEXT,
    "clinic_branch" "ClinicBranch" NOT NULL DEFAULT 'HANG_BONG',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "diet_restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "next_follow_up_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_visits" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "visit_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "visit_date" DATE NOT NULL,
    "doctor_name" TEXT NOT NULL,
    "mode" "VisitMode" NOT NULL,
    "location" TEXT NOT NULL,
    "blood_pressure" TEXT,
    "pulse" TEXT,
    "symptoms" TEXT,
    "pulse_diagnosis_ta" TEXT,
    "pulse_diagnosis_huu" TEXT,
    "pulse_diagnosis_bung" TEXT,
    "prescription_formula" TEXT,
    "prescription_dosage" TEXT,
    "lab_results" TEXT,
    "status" "VisitStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "medical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_herbs" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "visit_herbs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_clinical_images" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "visit_clinical_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "consultant_name" TEXT,
    "total_sessions" INTEGER NOT NULL,
    "completed_sessions" INTEGER NOT NULL DEFAULT 0,
    "active_session" INTEGER NOT NULL DEFAULT 1,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_sessions" (
    "id" UUID NOT NULL,
    "treatment_plan_id" UUID NOT NULL,
    "session_number" INTEGER NOT NULL,
    "doctor_name" TEXT,
    "pt_ktv_name" TEXT,
    "professional_support" TEXT,
    "treatment_content" TEXT,
    "note" TEXT,
    "next_content" TEXT,
    "next_treatment_date" TIMESTAMPTZ(6),
    "performed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "treatment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_schedules" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "follow_up_date" DATE NOT NULL,
    "physician_in_charge" TEXT NOT NULL,
    "facility" "ClinicBranch" NOT NULL DEFAULT 'HANG_BONG',
    "status" "FollowUpScheduleStatus" NOT NULL DEFAULT 'NOT_SCHEDULED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "follow_up_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_assessments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "visit_id" UUID,
    "assessment_date" DATE NOT NULL,
    "physician_in_charge" TEXT NOT NULL,
    "result" "ClinicalAssessmentResult",
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clinical_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_patient_code_key" ON "patients"("patient_code");

-- CreateIndex
CREATE INDEX "patients_full_name_idx" ON "patients"("full_name");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_clinic_branch_idx" ON "patients"("clinic_branch");

-- CreateIndex
CREATE INDEX "patients_next_follow_up_date_idx" ON "patients"("next_follow_up_date");

-- CreateIndex
CREATE INDEX "medical_visits_patient_id_visit_date_idx" ON "medical_visits"("patient_id", "visit_date" DESC);

-- CreateIndex
CREATE INDEX "medical_visits_status_idx" ON "medical_visits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "medical_visits_patient_id_visit_number_key" ON "medical_visits"("patient_id", "visit_number");

-- CreateIndex
CREATE INDEX "visit_herbs_visit_id_sort_order_idx" ON "visit_herbs"("visit_id", "sort_order");

-- CreateIndex
CREATE INDEX "visit_clinical_images_visit_id_sort_order_idx" ON "visit_clinical_images"("visit_id", "sort_order");

-- CreateIndex
CREATE INDEX "treatment_plans_patient_id_status_idx" ON "treatment_plans"("patient_id", "status");

-- CreateIndex
CREATE INDEX "treatment_sessions_treatment_plan_id_session_number_idx" ON "treatment_sessions"("treatment_plan_id", "session_number");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_sessions_treatment_plan_id_session_number_key" ON "treatment_sessions"("treatment_plan_id", "session_number");

-- CreateIndex
CREATE INDEX "follow_up_schedules_follow_up_date_status_idx" ON "follow_up_schedules"("follow_up_date", "status");

-- CreateIndex
CREATE INDEX "follow_up_schedules_patient_id_idx" ON "follow_up_schedules"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_assessments_patient_id_assessment_date_idx" ON "clinical_assessments"("patient_id", "assessment_date" DESC);

-- CreateIndex
CREATE INDEX "clinical_assessments_result_idx" ON "clinical_assessments"("result");

-- AddForeignKey
ALTER TABLE "medical_visits" ADD CONSTRAINT "medical_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_herbs" ADD CONSTRAINT "visit_herbs_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "medical_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_clinical_images" ADD CONSTRAINT "visit_clinical_images_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "medical_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_assessments" ADD CONSTRAINT "clinical_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_assessments" ADD CONSTRAINT "clinical_assessments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "medical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
