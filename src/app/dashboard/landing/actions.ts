"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export type ServicioItem = { icono: string; nombre: string; descripcion: string }
export type TestimonioItem = { nombre: string; texto: string; nivel: string }

export async function guardarPerfil(data: { fotoPerfil: string; certificaciones: string[] }) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }

  await db.tenant.updateMany({
    where: { usuarios: { some: { id: session.user.id } } },
    data: { fotoPerfil: data.fotoPerfil || null, certificaciones: data.certificaciones },
  })
  revalidatePath("/")
  return { ok: true }
}

export async function guardarGaleria(fotos: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }

  await db.tenant.updateMany({
    where: { usuarios: { some: { id: session.user.id } } },
    data: { galeriaFotos: fotos.filter(Boolean) },
  })
  revalidatePath("/")
  return { ok: true }
}

export async function guardarServicios(servicios: ServicioItem[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }

  await db.tenant.updateMany({
    where: { usuarios: { some: { id: session.user.id } } },
    data: { landingServicios: servicios },
  })
  revalidatePath("/")
  return { ok: true }
}

export async function guardarTestimonios(testimonios: TestimonioItem[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }

  await db.tenant.updateMany({
    where: { usuarios: { some: { id: session.user.id } } },
    data: { landingTestimonios: testimonios },
  })
  revalidatePath("/")
  return { ok: true }
}
