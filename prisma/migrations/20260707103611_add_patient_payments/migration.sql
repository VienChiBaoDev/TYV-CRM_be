-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "patient_service_records" ADD COLUMN     "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "patient_payments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "voucher_code" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_detail" TEXT,
    "bank_code" TEXT,
    "branch" TEXT NOT NULL,
    "content" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "processed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_payment_lines" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "patient_service_record_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "service_code" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,

    CONSTRAINT "patient_payment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_payments_voucher_code_key" ON "patient_payments"("voucher_code");

-- CreateIndex
CREATE INDEX "patient_payments_patient_id_created_at_idx" ON "patient_payments"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "patient_payment_lines_payment_id_idx" ON "patient_payment_lines"("payment_id");

-- CreateIndex
CREATE INDEX "patient_payment_lines_patient_service_record_id_idx" ON "patient_payment_lines"("patient_service_record_id");

-- AddForeignKey
ALTER TABLE "patient_payments" ADD CONSTRAINT "patient_payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_payments" ADD CONSTRAINT "patient_payments_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_payment_lines" ADD CONSTRAINT "patient_payment_lines_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "patient_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_payment_lines" ADD CONSTRAINT "patient_payment_lines_patient_service_record_id_fkey" FOREIGN KEY ("patient_service_record_id") REFERENCES "patient_service_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
