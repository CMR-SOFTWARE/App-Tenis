"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function getJefeTenantId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })
  return user?.tenantId ?? null
}

export async function agregarEmpleado(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const jefeTenantId = await getJefeTenantId()
  if (!jefeTenantId) return { error: "No autenticado" }

  const subdominio = (formData.get("subdominio") as string | null)?.trim().toLowerCase()
  if (!subdominio) return { error: "Ingresá el subdominio del profesor" }

  const empleadoTenant = await db.tenant.findUnique({
    where: { subdominio },
    select: { id: true, nombre: true },
  })
  if (!empleadoTenant) return { error: `No existe ningún profesor con subdominio "${subdominio}"` }
  if (empleadoTenant.id === jefeTenantId) return { error: "No podés agregarte a vos mismo como empleado" }

  const existente = await db.jefeEmpleado.findUnique({
    where: { jefeTenantId_empleadoTenantId: { jefeTenantId, empleadoTenantId: empleadoTenant.id } },
  })
  if (existente) return { error: `${empleadoTenant.nombre} ya está en tu equipo` }

  await db.jefeEmpleado.create({
    data: { jefeTenantId, empleadoTenantId: empleadoTenant.id },
  })

  revalidatePath("/dashboard/empleados")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function eliminarEmpleado(empleadoTenantId: string): Promise<void> {
  const jefeTenantId = await getJefeTenantId()
  if (!jefeTenantId) return

  // Quitar el empleado de todos los slots del jefe donde estaba asignado
  await db.scheduleSlot.updateMany({
    where: { tenantId: jefeTenantId, empleadoTenantId },
    data: { empleadoTenantId: null },
  })

  await db.jefeEmpleado.delete({
    where: { jefeTenantId_empleadoTenantId: { jefeTenantId, empleadoTenantId } },
  })

  revalidatePath("/dashboard/empleados")
  revalidatePath("/dashboard/turnos")
  revalidatePath("/dashboard")
}
