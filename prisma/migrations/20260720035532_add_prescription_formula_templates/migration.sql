-- CreateTable
CREATE TABLE "prescription_formula_templates" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prescription_formula_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_formula_herbs" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "medicine_id" UUID,
    "name" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,3),
    "decoction_order" TEXT,
    "decoction_prep" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prescription_formula_herbs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescription_formula_templates_staff_id_idx" ON "prescription_formula_templates"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_formula_templates_staff_id_name_key" ON "prescription_formula_templates"("staff_id", "name");

-- CreateIndex
CREATE INDEX "prescription_formula_herbs_template_id_sort_order_idx" ON "prescription_formula_herbs"("template_id", "sort_order");

-- AddForeignKey
ALTER TABLE "prescription_formula_templates" ADD CONSTRAINT "prescription_formula_templates_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_formula_herbs" ADD CONSTRAINT "prescription_formula_herbs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "prescription_formula_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_formula_herbs" ADD CONSTRAINT "prescription_formula_herbs_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
