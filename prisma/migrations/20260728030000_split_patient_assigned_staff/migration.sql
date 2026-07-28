-- Tách quan hệ phụ trách khách hàng thành 2 nhóm: bác sĩ và trợ lý.

-- CreateTable: bác sĩ phụ trách
CREATE TABLE "_PatientAssignedDoctors" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PatientAssignedDoctors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PatientAssignedDoctors_B_index" ON "_PatientAssignedDoctors"("B");

-- CreateTable: trợ lý phụ trách
CREATE TABLE "_PatientAssignedAssistants" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PatientAssignedAssistants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PatientAssignedAssistants_B_index" ON "_PatientAssignedAssistants"("B");

-- AddForeignKey
ALTER TABLE "_PatientAssignedDoctors" ADD CONSTRAINT "_PatientAssignedDoctors_A_fkey" FOREIGN KEY ("A") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PatientAssignedDoctors" ADD CONSTRAINT "_PatientAssignedDoctors_B_fkey" FOREIGN KEY ("B") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PatientAssignedAssistants" ADD CONSTRAINT "_PatientAssignedAssistants_A_fkey" FOREIGN KEY ("A") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PatientAssignedAssistants" ADD CONSTRAINT "_PatientAssignedAssistants_B_fkey" FOREIGN KEY ("B") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: chuyển dữ liệu phụ trách cũ sang nhóm tương ứng theo vai trò nhân viên.
INSERT INTO "_PatientAssignedDoctors" ("A", "B")
SELECT s."A", s."B"
FROM "_PatientAssignedStaff" s
JOIN "staff" st ON st."id" = s."B"
WHERE st."role" = 'DOCTOR'
ON CONFLICT DO NOTHING;

INSERT INTO "_PatientAssignedAssistants" ("A", "B")
SELECT s."A", s."B"
FROM "_PatientAssignedStaff" s
JOIN "staff" st ON st."id" = s."B"
WHERE st."role" = 'ASSISTANT'
ON CONFLICT DO NOTHING;

-- DropTable: bảng phụ trách chung cũ
DROP TABLE "_PatientAssignedStaff";
