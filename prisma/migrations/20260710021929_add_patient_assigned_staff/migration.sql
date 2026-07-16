-- CreateTable
CREATE TABLE "_PatientAssignedStaff" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PatientAssignedStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PatientAssignedStaff_B_index" ON "_PatientAssignedStaff"("B");

-- AddForeignKey
ALTER TABLE "_PatientAssignedStaff" ADD CONSTRAINT "_PatientAssignedStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatientAssignedStaff" ADD CONSTRAINT "_PatientAssignedStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
