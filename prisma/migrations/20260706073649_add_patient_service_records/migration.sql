-- CreateTable
CREATE TABLE "patient_service_records" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "catalog_service_id" UUID NOT NULL,
    "service_code" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "consultant_id" UUID NOT NULL,
    "telesale_id" UUID,
    "finalized_by_id" UUID NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "vat_percent" DECIMAL(5,2) NOT NULL,
    "vat_amount" DECIMAL(12,2) NOT NULL,
    "unit_price_after_vat" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(12,2) NOT NULL,
    "list_price" DECIMAL(12,2),
    "completed_sessions" INTEGER NOT NULL DEFAULT 0,
    "treatment_count" INTEGER NOT NULL DEFAULT 0,
    "expiry_date" DATE,
    "note" TEXT,
    "finalized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_service_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_service_records_patient_id_finalized_at_idx" ON "patient_service_records"("patient_id", "finalized_at" DESC);

-- AddForeignKey
ALTER TABLE "patient_service_records" ADD CONSTRAINT "patient_service_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_service_records" ADD CONSTRAINT "patient_service_records_catalog_service_id_fkey" FOREIGN KEY ("catalog_service_id") REFERENCES "catalog_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
