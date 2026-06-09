import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import ServiciosClient from "./ServiciosClient"

export default async function ServiciosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // tenantId y rol vienen del JWT — solo necesitamos tenant.tipo de la DB
  const tenantId = session.user.tenantId
  const rol = session.user.rol
  if (!tenantId || rol === UserRol.STUDENT) redirect("/dashboard")

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { tipo: true },
  })

  const esProfesor =
    (rol === UserRol.TENANT_OWNER || rol === UserRol.STAFF) &&
    tenant?.tipo !== TenantTipo.CLUB

  if (!esProfesor) redirect("/dashboard")

  const [catalogo, pedidos] = await Promise.all([
    db.catalogoServicio.findMany({
      where: { tenantId },
      orderBy: { creadoEn: "asc" },
    }),
    db.pedidoServicio.findMany({
      where: { tenantId, estado: "PENDIENTE" },
      include: {
        alumno: { select: { nombre: true, apellido: true, email: true } },
        catalogoServicio: { select: { nombre: true } },
      },
      orderBy: { creadoEn: "asc" },
    }),
  ])

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Servicios</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Catálogo de servicios que ofrecés a tus alumnos (encordado, pelotitas, raquetas, etc.)
        </p>
      </div>

      <ServiciosClient catalogo={catalogo} pedidos={pedidos} />
    </div>
  )
}
