import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { BookingEstado } from "@/generated/prisma/enums"
import Link from "next/link"
import ReservarForm from "./ReservarForm"

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

// Calcula las próximas 4 fechas en las que cae ese día de la semana
// Empezamos desde mañana para no mostrar fechas de hoy mismo
function proximasFechas(diaSemana: number): { fecha: string; label: string }[] {
  const resultados = []
  const cursor = new Date()
  cursor.setUTCHours(12, 0, 0, 0)
  cursor.setUTCDate(cursor.getUTCDate() + 1)

  while (resultados.length < 4) {
    if (cursor.getUTCDay() === diaSemana) {
      resultados.push({
        fecha: cursor.toISOString().split("T")[0], // "YYYY-MM-DD"
        label: cursor.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
      })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return resultados
}

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slotId: string }>
}) {
  // En Next.js 15 los params son una Promise — hay que esperarlos
  const { slotId } = await params

  const session = await auth()

  const slot = await db.scheduleSlot.findUnique({
    where: { id: slotId },
    include: { tenant: true },
  })
  if (!slot || !slot.activo) notFound()

  const fechas = proximasFechas(slot.diaSemana)

  // Si el alumno está logueado, marcamos qué fechas ya reservó
  let fechasReservadas: string[] = []
  if (session?.user?.id) {
    const reservas = await db.booking.findMany({
      where: { slotId, studentId: session.user.id, estado: BookingEstado.CONFIRMADO },
      select: { fecha: true },
    })
    fechasReservadas = reservas.map((r) => r.fecha.toISOString().split("T")[0])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Volver
          </Link>
          <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mt-4 mb-4">
            <span className="text-white text-2xl">🎾</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{slot.tenant.nombre}</h1>
          <p className="text-gray-500 mt-1">
            {DIAS[slot.diaSemana]} · {slot.horaInicio} · {slot.duracionMin} min
          </p>
        </div>

        {/* Si no está logueado, mostramos el botón de login */}
        {!session ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-6">
              Necesitás iniciar sesión para reservar un turno
            </p>
            <Link
              href={`/login?callbackUrl=/reservar/${slotId}`}
              className="block w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition-colors text-center"
            >
              Iniciar sesión para reservar
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Elegí una fecha</h2>
            <ReservarForm
              slotId={slot.id}
              fechas={fechas}
              fechasReservadas={fechasReservadas}
            />
          </div>
        )}
      </div>
    </div>
  )
}
