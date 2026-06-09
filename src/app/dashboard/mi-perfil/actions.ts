"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NivelJugador } from "@/generated/prisma/enums"
import { revalidatePath, revalidateTag } from "next/cache"

type ActionState = { error?: string; ok?: boolean } | null

async function subirFoto(file: File, userId: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const path = `${userId}.${ext}`
  const buffer = await file.arrayBuffer()

  const res = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: buffer,
  })

  if (!res.ok) return null
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
}

export async function actualizarPerfilAlumno(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No estás autenticado" }

  const nombre = (formData.get("nombre") as string)?.trim()
  const apellido = (formData.get("apellido") as string)?.trim()
  const telefono = (formData.get("telefono") as string)?.trim() || null
  const nivelStr = (formData.get("nivelJugador") as string)?.trim()
  const nivelJugador = nivelStr && nivelStr in NivelJugador ? (nivelStr as NivelJugador) : null
  const esMenor = formData.get("esMenor") === "on"
  const tutorNombre = esMenor ? ((formData.get("tutorNombre") as string)?.trim() || null) : null
  const tutorTelefono = esMenor ? ((formData.get("tutorTelefono") as string)?.trim() || null) : null
  const fechaNacimientoStr = (formData.get("fechaNacimiento") as string)?.trim()
  const fechaNacimiento = fechaNacimientoStr ? new Date(fechaNacimientoStr) : null

  if (!nombre || nombre.length < 2) return { error: "El nombre debe tener al menos 2 caracteres" }
  if (!apellido || apellido.length < 2) return { error: "El apellido debe tener al menos 2 caracteres" }
  if (fechaNacimiento && isNaN(fechaNacimiento.getTime())) return { error: "Fecha de nacimiento inválida" }

  // Manejo de foto
  const fotoFile = formData.get("foto")
  let fotoPerfil: string | undefined = undefined // undefined = no cambiar

  if (fotoFile instanceof File && fotoFile.size > 0) {
    if (fotoFile.size > 4 * 1024 * 1024) return { error: "La foto no puede superar los 4 MB" }
    if (!fotoFile.type.startsWith("image/")) return { error: "El archivo debe ser una imagen" }

    const url = await subirFoto(fotoFile, session.user.id)
    if (url) {
      fotoPerfil = url
    } else {
      return { error: "No se pudo subir la foto. Verificá la configuración de Supabase Storage." }
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      nombre,
      apellido,
      telefono,
      nivelJugador,
      esMenor,
      tutorNombre,
      tutorTelefono,
      fechaNacimiento,
      ...(fotoPerfil !== undefined ? { fotoPerfil } : {}),
    },
  })

  revalidateTag("user-profile")
  revalidatePath("/dashboard/mi-perfil")
  revalidatePath("/dashboard")
  return { ok: true }
}
