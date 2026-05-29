"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { BookingEstado } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

type ActionState = { error?: string; success?: string } | null

export async function reservarTurno(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Necesitás iniciar sesión" }

  const slotId = formData.get("slotId") as string
  const fechaStr = formData.get("fecha") as string
  if (!slotId || !fechaStr) return { error: "Datos incompletos" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || !slot.activo) return { error: "Este turno no está disponible" }

  // Guardamos la fecha como mediodía UTC para evitar problemas de zona horaria
  // (medianoche en Argentina = 3am UTC, con mediodía no hay riesgo de desfase de día)
  const fecha = new Date(`${fechaStr}T12:00:00.000Z`)

  // Verificar que el día de la semana coincide con el slot
  if (fecha.getUTCDay() !== slot.diaSemana) {
    return { error: "Fecha inválida para este turno" }
  }

  // Verificar que el alumno no tenga ya ese turno en esa fecha
  const existente = await db.booking.findFirst({
    where: { slotId, studentId: session.user.id, fecha, estado: BookingEstado.CONFIRMADO },
  })
  if (existente) return { error: "Ya tenés una reserva para esa fecha" }

  await db.booking.create({
    data: {
      slotId,
      studentId: session.user.id,
      fecha,
      estado: BookingEstado.CONFIRMADO,
    },
  })

  revalidatePath(`/reservar/${slotId}`)
  return { success: "¡Turno reservado! Te esperamos." }
}
