-- Seed default clinics if missing (match old enum codes)
INSERT INTO "clinics" ("id", "code", "name", "is_active", "sort_order", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'HANG_BONG', 'Hàng Bông', true, 0, NOW(), NOW()),
  (gen_random_uuid(), 'CAU_GIAY', 'Cầu Giấy', true, 1, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- staff: optional clinic_id
ALTER TABLE "staff" ADD COLUMN "clinic_id" UUID;
UPDATE "staff" s
SET "clinic_id" = c."id"
FROM "clinics" c
WHERE s."clinic_branch"::text = c."code";
ALTER TABLE "staff" DROP COLUMN "clinic_branch";
CREATE INDEX "staff_clinic_id_idx" ON "staff"("clinic_id");
ALTER TABLE "staff" ADD CONSTRAINT "staff_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- staff_shifts: required clinic_id
ALTER TABLE "staff_shifts" ADD COLUMN "clinic_id" UUID;
UPDATE "staff_shifts" ss
SET "clinic_id" = c."id"
FROM "clinics" c
WHERE ss."clinic_branch"::text = c."code";
-- orphan rows (shouldn't happen) → Hàng Bông
UPDATE "staff_shifts"
SET "clinic_id" = (SELECT "id" FROM "clinics" WHERE "code" = 'HANG_BONG' LIMIT 1)
WHERE "clinic_id" IS NULL;
ALTER TABLE "staff_shifts" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "staff_shifts" DROP COLUMN "clinic_branch";
DROP INDEX IF EXISTS "staff_shifts_clinic_branch_start_at_idx";
CREATE INDEX "staff_shifts_clinic_id_start_at_idx" ON "staff_shifts"("clinic_id", "start_at");
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- patients: required clinic_id
ALTER TABLE "patients" ADD COLUMN "clinic_id" UUID;
UPDATE "patients" p
SET "clinic_id" = c."id"
FROM "clinics" c
WHERE p."clinic_branch"::text = c."code";
UPDATE "patients"
SET "clinic_id" = (SELECT "id" FROM "clinics" WHERE "code" = 'HANG_BONG' LIMIT 1)
WHERE "clinic_id" IS NULL;
ALTER TABLE "patients" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "patients" DROP COLUMN "clinic_branch";
DROP INDEX IF EXISTS "patients_clinic_branch_idx";
CREATE INDEX "patients_clinic_id_idx" ON "patients"("clinic_id");
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- patient_follow_ups: facility → clinic_id
ALTER TABLE "patient_follow_ups" ADD COLUMN "clinic_id" UUID;
UPDATE "patient_follow_ups" f
SET "clinic_id" = c."id"
FROM "clinics" c
WHERE f."facility"::text = c."code";
UPDATE "patient_follow_ups"
SET "clinic_id" = (SELECT "id" FROM "clinics" WHERE "code" = 'HANG_BONG' LIMIT 1)
WHERE "clinic_id" IS NULL;
ALTER TABLE "patient_follow_ups" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "patient_follow_ups" DROP COLUMN "facility";
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- appointments: required clinic_id
ALTER TABLE "appointments" ADD COLUMN "clinic_id" UUID;
UPDATE "appointments" a
SET "clinic_id" = c."id"
FROM "clinics" c
WHERE a."clinic_branch"::text = c."code";
UPDATE "appointments"
SET "clinic_id" = (SELECT "id" FROM "clinics" WHERE "code" = 'HANG_BONG' LIMIT 1)
WHERE "clinic_id" IS NULL;
ALTER TABLE "appointments" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "appointments" DROP COLUMN "clinic_branch";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop unused enum
DROP TYPE IF EXISTS "ClinicBranch";
