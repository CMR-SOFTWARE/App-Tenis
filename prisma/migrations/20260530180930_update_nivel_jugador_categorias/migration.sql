-- Cambio de enum NivelJugador: de PRINCIPIANTE/INTERMEDIO/AVANZADO a categorías 7ma-1ra
-- Aplicado via prisma db push -- esta migración registra el cambio en el historial

CREATE TYPE "NivelJugador_new" AS ENUM ('SEPTIMA', 'SEXTA', 'QUINTA', 'CUARTA', 'TERCERA', 'SEGUNDA', 'PRIMERA');

ALTER TABLE "users" ALTER COLUMN "nivelJugador" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "nivelJugador" TYPE "NivelJugador_new" USING ("nivelJugador"::text::"NivelJugador_new");

ALTER TABLE "schedule_slots" ALTER COLUMN "nivelRequerido" DROP DEFAULT;
ALTER TABLE "schedule_slots" ALTER COLUMN "nivelRequerido" TYPE "NivelJugador_new" USING ("nivelRequerido"::text::"NivelJugador_new");

DROP TYPE "NivelJugador";
ALTER TYPE "NivelJugador_new" RENAME TO "NivelJugador";
