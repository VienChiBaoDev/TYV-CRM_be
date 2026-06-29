-- Rename StaffRole enum values to match auth roles (admin / doctor / assistant / staff).
-- The "staff" table has no rows yet, so renaming is safe and preserves existing references.
ALTER TYPE "StaffRole" RENAME VALUE 'CSKH' TO 'ASSISTANT';
ALTER TYPE "StaffRole" RENAME VALUE 'RECEPTION' TO 'STAFF';
