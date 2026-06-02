import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, UserRol } from "@/generated/prisma/enums"
import AgendaLista, { type SlotInfo, type BookingInfo, type SlotAsignado, type EmpleadoOption } from "./AgendaLista"
import CopyButton from "./CopyButton"

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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, tenant: { select: { subdominio: true } } },
  })
  if (!user?.tenantId) redirect("/onboarding")

  // Auto-init 84 slots (Lun–Sáb × 08:00–21:00) la primera vez que el profesor entra
  const slotCount = await db.scheduleSlot.count({ where: { tenantId: user.tenantId } })
  if (slotCount === 0) {
    const initSlots: {
      tenantId: string
      diaSemana: number
      horaInicio: string
      duracionMin: number
      activo: boolean
    }[] = []
    for (let day = 1; day <= 6; day++) {
      for (let hour = 8; hour <= 21; hour++) {
        initSlots.push({
          tenantId: user.tenantId,
          diaSemana: day,
          horaInicio: `${String(hour).padStart(2, "0")}:00`,
          duracionMin: 60,
          activo: true,
        })
      }
    }
    await db.scheduleSlot.createMany({ data: initSlots })
  }

  // Slots propios del tenant
  const rawSlots = await db.scheduleSlot.findMany({
    where: { tenantId: user.tenantId },
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
      slot: { tenantId: user.tenantId },
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
    where: { tenantId: user.tenantId, rol: UserRol.STUDENT },
    select: { id: true, name: true, email: true },
  })

  // Lista de empleados del jefe (para el dropdown de asignación)
  const relacionesEmpleados = await db.jefeEmpleado.findMany({
    where: { jefeTenantId: user.tenantId },
    select: { empleadoTenant: { select: { id: true, nombre: true } } },
  })
  const empleados: EmpleadoOption[] = relacionesEmpleados.map((r) => ({
    tenantId: r.empleadoTenant.id,
    nombre: r.empleadoTenant.nombre,
  }))

  // Slots asignados por un jefe a este profesor (cross-tenant)
  const rawSlotsAsignados = await db.scheduleSlot.findMany({
    where: { empleadoTenantId: user.tenantId },
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
      slot: { empleadoTenantId: user.tenantId },
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

  const appUrl = process.env.NEXTAUTH_URL ?? "https://app-tenis-rho.vercel.app"
  const inviteLink = `${appUrl}/unirse/${user.tenant?.subdominio}`

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
