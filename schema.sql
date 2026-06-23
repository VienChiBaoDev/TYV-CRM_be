-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserAppRole" AS ENUM ('MEMBER', 'LEADER', 'MANAGER', 'HR', 'TEACHER', 'BOD');

-- CreateEnum
CREATE TYPE "CareerLevel" AS ENUM ('tap_su', 'biet_viec', 'duoc_viec', 'dong_gop_ket_qua', 'tuong');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('locked', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "ExamOutcome" AS ENUM ('DAT', 'BAO_LUU', 'CHO_HOC_LAI', 'CHIA_TAY');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('open', 'full', 'closed');

-- CreateEnum
CREATE TYPE "ExamSubmissionStatus" AS ENUM ('pending', 'grading', 'done');

-- CreateEnum
CREATE TYPE "PerformanceItemKind" AS ENUM ('KPI', 'OKR');

-- CreateEnum
CREATE TYPE "PerformanceAssignmentStatus" AS ENUM ('not_started', 'in_progress', 'done', 'blocked');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "lark_record_id" TEXT NOT NULL,
    "start_date_work" TEXT,
    "employment_status" TEXT,
    "full_name_legal" TEXT,
    "employee_code_primary" TEXT,
    "job_title" TEXT,
    "direct_manager" TEXT,
    "gender" TEXT,
    "email" TEXT,
    "birth_date" TEXT,
    "phone_primary" TEXT,
    "education_level" TEXT,
    "address_current" TEXT,
    "address_household" TEXT,
    "identity_document_info" TEXT,
    "marital_status" TEXT,
    "children_info" TEXT,
    "emergency_contact_1" TEXT,
    "school_name" TEXT,
    "bank_account_info" TEXT,
    "vehicle_info" TEXT,
    "hometown_detail" TEXT,
    "family_notes" TEXT,
    "father_guardian_contact" TEXT,
    "mother_guardian_contact" TEXT,
    "attachment_id_front" TEXT,
    "attachment_id_back" TEXT,
    "facebook_url" TEXT,
    "profile_review_date" TEXT,
    "cv_attachment_ref" TEXT,
    "province_after_merger" TEXT,
    "hometown_new" TEXT,
    "birth_time" TEXT,
    "insurance_book_number" TEXT,
    "cccd_photo_link" TEXT,
    "form_submitted_at" TEXT,
    "confidentiality_agreement" TEXT,
    "manager_text" TEXT,
    "raw_data" JSONB NOT NULL,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "department_id" UUID,
    "team_id" UUID,
    "admin_unit_code" TEXT,
    "manager_block_code" TEXT,
    "team_order_number" TEXT,
    "submitted_on_1" TEXT,
    "division_id" UUID,
    "role" "UserAppRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable