-- CreateEnum
CREATE TYPE "ClinicalImageCategory" AS ENUM ('DIAGNOSIS', 'LAB_RESULT', 'OTHER');

-- AlterTable
ALTER TABLE "visit_clinical_images" ADD COLUMN "storage_path" TEXT;
ALTER TABLE "visit_clinical_images" ADD COLUMN "category" "ClinicalImageCategory" NOT NULL DEFAULT 'OTHER';

-- DropIndex
DROP INDEX IF EXISTS "visit_clinical_images_visit_id_sort_order_idx";

-- CreateIndex
CREATE INDEX "visit_clinical_images_visit_id_category_sort_order_idx" ON "visit_clinical_images"("visit_id", "category", "sort_order");
