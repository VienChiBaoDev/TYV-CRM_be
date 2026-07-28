-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_bank_name_account_number_key" ON "bank_accounts"("bank_name", "account_number");

-- AlterTable
ALTER TABLE "patient_payments" ADD COLUMN     "bank_account_id" UUID,
ADD COLUMN     "bank_holder_snapshot" TEXT,
ADD COLUMN     "bank_name_snapshot" TEXT,
ADD COLUMN     "bank_number_snapshot" TEXT;

-- CreateIndex
CREATE INDEX "patient_payments_bank_account_id_idx" ON "patient_payments"("bank_account_id");

-- AddForeignKey
ALTER TABLE "patient_payments" ADD CONSTRAINT "patient_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
