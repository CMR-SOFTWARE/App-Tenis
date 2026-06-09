"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRol } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

export async function solicitarServicio(catalogoServicioId: string, nota?: string) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, tenantId: true },
  })

  if (user?.rol !== UserRol.STUDENT || !user?.tenantId) return { error: "Sin permiso" }

  const servicio = await db.catalogoServicio.findUnique({
    where: { id: catalogoServicioId, tenantId: user.tenantId, activo: true },
    select: { precio: true },
  })
  if (!servicio) return { error: "Servicio no disponible" }

  await db.pedidoServicio.create({
    data: {
      tenantId: user.tenantId,
      alumnoId: session.user.id,
      catalogoServicioId,
      precioSnapshot: servicio.precio,
      nota: nota?.trim() || null,
    },
  })

  revalidatePath("/dashboard/mis-servicios")
  return { ok: true }
}

export async function cancelarPedidoAlumno(pedidoId: string) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true },
  })
  if (user?.rol !== UserRol.STUDENT) return { error: "Sin permiso" }

  await db.pedidoServicio.update({
    where: { id: pedidoId, alumnoId: session.user.id, estado: "PENDIENTE" },
    data: { estado: "CANCELADO" },
  })

  revalidatePath("/dashboard/mis-servicios")
  return { ok: true }
}
