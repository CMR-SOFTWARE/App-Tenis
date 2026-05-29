"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRol } from "@/generated/prisma/enums"
import { redirect } from "next/navigation"

export async function unirseAcademia(subdominio: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/unirse/${subdominio}`)
  }

  const tenant = await db.tenant.findUnique({ where: { subdominio } })
  if (!tenant) redirect(`/unirse/${subdominio}?error=not-found`)

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, tenantId: true },
  })

  if (user?.rol === UserRol.TENANT_OWNER || user?.rol === UserRol.SUPER_ADMIN) {
    redirect(`/unirse/${subdominio}?error=profesor`)
  }

  if (user?.tenantId === tenant!.id) redirect("/dashboard/mis-turnos")

  await db.user.update({
    where: { id: session.user.id },
    data: { tenantId: tenant!.id, rol: UserRol.STUDENT },
  })

  redirect("/dashboard/mis-turnos")
}
