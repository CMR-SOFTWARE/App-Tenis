"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"

type ActionState = { error?: string; success?: string } | null

export async function actualizarPerfil(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No estás autenticado" }

  // tenantId viene del JWT — no hace falta query extra a la DB
  const tenantId = session.user.tenantId
  if (!tenantId) return { error: "No tenés una academia asociada" }

  // Leer y limpiar campos del formulario
  const nombre = (formData.get("nombre") as string)?.trim()
  const bio = (formData.get("bio") as string)?.trim() || null
  const whatsapp = (formData.get("whatsapp") as string)?.trim() || null
  const ciudad = (formData.get("ciudad") as string)?.trim() || null
  const experienciaAniosStr = (formData.get("experienciaAnios") as string)?.trim()
  const experienciaAnios = experienciaAniosStr ? parseInt(experienciaAniosStr, 10) : null
  const precioMensualStr = (formData.get("precioMensual") as string)?.trim()
  const precioMensual = precioMensualStr ? parseFloat(precioMensualStr) : null

  // Validaciones
  if (!nombre || nombre.length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres" }
  }
  if (experienciaAnios !== null && (isNaN(experienciaAnios) || experienciaAnios < 0 || experienciaAnios > 80)) {
    return { error: "Los años de experiencia deben ser un número entre 0 y 80" }
  }
  if (precioMensual !== null && (isNaN(precioMensual) || precioMensual < 0)) {
    return { error: "El precio mensual debe ser un número positivo" }
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: { nombre, bio, whatsapp, ciudad, experienciaAnios, precioMensual },
  })

  revalidateTag("user-profile", {})
  revalidatePath("/dashboard/configuracion")
  revalidatePath("/dashboard")
  return { success: "¡Perfil actualizado correctamente!" }
}
