-- CreateEnum
CREATE TYPE "StaffShiftType" AS ENUM ('WORK', 'OFF');

-- CreateTable
CREATE TABLE "staff_shifts" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "clinic_branch" "ClinicBranch" NOT NULL,
    "type" "StaffShiftType" NOT NULL DEFAULT 'WORK',
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_shifts_staff_id_start_at_idx" ON "staff_shifts"("staff_id", "start_at");

-- CreateIndex
CREATE INDEX "staff_shifts_clinic_branch_start_at_idx" ON "staff_shifts"("clinic_branch", "start_at");

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
