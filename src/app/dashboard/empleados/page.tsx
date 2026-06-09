import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado } from "@/generated/prisma/enums"
import EquipoABM, { type EmpleadoInfo } from "./EquipoABM"

export default async function EmpleadosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // tenantId viene del JWT — no hace falta query a la DB
  const tenantId = session.user.tenantId
  if (!tenantId) redirect("/onboarding")

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

  const empleadoIds = relaciones.map((r) => r.empleadoTenantId)

  // Batch queries: 2 queries para todos los empleados en vez de 2 * N queries (fix N+1)
  const [slotCountsRaw, bookingsDelMes] = await Promise.all([
    db.scheduleSlot.groupBy({
      by: ["empleadoTenantId"],
      where: { tenantId, empleadoTenantId: { in: empleadoIds } },
      _count: { id: true },
    }),
    db.booking.findMany({
      where: {
        slot: { tenantId, empleadoTenantId: { in: empleadoIds } },
        fecha: { gte: startOfMes, lte: endOfMes },
        estado: BookingEstado.CONFIRMADO,
      },
      select: { slot: { select: { empleadoTenantId: true } } },
    }),
  ])

  // Agrupar counts en memoria — O(n), sin round-trips extra
  const slotCountMap = new Map(
    slotCountsRaw.map((r) => [r.empleadoTenantId, r._count.id])
  )
  const bookingCountMap = new Map<string, number>()
  for (const b of bookingsDelMes) {
    const eid = b.slot.empleadoTenantId
    if (eid) bookingCountMap.set(eid, (bookingCountMap.get(eid) ?? 0) + 1)
  }

  const empleados: EmpleadoInfo[] = relaciones.map((r) => ({
    tenantId: r.empleadoTenant.id,
    nombre: r.empleadoTenant.nombre,
    subdominio: r.empleadoTenant.subdominio,
    slotsAsignados: slotCountMap.get(r.empleadoTenantId) ?? 0,
    clasesDelMes: bookingCountMap.get(r.empleadoTenantId) ?? 0,
  }))

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
