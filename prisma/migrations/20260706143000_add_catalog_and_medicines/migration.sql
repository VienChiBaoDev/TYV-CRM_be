-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('SERVICE', 'PRODUCT');

-- CreateEnum
CREATE TYPE "CatalogServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "service_groups" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "item_type" "ServiceItemType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_id" UUID NOT NULL,
    "item_type" "ServiceItemType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "alternate_price" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "CatalogServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "min_price_vat" DECIMAL(12,2),
    "max_price_vat" DECIMAL(12,2),
    "treatment_count" INTEGER NOT NULL DEFAULT 1,
    "expiry_days" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_groups_code_key" ON "service_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_services_code_key" ON "catalog_services"("code");

-- CreateIndex
CREATE INDEX "catalog_services_group_id_idx" ON "catalog_services"("group_id");

-- CreateIndex
CREATE INDEX "catalog_services_status_idx" ON "catalog_services"("status");

-- CreateIndex
CREATE INDEX "catalog_services_item_type_idx" ON "catalog_services"("item_type");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_unit_idx" ON "medicines"("unit");

-- AddForeignKey
ALTER TABLE "catalog_services" ADD CONSTRAINT "catalog_services_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "service_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
