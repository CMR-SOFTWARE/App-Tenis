import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { AlumnoEstado } from "@/generated/prisma/enums"

export default async function PagosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, tenant: { select: { precioPorHora: true } } },
  })

  const pendientes = user?.tenantId
    ? await db.user.count({
        where: { tenantId: user.tenantId, alumnoEstado: AlumnoEstado.STANDBY },
      })
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-500 mb-4">Pagos recibidos</p>
          <p className="text-3xl font-black text-gray-900">$0</p>
          <p className="text-xs text-gray-400 mt-2">Próximamente con Mercado Pago</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-500 mb-4">Pagos pendientes</p>
          <p className="text-3xl font-black text-gray-900">{pendientes}</p>
          <p className="text-xs text-gray-400 mt-2">
            {pendientes === 1 ? "alumno esperando confirmación" : "alumnos esperando confirmación"}
          </p>
          {pendientes > 0 && (
            <a
              href="/dashboard/alumnos"
              className="text-xs text-green-700 font-medium hover:underline mt-3 block"
            >
              Ver alumnos pendientes →
            </a>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-400">
          La integración con Mercado Pago estará disponible próximamente.
        </p>
      </div>
    </div>
  )
}
