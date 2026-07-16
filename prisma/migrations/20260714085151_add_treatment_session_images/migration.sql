-- CreateTable
CREATE TABLE "patient_treatment_session_images" (
    "id" UUID NOT NULL,
    "patient_treatment_session_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "storage_path" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_treatment_session_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_treatment_session_images_patient_treatment_session__idx" ON "patient_treatment_session_images"("patient_treatment_session_id", "sort_order");

-- AddForeignKey
ALTER TABLE "patient_treatment_session_images" ADD CONSTRAINT "patient_treatment_session_images_patient_treatment_session_fkey" FOREIGN KEY ("patient_treatment_session_id") REFERENCES "patient_treatment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
