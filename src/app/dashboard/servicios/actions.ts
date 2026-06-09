"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRol, TenantTipo, PedidoEstado } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

async function getProfesorTenantId(): Promise<string | null> {
  const session = await auth()
  if (!session) return null
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, tenantId: true, tenant: { select: { tipo: true } } },
  })
  if (!user?.tenantId) return null
  if (user.rol === UserRol.STUDENT) return null
  if (user.tenant?.tipo === TenantTipo.CLUB) return null
  return user.tenantId
}

export async function crearServicio(data: { nombre: string; precio: number }) {
  const tenantId = await getProfesorTenantId()
  if (!tenantId) return { error: "Sin permiso" }

  await db.catalogoServicio.create({
    data: { tenantId, nombre: data.nombre.trim(), precio: data.precio },
  })

  revalidatePath("/dashboard/servicios")
  return { ok: true }
}

export async function editarServicio(id: string, data: { nombre: string; precio: number }) {
  const tenantId = await getProfesorTenantId()
  if (!tenantId) return { error: "Sin permiso" }

  await db.catalogoServicio.update({
    where: { id, tenantId },
    data: { nombre: data.nombre.trim(), precio: data.precio },
  })

  revalidatePath("/dashboard/servicios")
  revalidatePath("/dashboard/mis-servicios")
  return { ok: true }
}

export async function toggleServicio(id: string) {
  const tenantId = await getProfesorTenantId()
  if (!tenantId) return { error: "Sin permiso" }

  const servicio = await db.catalogoServicio.findUnique({ where: { id, tenantId }, select: { activo: true } })
  if (!servicio) return { error: "No encontrado" }

  await db.catalogoServicio.update({
    where: { id, tenantId },
    data: { activo: !servicio.activo },
  })

  revalidatePath("/dashboard/servicios")
  revalidatePath("/dashboard/mis-servicios")
  return { ok: true }
}

export async function confirmarPedido(pedidoId: string) {
  const tenantId = await getProfesorTenantId()
  if (!tenantId) return { error: "Sin permiso" }

  await db.pedidoServicio.update({
    where: { id: pedidoId, tenantId },
    data: { estado: PedidoEstado.CONFIRMADO },
  })

  revalidatePath("/dashboard/servicios")
  return { ok: true }
}

export async function cancelarPedidoProfe(pedidoId: string) {
  const tenantId = await getProfesorTenantId()
  if (!tenantId) return { error: "Sin permiso" }

  await db.pedidoServicio.update({
    where: { id: pedidoId, tenantId },
    data: { estado: PedidoEstado.CANCELADO },
  })

  revalidatePath("/dashboard/servicios")
  return { ok: true }
}
