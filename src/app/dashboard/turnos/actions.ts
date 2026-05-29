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

export async function bloquearSlot(
  diaSemana: number,
  horaInicio: string
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const existente = await db.scheduleSlot.findFirst({
    where: { tenantId, diaSemana, horaInicio },
  })

  if (existente) {
    await db.scheduleSlot.update({ where: { id: existente.id }, data: { activo: false } })
  } else {
    await db.scheduleSlot.create({ data: { tenantId, diaSemana, horaInicio, activo: false } })
  }

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function desbloquearSlot(slotId: string): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return

  await db.scheduleSlot.update({ where: { id: slotId }, data: { activo: true } })
  revalidatePath("/dashboard/turnos")
}

export async function asignarAlumno(
  diaSemana: number,
  horaInicio: string,
  studentId: string
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  // Verificar que el alumno pertenece a este tenant
  const alumno = await db.user.findUnique({
    where: { id: studentId },
    select: { tenantId: true, name: true },
  })
  if (!alumno || alumno.tenantId !== tenantId) {
    return { error: "Este alumno no pertenece a tu academia" }
  }

  // Buscar o crear el slot
  let slot = await db.scheduleSlot.findFirst({ where: { tenantId, diaSemana, horaInicio } })

  if (!slot) {
    slot = await db.scheduleSlot.create({ data: { tenantId, diaSemana, horaInicio, activo: true } })
  } else if (!slot.activo) {
    return { error: "Este horario está bloqueado. Desbloquealo primero." }
  }

  // Cancelar reservas futuras anteriores para reasignar limpio
  await db.booking.updateMany({
    where: { slotId: slot.id, fecha: { gte: new Date() }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  // Crear reservas para las próximas 12 semanas
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
  return {}
}

export async function cancelarAsignacionSlot(slotId: string): Promise<void> {
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
