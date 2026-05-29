import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import NuevoSlotForm from "./NuevoSlotForm"
import { eliminarSlot } from "./actions"

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

export default async function TurnosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })
  if (!user?.tenantId) redirect("/onboarding")

  // Traemos solo los slots activos, ordenados por día y hora
  const slots = await db.scheduleSlot.findMany({
    where: { tenantId: user.tenantId, activo: true },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  })

  // Agrupamos los slots por día para mostrarlos en secciones
  // Esto es como un Dictionary<int, List<Slot>> en C#
  const slotsPorDia = DIAS.map((nombre, index) => ({
    nombre,
    slots: slots.filter((s) => s.diaSemana === index),
  })).filter((dia) => dia.slots.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </a>
        <h1 className="text-lg font-bold text-gray-900">Mis turnos</h1>
      </nav>

      <main className="max-w-3xl mx-auto p-8 space-y-8">

        {/* Formulario para agregar un slot nuevo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Agregar horario</h2>
          <NuevoSlotForm />
        </div>

        {/* Lista de slots agrupados por día */}
        {slotsPorDia.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            Todavía no tenés horarios cargados. ¡Agregá el primero arriba!
          </p>
        ) : (
          <div className="space-y-4">
            {slotsPorDia.map((dia) => (
              <div key={dia.nombre} className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-700 mb-3">{dia.nombre}</h3>
                <div className="space-y-2">
                  {dia.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-medium">{slot.horaInicio}</span>
                        <span className="text-gray-400 text-sm">{slot.duracionMin} min</span>
                      </div>

                      {/* Botón de eliminar — usa .bind() para pasarle el ID al Server Action */}
                      <form action={eliminarSlot.bind(null, slot.id)}>
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
