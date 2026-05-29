import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado } from "@/generated/prisma/enums"
import { cancelarTurno } from "./actions"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export default async function MisTurnosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)

  const fin = new Date(hoy)
  fin.setUTCDate(fin.getUTCDate() + 30)

  const reservas = await db.booking.findMany({
    where: {
      studentId: session.user.id,
      fecha: { gte: hoy, lte: fin },
      estado: BookingEstado.CONFIRMADO,
    },
    include: {
      slot: {
        include: { tenant: { select: { nombre: true } } },
      },
    },
    orderBy: { fecha: "asc" },
  })

  const sietesDias = 7 * 24 * 60 * 60 * 1000

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </a>
        <h1 className="text-lg font-bold text-gray-900">Mis turnos</h1>
      </nav>

      <main className="max-w-md mx-auto p-6 space-y-4">

        {/* Botón pagar mensualidad — destacado arriba */}
        <button className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-800 active:scale-[0.98] transition-all shadow-sm">
          Pagar mensualidad
        </button>

        {/* Lista de turnos */}
        {reservas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🎾</div>
            <p className="font-medium text-gray-500">No tenés turnos próximos</p>
            <p className="text-sm mt-1">Contactá a tu profesor para reservar</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Próximos 30 días
            </p>

            {reservas.map((reserva) => {
              const fecha = reserva.fecha
              // El botón cancelar solo aparece si el turno es dentro de los próximos 7 días
              const esCancelable = fecha.getTime() - hoy.getTime() <= sietesDias

              return (
                <div
                  key={reserva.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm"
                >
                  {/* Fecha — número de día y mes */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-2xl font-black text-gray-900 leading-none">
                      {fecha.getUTCDate()}
                    </div>
                    <div className="text-xs text-gray-400 uppercase mt-0.5">
                      {MESES[fecha.getUTCMonth()]}
                    </div>
                  </div>

                  <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

                  {/* Info del turno */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {DIAS[fecha.getUTCDay()]} · {reserva.slot.horaInicio}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {reserva.slot.tenant.nombre}
                    </p>
                  </div>

                  {/* Cancelar solo si es esta semana */}
                  {esCancelable && (
                    <form action={cancelarTurno.bind(null, reserva.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors whitespace-nowrap"
                      >
                        Cancelar
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
