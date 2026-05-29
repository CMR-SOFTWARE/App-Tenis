"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

type ActionState = { error?: string; success?: string } | null

export async function crearSlot(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No estás autenticado" }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })
  if (!user?.tenantId) return { error: "No tenés una academia asociada" }

  const diaSemana = parseInt(formData.get("diaSemana") as string, 10)
  const horaInicio = (formData.get("horaInicio") as string)?.trim()
  const duracionMin = parseInt(formData.get("duracionMin") as string, 10) || 60

  if (isNaN(diaSemana) || diaSemana < 0 || diaSemana > 6) {
    return { error: "Día inválido" }
  }
  if (!horaInicio || !/^\d{2}:\d{2}$/.test(horaInicio)) {
    return { error: "Hora inválida" }
  }

  // Verificar que no exista ya ese día+hora para este tenant
  const existente = await db.scheduleSlot.findFirst({
    where: { tenantId: user.tenantId, diaSemana, horaInicio, activo: true },
  })
  if (existente) return { error: "Ya tenés un turno en ese día y horario" }

  await db.scheduleSlot.create({
    data: { tenantId: user.tenantId, diaSemana, horaInicio, duracionMin },
  })

  // revalidatePath le dice a Next.js que borre el caché de esta página
  // para que al recargar muestre el slot recién creado
  revalidatePath("/dashboard/turnos")
  return { success: "Turno creado" }
}

// Esta acción recibe el slotId directamente (no por FormData)
// Se usa con .bind() en el JSX: action={eliminarSlot.bind(null, slot.id)}
export async function eliminarSlot(slotId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  // Verificamos que el slot pertenece al tenant del usuario (seguridad)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== user?.tenantId) return

  // En lugar de borrar, lo marcamos como inactivo
  // Así las reservas existentes no quedan huérfanas
  await db.scheduleSlot.update({
    where: { id: slotId },
    data: { activo: false },
  })

  revalidatePath("/dashboard/turnos")
}
