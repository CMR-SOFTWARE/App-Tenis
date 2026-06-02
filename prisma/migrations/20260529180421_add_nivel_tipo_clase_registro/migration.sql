-- CreateEnum
CREATE TYPE "NivelJugador" AS ENUM ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO');

-- CreateEnum
CREATE TYPE "TipoClase" AS ENUM ('INDIVIDUAL', 'PARTICULAR_CERRADA', 'GRUPAL');

-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN     "capacidadMaxima" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "nivelRequerido" "NivelJugador",
ADD COLUMN     "precioGrupal" DOUBLE PRECISION,
ADD COLUMN     "tipoClase" "TipoClase" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "precioPorHora" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "esMenor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN     "nivelJugador" "NivelJugador",
ADD COLUMN     "password" TEXT,
ADD COLUMN     "tutorNombre" TEXT,
ADD COLUMN     "tutorTelefono" TEXT;
