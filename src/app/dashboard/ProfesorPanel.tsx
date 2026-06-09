import { db } from "@/lib/db"
import { unstable_cache } from "next/cache"
import { AlumnoEstado, BookingEstado, ModalidadClase, NivelJugador, PagoEstado, UserRol } from "@/generated/prisma/enums"
import CancelarDiaPanel from "./CancelarDiaPanel"
import { confirmarSolicitud, rechazarSolicitud } from "./turnos/actions"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const NIVEL_LABELS: Record<NivelJugador, string> = {
  SEPTIMA: "7ma", SEXTA: "6ta", QUINTA: "5ta", CUARTA: "4ta",
  TERCERA: "3ra", SEGUNDA: "2da", PRIMERA: "1ra",
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function ProfesorPanel({
  tenantId,
  mes,
  subdominio,
}: {
  tenantId: string
  mes?: string
  subdominio?: string | null
}) {
  const now = new Date()
  const mesStr =
    mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [y, m] = mesStr.split("-").map(Number)

  const prevDate = new Date(y, m - 2, 1)
  const nextDate = new Date(y, m, 1)
  const prevMesStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`
  const nextMesStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`
  const periodoLabel = new Date(y, m - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })

  // Cache de 5 minutos por tenant + mes. Se invalida con revalidateTag(`tenant-${tenantId}`)
  // desde las actions de turnos y pagos cuando hay cambios de datos.
  const getPanelData = unstable_cache(
    async () => {
      const startOfMes = new Date(y, m - 1, 1)
      const endOfMes = new Date(y, m, 0, 23, 59, 59, 999)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const sevenDays = new Date(todayStart)
      sevenDays.setDate(sevenDays.getDate() + 7)

      // Batch 1: 9 queries en paralelo (5 count → 1 groupBy, solicitudes y equipo incluidos)
      const [
        alumnosByEstadoRaw,
        alumnosNuevosDelMes,
        clasesDelMes,
        ingresosAgg,
        bookings6m,
        pagos6m,
        proximosRaw,
        solicitudesPendientes,
        relacionesEquipo,
      ] = await Promise.all([
        db.user.groupBy({
          by: ["alumnoEstado", "modalidadClase"],
          where: { tenantId, rol: UserRol.STUDENT },
          _count: { id: true },
        }),
        db.user.count({
          where: { tenantId, rol: UserRol.STUDENT, creadoEn: { gte: startOfMes, lte: endOfMes } },
        }),
        db.booking.count({
          where: { slot: { tenantId }, fecha: { gte: startOfMes, lte: endOfMes }, estado: BookingEstado.CONFIRMADO },
        }),
        db.pago.aggregate({
          _sum: { monto: true },
          where: { tenantId, estado: PagoEstado.CONFIRMADO, creadoEn: { gte: startOfMes, lte: endOfMes } },
        }),
        db.booking.findMany({
          where: { slot: { tenantId }, fecha: { gte: sixMonthsAgo }, estado: BookingEstado.CONFIRMADO },
          select: { fecha: true },
        }),
        db.pago.findMany({
          where: { tenantId, estado: PagoEstado.CONFIRMADO, creadoEn: { gte: sixMonthsAgo } },
          select: { monto: true, creadoEn: true },
        }),
        db.booking.findMany({
          where: { slot: { tenantId }, fecha: { gte: todayStart, lte: sevenDays }, estado: BookingEstado.CONFIRMADO },
          orderBy: { fecha: "asc" },
          select: {
            fecha: true,
            slot: { select: { horaInicio: true } },
            student: { select: { nombre: true, apellido: true, name: true } },
          },
          take: 10,
        }),
        db.booking.findMany({
          where: { slot: { tenantId }, estado: BookingEstado.PENDIENTE, fecha: { gte: new Date() } },
          include: {
            student: { select: { nombre: true, apellido: true, name: true, nivelJugador: true } },
            slot: { select: { diaSemana: true, horaInicio: true } },
          },
          orderBy: { creadoEn: "asc" },
        }),
        db.jefeEmpleado.findMany({
          where: { jefeTenantId: tenantId },
          include: { empleadoTenant: { select: { id: true, nombre: true, subdominio: true } } },
          orderBy: { creadoEn: "asc" },
        }),
      ])

      // Batch 2: fix N+1 del equipo — 2 queries para todos los empleados
      const empleadoIds = relacionesEquipo.map((r) => r.empleadoTenantId)
      const [slotCountsEquipoRaw, bookingsEquipoMes] = await Promise.all([
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

      return {
        alumnosByEstadoRaw,
        alumnosNuevosDelMes,
        clasesDelMes,
        ingresosAgg,
        bookings6m,
        pagos6m,
        proximosRaw,
        solicitudesPendientes,
        relacionesEquipo,
        slotCountsEquipoRaw,
        bookingsEquipoMes,
      }
    },
    [`profesor-panel-${tenantId}-${mesStr}`],
    { revalidate: 300, tags: [`tenant-${tenantId}`] }
  )

  const {
    alumnosByEstadoRaw,
    alumnosNuevosDelMes,
    clasesDelMes,
    ingresosAgg,
    bookings6m,
    pagos6m,
    proximosRaw,
    solicitudesPendientes,
    relacionesEquipo,
    slotCountsEquipoRaw,
    bookingsEquipoMes,
  } = await getPanelData()

  // Derivar counts desde groupBy (O(n) en memoria, sin queries extra)
  const alumnosActivos = alumnosByEstadoRaw
    .filter((g) => g.alumnoEstado === AlumnoEstado.ACTIVO)
    .reduce((s, g) => s + g._count.id, 0)
  const alumnosSuspendidos = alumnosByEstadoRaw
    .filter((g) => g.alumnoEstado === AlumnoEstado.SUSPENDIDO)
    .reduce((s, g) => s + g._count.id, 0)
  const alumnosPendientes = alumnosByEstadoRaw
    .filter((g) => g.alumnoEstado === AlumnoEstado.STANDBY)
    .reduce((s, g) => s + g._count.id, 0)
  const alumnosMensual = alumnosByEstadoRaw
    .filter((g) => g.alumnoEstado === AlumnoEstado.ACTIVO && g.modalidadClase === ModalidadClase.MENSUAL)
    .reduce((s, g) => s + g._count.id, 0)
  const alumnosParticular = alumnosByEstadoRaw
    .filter((g) => g.alumnoEstado === AlumnoEstado.ACTIVO && g.modalidadClase === ModalidadClase.PARTICULAR)
    .reduce((s, g) => s + g._count.id, 0)

  const ingresosDelMes = ingresosAgg._sum.monto ?? 0

  // Construir equipo desde batch queries
  const slotCountEquipoMap = new Map(
    slotCountsEquipoRaw.map((r) => [r.empleadoTenantId, r._count.id])
  )
  const bookingCountEquipoMap = new Map<string, number>()
  for (const b of bookingsEquipoMes) {
    const eid = b.slot.empleadoTenantId
    if (eid) bookingCountEquipoMap.set(eid, (bookingCountEquipoMap.get(eid) ?? 0) + 1)
  }
  const equipo = relacionesEquipo.map((r) => ({
    tenantId: r.empleadoTenant.id,
    nombre: r.empleadoTenant.nombre,
    subdominio: r.empleadoTenant.subdominio,
    slotsAsignados: slotCountEquipoMap.get(r.empleadoTenantId) ?? 0,
    clasesDelMes: bookingCountEquipoMap.get(r.empleadoTenantId) ?? 0,
  }))

  // Historial 6 meses (derivado de bookings6m y pagos6m ya cacheados)
  const historial = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const clases = bookings6m.filter((b) => new Date(b.fecha) >= d && new Date(b.fecha) <= end).length
    const ingresos = pagos6m
      .filter((p) => new Date(p.creadoEn) >= d && new Date(p.creadoEn) <= end)
      .reduce((s, p) => s + p.monto, 0)
    return {
      mes: key,
      label: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
      clases,
      ingresos,
    }
  })

  const maxClases = Math.max(...historial.map((h) => h.clases), 1)
  const totalAlumnos = alumnosActivos + alumnosSuspendidos + alumnosPendientes

  return (
    <div className="space-y-5">
      {/* Selector de período */}
      <div className="flex items-center gap-3">
        <a
          href={`?mes=${prevMesStr}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 text-base leading-none"
        >
          ‹
        </a>
        <h2 className="text-base font-semibold text-gray-900 capitalize min-w-[140px] text-center">
          {periodoLabel}
        </h2>
        <a
          href={`?mes=${nextMesStr}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 text-base leading-none"
        >
          ›
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-3xl font-black text-gray-900 leading-none">{alumnosActivos}</p>
          <p className="text-xs text-gray-500 mt-2">Alumnos activos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-3xl font-black text-green-700 leading-none">{clasesDelMes}</p>
          <p className="text-xs text-gray-500 mt-2">Clases en el mes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xl font-black text-blue-700 leading-none">{formatARS(ingresosDelMes)}</p>
          <p className="text-xs text-gray-500 mt-2">Ingresos del mes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-3xl font-black text-gray-900 leading-none">{alumnosNuevosDelMes}</p>
          <p className="text-xs text-gray-500 mt-2">Alumnos nuevos</p>
        </div>
      </div>

      {/* Distribución + Próximas clases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estado de alumnos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de alumnos</h3>
          <div className="space-y-3">
            {[
              { label: "Activos", count: alumnosActivos, bar: "bg-green-500" },
              { label: "Suspendidos", count: alumnosSuspendidos, bar: "bg-red-400" },
              { label: "Pendientes", count: alumnosPendientes, bar: "bg-amber-400" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">{row.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${row.bar}`}
                    style={{
                      width: totalAlumnos > 0 ? `${(row.count / totalAlumnos) * 100}%` : "0%",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-6 text-right">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-400">Modalidad mensual</p>
              <p className="font-semibold text-gray-800 text-sm">{alumnosMensual}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Clases particulares</p>
              <p className="font-semibold text-gray-800 text-sm">{alumnosParticular}</p>
            </div>
          </div>
        </div>

        {/* Próximas clases */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Próximas clases{" "}
            <span className="font-normal text-gray-400">(7 días)</span>
          </h3>
          {proximosRaw.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Sin clases programadas
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {proximosRaw.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-14">
                      {DIAS[new Date(t.fecha).getUTCDay()]}{" "}
                      {new Date(t.fecha).getUTCDate()}/{new Date(t.fecha).getUTCMonth() + 1}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      {t.slot.horaInicio}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 truncate max-w-[140px]">
                    {t.student.apellido
                      ? `${t.student.apellido}, ${t.student.nombre ?? t.student.name ?? ""}`
                      : (t.student.nombre ?? t.student.name ?? "Alumno")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial 6 meses */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-5">
          Historial de los últimos 6 meses
        </h3>
        <div className="space-y-4">
          {historial.map((h) => (
            <div key={h.mes}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-medium capitalize ${
                    h.mes === mesStr ? "text-green-700 font-bold" : "text-gray-500"
                  }`}
                >
                  {h.label}
                </span>
                <div className="flex items-center gap-5 text-xs text-gray-500">
                  <span>{h.clases} clases</span>
                  <span className="w-24 text-right">
                    {h.ingresos > 0 ? formatARS(h.ingresos) : "—"}
                  </span>
                </div>
              </div>
              <div className="bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${(h.clases / maxClases) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-50">
          Barras = clases confirmadas · Ingresos se registran al confirmar pagos
        </p>
      </div>

      {/* Solicitudes pendientes de alumnos */}
      {solicitudesPendientes.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-700">
              Solicitudes de turno{" "}
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                {solicitudesPendientes.length}
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {solicitudesPendientes.map((s) => {
              const nombreAlumno = s.student.apellido
                ? `${s.student.apellido}, ${s.student.nombre ?? s.student.name ?? ""}`
                : (s.student.nombre ?? s.student.name ?? "Alumno")
              return (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{nombreAlumno}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {DIAS[s.slot.diaSemana]} · {s.slot.horaInicio}
                      </p>
                      <span className="text-xs text-gray-300">·</span>
                      <p className="text-xs text-gray-400">
                        {new Date(s.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                      {s.student.nivelJugador && (
                        <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                          {NIVEL_LABELS[s.student.nivelJugador]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={confirmarSolicitud.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-800 transition-colors"
                      >
                        Confirmar
                      </button>
                    </form>
                    <form action={rechazarSolicitud.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                      >
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mi equipo */}
      {equipo.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Mi equipo{" "}
              <span className="text-gray-400 font-normal">({equipo.length})</span>
            </h3>
            <a href="/dashboard/empleados" className="text-xs text-green-700 hover:underline">
              Gestionar →
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {equipo.map((e) => (
              <div key={e.tenantId} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{e.nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{e.subdominio}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                  <span>
                    <strong className="text-gray-700">{e.slotsAsignados}</strong> slots
                  </span>
                  <span>
                    <strong className="text-gray-700">{e.clasesDelMes}</strong> clases
                  </span>
                  <a href="/dashboard/turnos" className="text-blue-600 hover:underline text-xs">
                    Ver agenda →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {equipo.length === 0 && (
        <div className="flex justify-end">
          <a href="/dashboard/empleados" className="text-xs text-gray-400 hover:text-green-700 hover:underline">
            + Agregar profesores a mi equipo
          </a>
        </div>
      )}

      {/* Cancelar día */}
      <CancelarDiaPanel />

      {/* Perfil público */}
      {subdominio && (
        <div className="flex justify-end">
          <a
            href={`/?subdominio=${subdominio}`}
            className="text-sm text-green-700 hover:underline"
          >
            Ver mi perfil público →
          </a>
        </div>
      )}
    </div>
  )
}
