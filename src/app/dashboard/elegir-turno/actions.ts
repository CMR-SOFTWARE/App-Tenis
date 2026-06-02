"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AlumnoEstado, BookingEstado, TipoClase, UserRol } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

export async function reclamarSlot(slotId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }

  const student = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, rol: true, alumnoEstado: true, nivelJugador: true },
  })
  if (!student?.tenantId || student.rol !== UserRol.STUDENT) {
    return { error: "Solo los alumnos pueden elegir un turno" }
  }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== student.tenantId) {
    return { error: "Turno no encontrado" }
  }
  if (!slot.activo) {
    return { error: "Este horario no está disponible" }
  }

  // Validar nivel
  if (slot.nivelRequerido && slot.nivelRequerido !== student.nivelJugador) {
    return {
      error: `Este turno es para nivel ${slot.nivelRequerido.toLowerCase()}. Tu nivel es ${student.nivelJugador?.toLowerCase() ?? "no definido"}.`,
    }
  }

  const hoy = new Date()

  // Validar capacidad: contar alumnos distintos con bookings futuros (excluyendo al propio)
  const alumnosActuales = await db.booking.groupBy({
    by: ["studentId"],
    where: {
      slotId,
      fecha: { gte: hoy },
      estado: BookingEstado.CONFIRMADO,
      studentId: { not: session.user.id },
    },
  })
  if (alumnosActuales.length >= slot.capacidadMaxima) {
    return { error: "Este turno ya está completo" }
  }

  // Cancelar reservas previas del alumno en este slot
  await db.booking.updateMany({
    where: {
      slotId,
      studentId: session.user.id,
      fecha: { gte: hoy },
      estado: BookingEstado.CONFIRMADO,
    },
    data: { estado: BookingEstado.CANCELADO },
  })

  // Crear 12 reservas semanales
  const fechas: Date[] = []
  const cursor = new Date()
  cursor.setUTCHours(12, 0, 0, 0)
  cursor.setUTCDate(cursor.getUTCDate() + 1)

  while (fechas.length < 12) {
    if (cursor.getUTCDay() === slot.diaSemana) fechas.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  await db.booking.createMany({
    data: fechas.map((fecha) => ({
      slotId,
      studentId: session.user.id,
      fecha,
      estado: BookingEstado.CONFIRMADO,
    })),
  })

  // Si el alumno estaba en STANDBY o sin estado → mantener STANDBY (espera confirmación de pago)
  if (!student.alumnoEstado) {
    await db.user.update({
      where: { id: session.user.id },
      data: { alumnoEstado: AlumnoEstado.STANDBY },
    })
  }

  revalidatePath("/dashboard/mis-turnos")
  revalidatePath("/dashboard/elegir-turno")
  return {}
}
