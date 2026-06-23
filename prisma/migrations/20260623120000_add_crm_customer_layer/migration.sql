-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('LEAD', 'EXAMINING', 'IN_TREATMENT', 'COMPLETED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CONFIRMED', 'CHECKED_IN', 'DONE', 'NO_SHOW', 'CANCELLED');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "source" TEXT,
ADD COLUMN     "customer_status" "CustomerStatus" NOT NULL DEFAULT 'LEAD',
ADD COLUMN     "referrer_id" UUID;

-- CreateTable
CREATE TABLE "referrers" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "type" TEXT,
    "commission_rate" DECIMAL(5,2),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referrers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "doctor_name" TEXT,
    "clinic_branch" "ClinicBranch" NOT NULL DEFAULT 'HANG_BONG',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "note" TEXT,
    "visit_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referrers_full_name_idx" ON "referrers"("full_name");

-- CreateIndex
CREATE INDEX "referrers_phone_idx" ON "referrers"("phone");

-- CreateIndex
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "patients_customer_status_idx" ON "patients"("customer_status");

-- CreateIndex
CREATE INDEX "patients_referrer_id_idx" ON "patients"("referrer_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "referrers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
