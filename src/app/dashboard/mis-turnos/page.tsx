import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, TipoClase, UserRol } from "@/generated/prisma/enums"
import MisTurnosTabs, { type ReservaItem, type SolicitudItem, type SlotItem } from "./MisTurnosTabs"

const TIPO_LABEL: Record<TipoClase, string> = {
  INDIVIDUAL: "Individual",
  PARTICULAR_CERRADA: "Grupo cerrado",
  GRUPAL: "Grupal",
}

export default async function MisTurnosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const student = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, nivelJugador: true, rol: true },
  })
  if (!student || student.rol !== UserRol.STUDENT) redirect("/dashboard")

  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const fin = new Date(hoy)
  fin.setUTCDate(fin.getUTCDate() + 30)
  const sietesDias = 7 * 24 * 60 * 60 * 1000

  const [rawReservas, rawSolicitudes, rawSlots, rawConfirmadosFuturos] = await Promise.all([
    // Bookings confirmados (30 días)
    db.booking.findMany({
      where: {
        studentId: session.user.id,
        fecha: { gte: hoy, lte: fin },
        estado: BookingEstado.CONFIRMADO,
      },
      select: {
        id: true,
        fecha: true,
        slotId: true,
        slot: { select: { horaInicio: true, tenant: { select: { nombre: true } } } },
      },
      orderBy: { fecha: "asc" },
    }),
    // Solicitudes pendientes
    db.booking.findMany({
      where: {
        studentId: session.user.id,
        estado: BookingEstado.PENDIENTE,
        fecha: { gte: hoy },
      },
      select: {
        id: true,
        fecha: true,
        slotId: true,
        slot: { select: { horaInicio: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    // Slots disponibles del profesor
    student.tenantId
      ? db.scheduleSlot.findMany({
          where: {
            tenantId: student.tenantId,
            activo: true,
            ...(student.nivelJugador
              ? { OR: [{ nivelRequerido: null }, { nivelRequerido: student.nivelJugador }] }
              : { nivelRequerido: null }),
          },
          select: {
            id: true,
            diaSemana: true,
            horaInicio: true,
            tipoClase: true,
            capacidadMaxima: true,
            _count: {
              select: {
                reservas: {
                  where: {
                    fecha: { gte: hoy },
                    estado: { in: [BookingEstado.CONFIRMADO, BookingEstado.PENDIENTE] },
                  },
                },
              },
            },
          },
          orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
        })
      : Promise.resolve([]),
    // Slots con reservas confirmadas futuras (para marcar "inscripto")
    db.booking.findMany({
      where: {
        studentId: session.user.id,
        fecha: { gte: hoy },
        estado: BookingEstado.CONFIRMADO,
      },
      select: { slotId: true },
    }),
  ])

  const slotsPendientesIds = new Set(rawSolicitudes.map((s) => s.slotId))
  const slotsConfirmadosIds = new Set(rawConfirmadosFuturos.map((b) => b.slotId))

  const reservas: ReservaItem[] = rawReservas.map((r) => ({
    id: r.id,
    fechaISO: r.fecha.toISOString(),
    dia: r.fecha.getUTCDay(),
    horaInicio: r.slot.horaInicio,
    tenantNombre: r.slot.tenant.nombre,
    esCancelable: r.fecha.getTime() - hoy.getTime() <= sietesDias,
  }))

  const solicitudes: SolicitudItem[] = rawSolicitudes.map((s) => ({
    id: s.id,
    fechaISO: s.fecha.toISOString(),
    dia: s.fecha.getUTCDay(),
    horaInicio: s.slot.horaInicio,
  }))

  const slots: SlotItem[] = rawSlots.map((slot) => {
    const lugaresLibres = slot.capacidadMaxima - slot._count.reservas
    const estado: SlotItem["estado"] = slotsConfirmadosIds.has(slot.id)
      ? "inscripto"
      : slotsPendientesIds.has(slot.id)
      ? "solicitado"
      : lugaresLibres <= 0
      ? "lleno"
      : "disponible"
    return {
      id: slot.id,
      diaSemana: slot.diaSemana,
      horaInicio: slot.horaInicio,
      tipoClase: TIPO_LABEL[slot.tipoClase],
      lugaresLibres,
      estado,
    }
  })

  return (
    <div className="max-w-md">
      <MisTurnosTabs
        reservas={reservas}
        solicitudes={solicitudes}
        slots={slots}
        tieneTenant={!!student.tenantId}
      />
    </div>
  )
}
