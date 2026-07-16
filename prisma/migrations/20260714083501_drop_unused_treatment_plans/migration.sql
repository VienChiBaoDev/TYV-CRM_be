/*
  Warnings:

  - You are about to drop the `treatment_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `treatment_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "treatment_plans" DROP CONSTRAINT "treatment_plans_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "treatment_sessions" DROP CONSTRAINT "treatment_sessions_treatment_plan_id_fkey";

-- DropTable
DROP TABLE "treatment_plans";

-- DropTable
DROP TABLE "treatment_sessions";

-- DropEnum
DROP TYPE "TreatmentPlanStatus";
