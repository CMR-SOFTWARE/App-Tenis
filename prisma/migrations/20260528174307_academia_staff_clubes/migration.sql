-- AlterEnum
ALTER TYPE "UserRol" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN     "profesorId" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "experienciaAnios" INTEGER,
ADD COLUMN     "fotoPerfil" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "ciudad" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_clubs" (
    "tenantId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,

    CONSTRAINT "tenant_clubs_pkey" PRIMARY KEY ("tenantId","clubId")
);

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_clubs" ADD CONSTRAINT "tenant_clubs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_clubs" ADD CONSTRAINT "tenant_clubs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
