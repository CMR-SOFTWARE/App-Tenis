import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, UserRol } from "@/generated/prisma/enums"
import AgendaLista, { type SlotInfo, type BookingInfo, type SlotAsignado, type EmpleadoOption } from "./AgendaLista"
import CopyButton from "./CopyButton"
import TurnosInitWrapper from "./TurnosInitWrapper"

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { mes } = await searchParams
  const mesStr = mes ?? new Date().toISOString().slice(0, 7) // YYYY-MM
  const [year, month] = mesStr.split("-").map(Number)
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  // tenantId viene del JWT
  const tenantId = session.user.tenantId
  if (!tenantId) redirect("/onboarding")

  // Si el profesor no tiene slots, delegar la inicialización al cliente
  // para no bloquear el render con 260+ inserts sincrónicos
  const slotCount = await db.scheduleSlot.count({ where: { tenantId } })
  if (slotCount === 0) {
    return <TurnosInitWrapper />
  }

  // Slots propios del tenant
  const rawSlots = await db.scheduleSlot.findMany({
    where: { tenantId: tenantId },
    include: { empleadoTenant: { select: { nombre: true } } },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  })

  const slots: SlotInfo[] = rawSlots.map((slot) => ({
    slotId: slot.id,
    diaSemana: slot.diaSemana,
    horaInicio: slot.horaInicio,
    duracionMin: slot.duracionMin,
    tipoClase: slot.tipoClase,
    capacidadMaxima: slot.capacidadMaxima,
    nivelRequerido: slot.nivelRequerido,
    precioGrupal: slot.precioGrupal,
    activo: slot.activo,
    empleadoTenantId: slot.empleadoTenantId,
    empleadoNombre: slot.empleadoTenant?.nombre ?? null,
  }))

  // Bookings del mes para slots propios
  const rawBookings = await db.booking.findMany({
    where: {
      slot: { tenantId: tenantId },
      fecha: { gte: startOfMonth, lte: endOfMonth },
      estado: BookingEstado.CONFIRMADO,
    },
    select: {
      id: true,
      slotId: true,
      fecha: true,
      studentId: true,
      student: { select: { name: true, email: true } },
    },
  })

  const bookings: BookingInfo[] = rawBookings.map((b) => ({
    bookingId: b.id,
    slotId: b.slotId,
    fecha: b.fecha.toISOString().slice(0, 10),
    studentId: b.studentId,
    studentName: b.student.name,
    studentEmail: b.student.email,
  }))

  const students = await db.user.findMany({
    where: { tenantId: tenantId, rol: UserRol.STUDENT },
    select: { id: true, name: true, email: true, nivelJugador: true },
  })

  // Lista de empleados del jefe (para el dropdown de asignación)
  const relacionesEmpleados = await db.jefeEmpleado.findMany({
    where: { jefeTenantId: tenantId },
    select: { empleadoTenant: { select: { id: true, nombre: true } } },
  })
  const empleados: EmpleadoOption[] = relacionesEmpleados.map((r) => ({
    tenantId: r.empleadoTenant.id,
    nombre: r.empleadoTenant.nombre,
  }))

  // Slots asignados por un jefe a este profesor (cross-tenant)
  const rawSlotsAsignados = await db.scheduleSlot.findMany({
    where: { empleadoTenantId: tenantId },
    include: { tenant: { select: { nombre: true, subdominio: true } } },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  })

  const slotsAsignados: SlotAsignado[] = rawSlotsAsignados.map((slot) => ({
    slotId: slot.id,
    diaSemana: slot.diaSemana,
    horaInicio: slot.horaInicio,
    duracionMin: slot.duracionMin,
    tipoClase: slot.tipoClase,
    capacidadMaxima: slot.capacidadMaxima,
    nivelRequerido: slot.nivelRequerido,
    precioGrupal: slot.precioGrupal,
    activo: slot.activo,
    empleadoTenantId: slot.empleadoTenantId,
    empleadoNombre: null,
    jefeNombre: slot.tenant.nombre,
    jefeSubdominio: slot.tenant.subdominio,
  }))

  // Bookings del mes para slots asignados (del jefe)
  const rawBookingsAsignados = await db.booking.findMany({
    where: {
      slot: { empleadoTenantId: tenantId },
      fecha: { gte: startOfMonth, lte: endOfMonth },
      estado: BookingEstado.CONFIRMADO,
    },
    select: {
      id: true,
      slotId: true,
      fecha: true,
      studentId: true,
      student: { select: { name: true, email: true } },
    },
  })

  const bookingsAsignados: BookingInfo[] = rawBookingsAsignados.map((b) => ({
    bookingId: b.id,
    slotId: b.slotId,
    fecha: b.fecha.toISOString().slice(0, 10),
    studentId: b.studentId,
    studentName: b.student.name,
    studentEmail: b.student.email,
  }))

  // Fetch tenant subdominio para el invite link (ligero, solo 1 campo)
  const tenantData = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { subdominio: true },
  })

  const appUrl = process.env.NEXTAUTH_URL ?? "https://app-tenis-rho.vercel.app"
  const inviteLink = `${appUrl}/unirse/${tenantData?.subdominio}`

  return (
    <div className="space-y-5">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-green-800 mb-1">
            Link para que tus alumnos se unan
          </p>
          <p className="text-xs text-green-600 font-mono break-all">{inviteLink}</p>
        </div>
        <CopyButton text={inviteLink} />
      </div>

      <AgendaLista
        slots={slots}
        bookings={bookings}
        students={students}
        mes={mesStr}
        empleados={empleados}
        slotsAsignados={slotsAsignados}
        bookingsAsignados={bookingsAsignados}
      />
    </div>
  )
}
