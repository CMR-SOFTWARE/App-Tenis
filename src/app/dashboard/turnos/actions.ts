"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { BookingEstado } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })
  return user?.tenantId ?? null
}

export async function bloquearSlot(diaSemana: number, horaInicio: string) {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const existente = await db.scheduleSlot.findFirst({
    where: { tenantId, diaSemana, horaInicio },
  })

  if (existente) {
    await db.scheduleSlot.update({ where: { id: existente.id }, data: { activo: false } })
  } else {
    await db.scheduleSlot.create({ data: { tenantId, diaSemana, horaInicio, activo: false } })
  }

  revalidatePath("/dashboard/turnos")
}

export async function desbloquearSlot(slotId: string) {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return

  await db.scheduleSlot.update({ where: { id: slotId }, data: { activo: true } })
  revalidatePath("/dashboard/turnos")
}

export async function asignarAlumno(diaSemana: number, horaInicio: string, studentId: string) {
  const tenantId = await getTenantId()
  if (!tenantId) return

  // Buscar o crear el slot
  let slot = await db.scheduleSlot.findFirst({ where: { tenantId, diaSemana, horaInicio } })

  if (!slot) {
    slot = await db.scheduleSlot.create({ data: { tenantId, diaSemana, horaInicio, activo: true } })
  } else if (!slot.activo) {
    return // No se puede asignar a un slot bloqueado
  }

  // Cancelar asignaciones futuras previas para reasignar limpio
  await db.booking.updateMany({
    where: { slotId: slot.id, fecha: { gte: new Date() }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  // Crear reservas para las próximas 12 semanas (3 meses)
  const fechas: Date[] = []
  const cursor = new Date()
  cursor.setUTCHours(12, 0, 0, 0)
  cursor.setUTCDate(cursor.getUTCDate() + 1)

  while (fechas.length < 12) {
    if (cursor.getUTCDay() === diaSemana) fechas.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  await db.booking.createMany({
    data: fechas.map((fecha) => ({
      slotId: slot!.id,
      studentId,
      fecha,
      estado: BookingEstado.CONFIRMADO,
    })),
  })

  revalidatePath("/dashboard/turnos")
}

export async function cancelarAsignacionSlot(slotId: string) {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return

  await db.booking.updateMany({
    where: { slotId, fecha: { gte: new Date() }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/turnos")
}
