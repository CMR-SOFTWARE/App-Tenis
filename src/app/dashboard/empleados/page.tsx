import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado } from "@/generated/prisma/enums"
import EquipoABM, { type EmpleadoInfo } from "./EquipoABM"

export default async function EmpleadosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })
  if (!user?.tenantId) redirect("/onboarding")

  const tenantId = user.tenantId

  const now = new Date()
  const startOfMes = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const relaciones = await db.jefeEmpleado.findMany({
    where: { jefeTenantId: tenantId },
    include: {
      empleadoTenant: { select: { id: true, nombre: true, subdominio: true } },
    },
    orderBy: { creadoEn: "asc" },
  })

  const empleados: EmpleadoInfo[] = await Promise.all(
    relaciones.map(async (r) => {
      const [slotsAsignados, clasesDelMes] = await Promise.all([
        db.scheduleSlot.count({
          where: { tenantId, empleadoTenantId: r.empleadoTenantId },
        }),
        db.booking.count({
          where: {
            slot: { tenantId, empleadoTenantId: r.empleadoTenantId },
            fecha: { gte: startOfMes, lte: endOfMes },
            estado: BookingEstado.CONFIRMADO,
          },
        }),
      ])
      return {
        tenantId: r.empleadoTenant.id,
        nombre: r.empleadoTenant.nombre,
        subdominio: r.empleadoTenant.subdominio,
        slotsAsignados,
        clasesDelMes,
      }
    })
  )

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Mi equipo</h2>
        <p className="text-sm text-gray-500">
          Profesores que trabajan bajo tu academia. Podés asignarles horarios desde tu Agenda.
        </p>
      </div>
      <EquipoABM empleados={empleados} />
    </div>
  )
}
