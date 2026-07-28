-- AlterTable
ALTER TABLE "visit_herbs" ADD COLUMN     "line_total" DECIMAL(12,2),
ADD COLUMN     "medicine_id" UUID,
ADD COLUMN     "quantity" DECIMAL(12,3),
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "unit_price" DECIMAL(12,2);

-- AddForeignKey
ALTER TABLE "visit_herbs" ADD CONSTRAINT "visit_herbs_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
