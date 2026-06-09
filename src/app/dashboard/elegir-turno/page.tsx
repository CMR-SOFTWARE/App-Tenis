import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, TipoClase, UserRol } from "@/generated/prisma/enums"
import ElegirTurnoClient from "./ElegirTurnoClient"

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const TIPO_LABEL: Record<TipoClase, string> = {
  INDIVIDUAL: "Individual",
  PARTICULAR_CERRADA: "Grupo cerrado",
  GRUPAL: "Grupal",
}

export default async function ElegirTurnoPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const student = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, rol: true, nivelJugador: true },
  })
  if (!student?.tenantId || student.rol !== UserRol.STUDENT) redirect("/dashboard")

  const hoy = new Date()

  // Traer precioPorHora del tenant
  const tenant = await db.tenant.findUnique({
    where: { id: student.tenantId },
    select: { precioPorHora: true },
  })

  const slots = await db.scheduleSlot.findMany({
    where: {
      tenantId: student.tenantId,
      activo: true,
      reservas: {
        none: {
          fecha: { gte: hoy },
          estado: BookingEstado.CONFIRMADO,
          studentId: { not: session.user.id },
        },
      },
    },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  })

  // Contar alumnos actuales en cada slot (para precio compartido)
  const slotIds = slots.map((s) => s.id)
  const bookingsAgrupados = await db.booking.groupBy({
    by: ["slotId", "studentId"],
    where: {
      slotId: { in: slotIds },
      fecha: { gte: hoy },
      estado: BookingEstado.CONFIRMADO,
      studentId: { not: session.user.id },
    },
  })
  const alumnosPorSlot = slotIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = new Set(bookingsAgrupados.filter((b) => b.slotId === id).map((b) => b.studentId)).size
    return acc
  }, {})

  const precioPorHora = tenant?.precioPorHora ?? null

  const slotsConInfo = slots.map((s) => {
    const alumnosEnSlot = alumnosPorSlot[s.id] ?? 0
    const lugaresLibres = s.capacidadMaxima - alumnosEnSlot

    let precioClase: number | null = null
    let precioMensual: number | null = null
    let esCompartida = false

    if (precioPorHora !== null) {
      if (s.tipoClase === TipoClase.GRUPAL) {
        precioMensual = s.precioGrupal ?? null
      } else if (s.tipoClase === TipoClase.PARTICULAR_CERRADA) {
        const divisor = alumnosEnSlot + 1
        precioClase = precioPorHora / divisor
        precioMensual = precioClase * 4
        esCompartida = alumnosEnSlot > 0
      } else {
        // INDIVIDUAL
        precioClase = precioPorHora
        precioMensual = precioPorHora * 4
      }
    }

    return {
      id: s.id,
      diaSemana: s.diaSemana,
      horaInicio: s.horaInicio,
      label: `${DIAS[s.diaSemana]} ${s.horaInicio}`,
      tipo: TIPO_LABEL[s.tipoClase],
      nivelRequerido: s.nivelRequerido,
      lugaresLibres,
      capacidadMaxima: s.capacidadMaxima,
      precioClase,
      precioMensual,
      esCompartida,
      esGrupal: s.tipoClase === TipoClase.GRUPAL,
    }
  })

  // Deduplicar por (diaSemana, horaInicio) — fix para duplicados en DB
  const seen = new Set<string>()
  const slotsDedup = slotsConInfo.filter((s) => {
    const key = `${s.diaSemana}-${s.horaInicio}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard/mis-turnos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Mis turnos
        </a>
        <h1 className="text-lg font-bold text-gray-900">Elegí tu horario</h1>
      </nav>

      <main className="max-w-sm mx-auto p-4 pt-8">
        <p className="text-sm text-gray-500 mb-6 text-center">
          Elegí tu horario semanal fijo. Quedás reservado para las próximas 12 semanas.
        </p>

        {slotsDedup.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No hay horarios disponibles en este momento.</p>
            <p className="text-gray-400 text-xs mt-2">
              Hablá con tu profe para que habilite nuevos horarios.
            </p>
          </div>
        ) : (
          <ElegirTurnoClient slots={slotsDedup} nivelAlumno={student.nivelJugador} />
        )}
      </main>
    </div>
  )
}
