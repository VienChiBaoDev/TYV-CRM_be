-- CreateTable
CREATE TABLE "consumables" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "note" TEXT,
    "session_quota_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_session_consumables" (
    "id" UUID NOT NULL,
    "patient_treatment_session_id" UUID NOT NULL,
    "consumable_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "unit_snapshot" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_session_consumables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consumables_name_unit_key" ON "consumables"("name", "unit");

-- CreateIndex
CREATE INDEX "treatment_session_consumables_patient_treatment_session_id__idx" ON "treatment_session_consumables"("patient_treatment_session_id", "sort_order");

-- CreateIndex
CREATE INDEX "treatment_session_consumables_consumable_id_created_at_idx" ON "treatment_session_consumables"("consumable_id", "created_at");

-- AddForeignKey
ALTER TABLE "treatment_session_consumables" ADD CONSTRAINT "treatment_session_consumables_patient_treatment_session_id_fkey" FOREIGN KEY ("patient_treatment_session_id") REFERENCES "patient_treatment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_session_consumables" ADD CONSTRAINT "treatment_session_consumables_consumable_id_fkey" FOREIGN KEY ("consumable_id") REFERENCES "consumables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
