-- CreateTable
CREATE TABLE "medical_cases" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "form_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "medical_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_cases_patient_id_key" ON "medical_cases"("patient_id");

-- AddForeignKey
ALTER TABLE "medical_cases" ADD CONSTRAINT "medical_cases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
