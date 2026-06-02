// Seed de usuarios demo para Cancha
// Ejecutar con: npx tsx prisma/seed.ts
// O con: npx prisma db seed

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

const DEMO_PASSWORD = "demo1234"

async function main() {
  console.log("Seeding demo users...")
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)

  // ── 1. Demo Profesor ──
  let tenantProfesor = await db.tenant.findFirst({
    where: { subdominio: "demo" },
  })
  if (!tenantProfesor) {
    tenantProfesor = await db.tenant.create({
      data: {
        subdominio: "demo",
        tipo: "PROFESOR",
        nombre: "Carlos Mendoza",
        bio: "Profesor certificado — datos de demostración sin base de datos.",
        experienciaAnios: 12,
        precioPorHora: 15000,
        whatsapp: "+54 336 428 0000",
      },
    })
    console.log("  ✓ Tenant demo creado:", tenantProfesor.id)
  } else {
    console.log("  · Tenant demo ya existe:", tenantProfesor.id)
  }

  const existeProfe = await db.user.findUnique({ where: { email: "demo.profesor@cancha.app" } })
  if (!existeProfe) {
    await db.user.create({
      data: {
        email: "demo.profesor@cancha.app",
        nombre: "Carlos",
        apellido: "Mendoza",
        name: "Carlos Mendoza",
        password: hash,
        rol: "TENANT_OWNER",
        tenantId: tenantProfesor.id,
      },
    })
    console.log("  ✓ Usuario demo.profesor creado")
  } else {
    console.log("  · demo.profesor ya existe")
  }

  // Recrear todos los slots Lun–Sáb × 08:00–21:00
  const slotsExistentes = await db.scheduleSlot.count({ where: { tenantId: tenantProfesor.id } })
  if (slotsExistentes !== 84) {
    // Eliminar bookings relacionados antes de borrar slots
    const slotIds = (await db.scheduleSlot.findMany({ where: { tenantId: tenantProfesor.id }, select: { id: true } })).map(s => s.id)
    if (slotIds.length > 0) await db.booking.deleteMany({ where: { slotId: { in: slotIds } } })
    await db.scheduleSlot.deleteMany({ where: { tenantId: tenantProfesor.id } })
    const initSlots: { tenantId: string; diaSemana: number; horaInicio: string; duracionMin: number; activo: boolean }[] = []
    for (let day = 1; day <= 6; day++) {
      for (let hour = 8; hour <= 21; hour++) {
        initSlots.push({
          tenantId: tenantProfesor.id,
          diaSemana: day,
          horaInicio: `${String(hour).padStart(2, "0")}:00`,
          duracionMin: 60,
          activo: true,
        })
      }
    }
    await db.scheduleSlot.createMany({ data: initSlots })
    console.log(`  ✓ 84 slots demo creados`)
  } else {
    console.log("  · Slots demo ya OK (84)")
  }

  // ── 2. Demo Jugador ──
  const existeJugador = await db.user.findUnique({ where: { email: "demo.jugador@cancha.app" } })
  if (!existeJugador) {
    await db.user.create({
      data: {
        email: "demo.jugador@cancha.app",
        nombre: "Juan",
        apellido: "García",
        name: "Juan García",
        password: hash,
        rol: "STUDENT",
        alumnoEstado: "ACTIVO",
        nivelJugador: "SEPTIMA",
        tenantId: tenantProfesor.id,
      },
    })
    console.log("  ✓ Usuario demo.jugador creado")
  } else {
    console.log("  · demo.jugador ya existe")
  }

  // ── 3. Demo Club ──
  let tenantClub = await db.tenant.findFirst({ where: { subdominio: "demo-club" } })
  if (!tenantClub) {
    tenantClub = await db.tenant.create({
      data: {
        subdominio: "demo-club",
        tipo: "CLUB",
        nombre: "Club Demo",
      },
    })
    console.log("  ✓ Tenant demo-club creado")
  } else {
    console.log("  · demo-club ya existe")
  }

  const existeClub = await db.user.findUnique({ where: { email: "demo.club@cancha.app" } })
  if (!existeClub) {
    await db.user.create({
      data: {
        email: "demo.club@cancha.app",
        nombre: "Admin",
        apellido: "Club",
        name: "Admin Club",
        password: hash,
        rol: "TENANT_OWNER",
        tenantId: tenantClub.id,
      },
    })
    console.log("  ✓ Usuario demo.club creado")
  } else {
    console.log("  · demo.club ya existe")
  }

  console.log("\nSeed completado.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
