// Cliente de Prisma — conexión a la base de datos
//
// Prisma 7 usa "driver adapters": en vez de conectarse solo a la BD,
// necesitamos pasarle explícitamente el cliente de PostgreSQL (pg).
// Esto da más control y mejor performance con connection pooling.
//
// Patrón singleton: en Next.js el hot reload en desarrollo recarga
// los módulos constantemente. Sin esto, cada recarga crea una nueva
// conexión a la BD hasta agotar el límite de Supabase.

import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Declaramos una variable global para guardar la instancia
// (las variables globales sobreviven al hot reload, los módulos no)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // PrismaPg toma la DATABASE_URL del .env y maneja el pool de conexiones
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

// Si ya existe una instancia la reutilizamos, si no creamos una nueva
export const db = globalForPrisma.prisma ?? createPrismaClient()

// Solo en desarrollo guardamos la instancia en la variable global
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
