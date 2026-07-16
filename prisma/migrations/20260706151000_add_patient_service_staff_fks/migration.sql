-- AddForeignKey
ALTER TABLE "patient_service_records" ADD CONSTRAINT "patient_service_records_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_service_records" ADD CONSTRAINT "patient_service_records_telesale_id_fkey" FOREIGN KEY ("telesale_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_service_records" ADD CONSTRAINT "patient_service_records_finalized_by_id_fkey" FOREIGN KEY ("finalized_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
