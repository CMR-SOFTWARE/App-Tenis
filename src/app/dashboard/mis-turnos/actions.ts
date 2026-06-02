"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { BookingEstado, NivelJugador, UserRol } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

const NIVELES: NivelJugador[] = [
  "SEPTIMA", "SEXTA", "QUINTA", "CUARTA", "TERCERA", "SEGUNDA", "PRIMERA",
]

function nextOccurrenceUTC(diaSemana: number): Date {
  const hoy = new Date()
  const dayOfWeek = hoy.getUTCDay()
  let daysUntil = diaSemana - dayOfWeek
  if (daysUntil <= 0) daysUntil += 7
  const next = new Date(hoy)
  next.setUTCDate(hoy.getUTCDate() + daysUntil)
  next.setUTCHours(12, 0, 0, 0)
  return next
}

export async function solicitarTurno(slotId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  const student = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, nivelJugador: true, rol: true },
  })

  if (!student || student.rol !== UserRol.STUDENT) return
  if (!student.tenantId) return

  const slot = await db.scheduleSlot.findUnique({
    where: { id: slotId },
    select: { tenantId: true, activo: true, diaSemana: true, capacidadMaxima: true, nivelRequerido: true },
  })

  if (!slot || !slot.activo) return
  if (slot.tenantId !== student.tenantId) return

  if (slot.nivelRequerido && student.nivelJugador) {
    if (NIVELES.indexOf(student.nivelJugador) < NIVELES.indexOf(slot.nivelRequerido)) return
  }

  const fecha = nextOccurrenceUTC(slot.diaSemana)

  const existing = await db.booking.findFirst({
    where: {
      slotId,
      studentId: session.user.id,
      fecha,
      estado: { in: [BookingEstado.CONFIRMADO, BookingEstado.PENDIENTE] },
    },
  })
  if (existing) return

  const ocupados = await db.booking.count({
    where: {
      slotId,
      fecha,
      estado: { in: [BookingEstado.CONFIRMADO, BookingEstado.PENDIENTE] },
    },
  })
  if (ocupados >= slot.capacidadMaxima) return

  await db.booking.create({
    data: { slotId, studentId: session.user.id, fecha, estado: BookingEstado.PENDIENTE },
  })

  revalidatePath("/dashboard/mis-turnos")
}

export async function cancelarTurno(bookingId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  const booking = await db.booking.findUnique({ where: { id: bookingId } })

  // Solo puede cancelar sus propias reservas
  if (!booking || booking.studentId !== session.user.id) return

  await db.booking.update({
    where: { id: bookingId },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/mis-turnos")
}
