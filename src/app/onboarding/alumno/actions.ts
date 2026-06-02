"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AlumnoEstado, NivelJugador } from "@/generated/prisma/enums"
import { redirect } from "next/navigation"

type ActionState = { error?: string } | null

export async function completarPerfilAlumno(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }

  const telefono = (formData.get("telefono") as string)?.trim() || null
  const nivelRaw = formData.get("nivelJugador") as string
  const nivelJugador: NivelJugador = (Object.values(NivelJugador).includes(nivelRaw as NivelJugador)
    ? nivelRaw
    : NivelJugador.SEPTIMA) as NivelJugador
  const esMenor = formData.get("esMenor") === "on"
  const tutorNombre = esMenor ? (formData.get("tutorNombre") as string)?.trim() || null : null
  const tutorTelefono = esMenor ? (formData.get("tutorTelefono") as string)?.trim() || null : null
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard"

  if (esMenor && !tutorNombre) return { error: "Ingresá el nombre del tutor/padre" }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      telefono,
      nivelJugador,
      esMenor,
      tutorNombre,
      tutorTelefono,
      alumnoEstado: AlumnoEstado.STANDBY,
    },
  })

  redirect(callbackUrl)
}
