import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { UserRol } from "@/generated/prisma/enums"
import MisServiciosClient from "./MisServiciosClient"

export default async function MisServiciosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, tenantId: true },
  })

  if (user?.rol !== UserRol.STUDENT || !user?.tenantId) redirect("/dashboard")

  const [catalogo, pedidos] = await Promise.all([
    db.catalogoServicio.findMany({
      where: { tenantId: user.tenantId, activo: true },
      orderBy: { creadoEn: "asc" },
      select: { id: true, nombre: true, precio: true },
    }),
    db.pedidoServicio.findMany({
      where: { alumnoId: session.user.id },
      include: { catalogoServicio: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      take: 20,
    }),
  ])

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Servicios</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Pedí servicios a tu profesor (encordado, pelotitas, raquetas, etc.)
        </p>
      </div>

      <MisServiciosClient catalogo={catalogo} pedidos={pedidos} />
    </div>
  )
}
