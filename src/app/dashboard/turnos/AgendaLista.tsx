"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NivelJugador, TipoClase } from "@/generated/prisma/enums"
import {
  asignarAlumno,
  cancelarAsignacionEstudiante,
  setSlotCapacidad,
  toggleSlotActivo,
  setSlotNivel,
  asignarEmpleadoASlot,
  cancelarSlotDelDia,
} from "./actions"

export type SlotInfo = {
  slotId: string
  diaSemana: number
  horaInicio: string
  duracionMin: number
  tipoClase: TipoClase
  capacidadMaxima: number
  nivelRequerido: NivelJugador | null
  precioGrupal: number | null
  activo: boolean
  empleadoTenantId?: string | null
  empleadoNombre?: string | null
}

export type SlotAsignado = SlotInfo & {
  jefeNombre: string
  jefeSubdominio: string
}

export type BookingInfo = {
  bookingId: string
  slotId: string
  fecha: string // YYYY-MM-DD
  studentId: string
  studentName: string | null
  studentEmail: string
}

export type EmpleadoOption = { tenantId: string; nombre: string }

type Student = { id: string; name: string | null; email: string }

type Props = {
  slots: SlotInfo[]
  bookings: BookingInfo[]
  students: Student[]
  mes: string // YYYY-MM
  empleados?: EmpleadoOption[]
  slotsAsignados?: SlotAsignado[]
  bookingsAsignados?: BookingInfo[]
}

const MES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const NIVEL_LABELS: Record<string, string> = {
  SEPTIMA: "7ma", SEXTA: "6ta", QUINTA: "5ta",
  CUARTA: "4ta", TERCERA: "3ra", SEGUNDA: "2da", PRIMERA: "1ra",
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const allDays: Date[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    if (d.getDay() !== 0) allDays.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  if (allDays.length === 0) return []
  const firstCol = allDays[0].getDay() - 1
  const cells: (Date | null)[] = Array.from({ length: firstCol }, () => null)
  cells.push(...allDays)
  return cells
}

export default function AgendaCalendario({
  slots,
  bookings,
  students,
  mes,
  empleados = [],
  slotsAsignados = [],
  bookingsAsignados = [],
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  type LocalState = {
    activo: boolean
    nivelRequerido: NivelJugador | null
    capacidadMaxima: number
    empleadoTenantId: string | null
  }

  const [localSlots, setLocalSlots] = useState<Record<string, LocalState>>(() => {
    const m: Record<string, LocalState> = {}
    for (const s of slots) m[s.slotId] = {
      activo: s.activo,
      nivelRequerido: s.nivelRequerido,
      capacidadMaxima: s.capacidadMaxima,
      empleadoTenantId: s.empleadoTenantId ?? null,
    }
    return m
  })

  useEffect(() => {
    setLocalSlots((prev) => {
      const m = { ...prev }
      for (const s of slots) m[s.slotId] = {
        activo: s.activo,
        nivelRequerido: s.nivelRequerido,
        capacidadMaxima: s.capacidadMaxima,
        empleadoTenantId: s.empleadoTenantId ?? null,
      }
      return m
    })
  }, [slots])

  useEffect(() => { setSelectedDate(null) }, [mes])

  const [year, month] = mes.split("-").map(Number)
  const calendarCells = buildCalendarCells(year, month)
  const today = formatDate(new Date())

  // Bookings propios
  const bookingMap = new Map<string, BookingInfo[]>()
  for (const b of bookings) {
    const key = `${b.fecha}|${b.slotId}`
    bookingMap.set(key, [...(bookingMap.get(key) ?? []), b])
  }

  // Bookings de slots asignados por jefe
  const bookingMapAsignados = new Map<string, BookingInfo[]>()
  for (const b of bookingsAsignados) {
    const key = `${b.fecha}|${b.slotId}`
    bookingMapAsignados.set(key, [...(bookingMapAsignados.get(key) ?? []), b])
  }

  function navigateMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const newMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    router.push(`?mes=${newMes}`)
  }

  function handleToggle(slotId: string, current: boolean) {
    setLocalSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], activo: !current } }))
    startTransition(async () => {
      await toggleSlotActivo(slotId)
      router.refresh()
    })
  }

  function handleNivel(slotId: string, nivel: string) {
    const val = nivel ? (nivel as NivelJugador) : null
    setLocalSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], nivelRequerido: val } }))
    startTransition(async () => {
      await setSlotNivel(slotId, nivel)
    })
  }

  function handleAssign(slot: SlotInfo, studentId: string) {
    setAssignError(null)
    startTransition(async () => {
      const result = await asignarAlumno(slot.diaSemana, slot.horaInicio, studentId)
      if (result?.error) { setAssignError(result.error); return }
      router.refresh()
    })
  }

  function handleCancelStudent(slotId: string, studentId: string) {
    startTransition(async () => {
      await cancelarAsignacionEstudiante(slotId, studentId)
      router.refresh()
    })
  }

  function handleSetCapacidad(slotId: string, capacidad: number) {
    setLocalSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], capacidadMaxima: capacidad } }))
    startTransition(async () => {
      await setSlotCapacidad(slotId, capacidad)
      router.refresh()
    })
  }

  function handleAssignEmpleado(slotId: string, value: string) {
    const newId = value || null
    setLocalSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], empleadoTenantId: newId } }))
    startTransition(async () => {
      await asignarEmpleadoASlot(slotId, newId)
      router.refresh()
    })
  }

  function handleCancelarSlotDelDia(slotId: string) {
    if (!selectedDate) return
    if (!confirm("¿Cancelar todas las reservas de este turno para este día?")) return
    startTransition(async () => {
      await cancelarSlotDelDia(slotId, selectedDate)
      router.refresh()
    })
  }

  // Slots del día seleccionado (propios)
  const panelSlots = selectedDate
    ? (() => {
        const dow = new Date(selectedDate + "T12:00:00").getDay()
        return slots
          .filter((s) => s.diaSemana === dow)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
          .map((s) => ({
            slot: s,
            local: localSlots[s.slotId] ?? {
              activo: s.activo,
              nivelRequerido: s.nivelRequerido,
              capacidadMaxima: s.capacidadMaxima,
              empleadoTenantId: s.empleadoTenantId ?? null,
            },
            bookings: bookingMap.get(`${selectedDate}|${s.slotId}`) ?? [],
          }))
      })()
    : []

  // Slots asignados por jefe para el día seleccionado
  const panelSlotsAsignados = selectedDate
    ? (() => {
        const dow = new Date(selectedDate + "T12:00:00").getDay()
        return slotsAsignados
          .filter((s) => s.diaSemana === dow)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
          .map((s) => ({
            slot: s,
            bookings: bookingMapAsignados.get(`${selectedDate}|${s.slotId}`) ?? [],
          }))
      })()
    : []

  return (
    <>
      {/* ── Calendar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 text-xl transition-colors"
          >
            ‹
          </button>
          <h2 className="font-bold text-gray-900">
            {MES_NOMBRES[month - 1]} {year}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 text-xl transition-colors"
          >
            ›
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-6 gap-1 mb-1">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-6 gap-1">
          {calendarCells.map((date, i) => {
            if (!date) return <div key={i} />

            const dateStr = formatDate(date)
            const dow = date.getDay()

            // Slots propios con reservas
            const activeOwn = slots.filter(
              (s) => s.diaSemana === dow && (localSlots[s.slotId]?.activo ?? s.activo)
            )
            const assignedOwn = activeOwn.filter(
              (s) => (bookingMap.get(`${dateStr}|${s.slotId}`) ?? []).length > 0
            )
            const freeCount = activeOwn.length - assignedOwn.length

            // Slots asignados por jefe con reservas
            const assignedFromJefe = slotsAsignados.filter(
              (s) => s.diaSemana === dow && (bookingMapAsignados.get(`${dateStr}|${s.slotId}`) ?? []).length > 0
            )

            const isToday = dateStr === today
            const isPast = dateStr < today
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`min-h-[56px] sm:min-h-[80px] rounded-lg border text-left p-1 sm:p-1.5 transition-all ${
                  isSelected
                    ? "border-green-500 bg-green-50 shadow-sm"
                    : isToday
                    ? "border-green-300 bg-green-50/40"
                    : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                } ${isPast ? "opacity-50" : ""}`}
              >
                <div className={`text-xs font-bold ${isToday ? "text-green-700" : "text-gray-600"}`}>
                  {date.getDate()}
                </div>

                {/* Mobile: puntos (verde = propio, azul = asignado por jefe) */}
                <div className="flex flex-wrap gap-0.5 mt-1 sm:hidden">
                  {assignedOwn.slice(0, 3).map((s) => (
                    <div key={s.slotId} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  ))}
                  {assignedFromJefe.slice(0, 2).map((s) => (
                    <div key={s.slotId} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  ))}
                </div>

                {/* Desktop: chips de texto */}
                {assignedOwn.slice(0, 2).map((s) => {
                  const bs = bookingMap.get(`${dateStr}|${s.slotId}`) ?? []
                  const firstName = bs[0]?.studentName?.split(" ")[0] ?? "·"
                  const extra = bs.length > 1 ? ` +${bs.length - 1}` : ""
                  return (
                    <div key={s.slotId} className="hidden sm:block text-xs bg-green-100 text-green-800 rounded px-1 mb-0.5 truncate leading-5">
                      {s.horaInicio} {firstName}{extra}
                    </div>
                  )
                })}
                {assignedFromJefe.slice(0, 1).map((s) => {
                  const bs = bookingMapAsignados.get(`${dateStr}|${s.slotId}`) ?? []
                  return (
                    <div key={s.slotId} className="hidden sm:block text-xs bg-blue-100 text-blue-700 rounded px-1 mb-0.5 truncate leading-5">
                      {s.horaInicio} {s.jefeNombre.split(" ")[0]}
                    </div>
                  )
                })}
                {assignedOwn.length > 2 && (
                  <div className="hidden sm:block text-xs text-green-600 font-semibold leading-5">
                    +{assignedOwn.length - 2}
                  </div>
                )}
                {freeCount > 0 && !isPast && (
                  <div className="hidden sm:block text-xs text-gray-300 leading-5">{freeCount} libres</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Day detail panel — bottom sheet en mobile, flotante en desktop ── */}
      {selectedDate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedDate(null)}
          />

          {/* Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80 sm:rounded-2xl sm:max-h-[90vh]">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <p className="font-bold text-gray-900 text-sm capitalize">
                {new Intl.DateTimeFormat("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date(selectedDate + "T12:00:00"))}
              </p>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm"
              >
                ×
              </button>
            </div>

            {assignError && (
              <div className="mx-3 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg shrink-0">
                {assignError}
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {/* Slots propios */}
              {panelSlots.length === 0 && panelSlotsAsignados.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Sin horarios.</p>
              ) : (
                <div>
                  {/* ── Slots propios ── */}
                  {panelSlots.map(({ slot, local, bookings: slotBookings }) => (
                    <div
                      key={slot.slotId}
                      className={`px-4 py-3 border-b border-gray-50 last:border-0 ${
                        !local.activo ? "opacity-40" : ""
                      }`}
                    >
                      {/* Hora + toggle + nivel */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono font-semibold text-gray-800 w-12 shrink-0">
                          {slot.horaInicio}
                        </span>

                        <button
                          onClick={() => handleToggle(slot.slotId, local.activo)}
                          title={local.activo ? "Deshabilitar" : "Habilitar"}
                          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                            local.activo ? "bg-green-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                              local.activo ? "translate-x-3.5" : "translate-x-0.5"
                            }`}
                          />
                        </button>

                        <select
                          value={local.nivelRequerido ?? ""}
                          onChange={(e) => handleNivel(slot.slotId, e.target.value)}
                          disabled={!local.activo}
                          className="ml-auto text-xs border border-gray-200 rounded-lg px-1.5 py-1 text-gray-600 bg-white disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          <option value="">Todas</option>
                          {Object.entries(NIVEL_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Alumnos + asignación */}
                      {local.activo && (
                        <div className="space-y-1.5">
                          {slotBookings.map((b) => (
                            <div key={b.bookingId} className="flex items-center justify-between">
                              <span className="text-sm text-green-700 font-medium truncate">
                                {b.studentName ?? b.studentEmail}
                              </span>
                              <button
                                onClick={() => handleCancelStudent(slot.slotId, b.studentId)}
                                disabled={isPending}
                                className="text-xs text-red-400 hover:text-red-600 shrink-0 ml-2 disabled:opacity-40"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}

                          {local.capacidadMaxima > 1 && (
                            <p className="text-xs text-gray-400">
                              {slotBookings.length} de {local.capacidadMaxima} lugares ocupados
                            </p>
                          )}

                          {slotBookings.length < local.capacidadMaxima && (
                            <select
                              defaultValue=""
                              key={`assign-${slot.slotId}-${selectedDate}-${slotBookings.length}`}
                              disabled={isPending || students.length === 0}
                              onChange={(e) => { if (e.target.value) handleAssign(slot, e.target.value) }}
                              className="w-full text-xs border border-dashed border-gray-300 rounded-lg px-2 py-1.5 text-gray-500 bg-white hover:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-40"
                            >
                              <option value="">+ Asignar alumno</option>
                              {students
                                .filter((s) => !slotBookings.some((b) => b.studentId === s.id))
                                .map((s) => (
                                  <option key={s.id} value={s.id}>{s.name ?? s.email}</option>
                                ))}
                            </select>
                          )}

                          {slotBookings.length >= local.capacidadMaxima &&
                            students.some((s) => !slotBookings.some((b) => b.studentId === s.id)) && (
                              <button
                                onClick={() => handleSetCapacidad(slot.slotId, local.capacidadMaxima + 1)}
                                disabled={isPending}
                                className="text-xs text-green-600 hover:text-green-800 disabled:opacity-40"
                              >
                                + Agregar otro lugar
                              </button>
                            )}

                          {/* Asignación de profesor empleado (solo visible para jefes con equipo) */}
                          {empleados.length > 0 && (
                            <div className="pt-1.5 mt-1.5 border-t border-gray-50">
                              <label className="text-xs text-gray-400 block mb-1">Profesor asignado</label>
                              <select
                                value={local.empleadoTenantId ?? ""}
                                onChange={(e) => handleAssignEmpleado(slot.slotId, e.target.value)}
                                disabled={isPending}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
                              >
                                <option value="">Sin profesor asignado</option>
                                {empleados.map((e) => (
                                  <option key={e.tenantId} value={e.tenantId}>{e.nombre}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* ── Slots asignados por jefe (sección separada) ── */}
                  {panelSlotsAsignados.length > 0 && (
                    <div>
                      {panelSlots.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                          <p className="text-xs font-semibold text-gray-500">Clases asignadas por academia</p>
                        </div>
                      )}
                      {panelSlotsAsignados.map(({ slot, bookings: slotBookings }) => (
                        <div key={slot.slotId} className="px-4 py-3 border-b border-gray-50 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-semibold text-gray-800 w-12 shrink-0">
                                {slot.horaInicio}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                {slot.jefeNombre}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCancelarSlotDelDia(slot.slotId)}
                              disabled={isPending || slotBookings.length === 0}
                              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
                            >
                              Cancelar
                            </button>
                          </div>

                          {slotBookings.length === 0 ? (
                            <p className="text-xs text-gray-400">Sin alumnos asignados</p>
                          ) : (
                            <div className="space-y-1">
                              {slotBookings.map((b) => (
                                <div key={b.bookingId} className="text-sm text-blue-700">
                                  {b.studentName ?? b.studentEmail}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isPending && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-center text-gray-400 shrink-0">
                Guardando...
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
