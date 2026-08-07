-- CreateTable
CREATE TABLE "staff_permissions" (
    "staff_id" UUID NOT NULL,
    "permission_code" VARCHAR(64) NOT NULL,

    CONSTRAINT "staff_permissions_pkey" PRIMARY KEY ("staff_id","permission_code")
);

-- CreateIndex
CREATE INDEX "staff_permissions_permission_code_idx" ON "staff_permissions"("permission_code");

-- AddForeignKey
ALTER TABLE "staff_permissions" ADD CONSTRAINT "staff_permissions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
