"use client"

import { useState, useTransition } from "react"
import { cancelarTurno, solicitarTurno } from "./actions"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DIAS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export type ReservaItem = {
  id: string
  fechaISO: string
  dia: number
  horaInicio: string
  tenantNombre: string
  esCancelable: boolean
}

export type SolicitudItem = {
  id: string
  fechaISO: string
  dia: number
  horaInicio: string
}

export type SlotItem = {
  id: string
  diaSemana: number
  horaInicio: string
  tipoClase: string
  lugaresLibres: number
  estado: "disponible" | "solicitado" | "inscripto" | "lleno"
}

type Props = {
  reservas: ReservaItem[]
  solicitudes: SolicitudItem[]
  slots: SlotItem[]
  tieneTenant: boolean
}

export default function MisTurnosTabs({ reservas, solicitudes, slots, tieneTenant }: Props) {
  const [tab, setTab] = useState<"clases" | "pedir">("clases")
  const [, startTransition] = useTransition()

  const pendingCount = solicitudes.length

  const handleCancelar = (id: string) => {
    startTransition(() => { cancelarTurno(id) })
  }

  const handleSolicitar = (slotId: string) => {
    startTransition(() => { solicitarTurno(slotId) })
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab("clases")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "clases"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mis clases
          {reservas.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              tab === "clases" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
            }`}>
              {reservas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("pedir")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "pedir"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pedir turno
          {pendingCount > 0 && (
            <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: MIS CLASES ── */}
      {tab === "clases" && (
        <div>
          {/* Solicitudes pendientes (inline, arriba) */}
          {solicitudes.length > 0 && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              {solicitudes.map((s, i) => {
                const fecha = new Date(s.fechaISO)
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      i < solicitudes.length - 1 ? "border-b border-amber-100" : ""
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-sm text-amber-800 flex-1">
                      <span className="font-semibold">{DIAS[s.dia]}</span>{" "}
                      {fecha.getUTCDate()} {MESES[fecha.getUTCMonth()]} · {s.horaInicio}
                    </span>
                    <span className="text-xs text-amber-600">Pendiente</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Lista de clases confirmadas */}
          {reservas.length === 0 && solicitudes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">🎾</p>
              <p className="text-sm text-gray-500 mb-1">No tenés clases programadas</p>
              <a href="/dashboard/elegir-turno" className="text-sm text-green-700 hover:underline font-medium">
                Elegir horario fijo →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {reservas.map((r, i) => {
                const fecha = new Date(r.fechaISO)
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < reservas.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    {/* Fecha compacta */}
                    <div className="w-10 text-center flex-shrink-0">
                      <div className="text-base font-black text-gray-900 leading-none">
                        {fecha.getUTCDate()}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase">
                        {MESES[fecha.getUTCMonth()]}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{DIAS[r.dia]}</span> · {r.horaInicio}
                      </span>
                    </div>

                    {/* Cancelar */}
                    {r.esCancelable && (
                      <button
                        onClick={() => handleCancelar(r.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {reservas.length > 0 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              <a href="/dashboard/elegir-turno" className="hover:underline hover:text-green-700">
                + Cambiar horario fijo
              </a>
            </p>
          )}
        </div>
      )}

      {/* ── TAB 2: PEDIR TURNO ── */}
      {tab === "pedir" && (
        <div>
          {slots.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">No hay turnos disponibles por el momento</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {slots.map((slot, i) => {
                const lugaresLabel =
                  slot.estado === "inscripto"
                    ? null
                    : slot.lugaresLibres > 0
                    ? `${slot.lugaresLibres} libre${slot.lugaresLibres !== 1 ? "s" : ""}`
                    : null

                return (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < slots.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    {/* Día + hora */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-800">
                        <span className="font-semibold w-20 inline-block">
                          {DIAS_FULL[slot.diaSemana]}
                        </span>
                        <span className="text-gray-500 ml-1">{slot.horaInicio}</span>
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">{slot.tipoClase}</span>
                        {lugaresLabel && (
                          <span className="text-[11px] text-green-600">{lugaresLabel}</span>
                        )}
                      </div>
                    </div>

                    {/* Estado / Acción */}
                    {slot.estado === "inscripto" ? (
                      <span className="text-xs text-green-600 font-medium">Inscripto</span>
                    ) : slot.estado === "solicitado" ? (
                      <span className="text-xs text-amber-600 font-medium">Solicitado</span>
                    ) : slot.estado === "lleno" ? (
                      <span className="text-xs text-gray-300">Lleno</span>
                    ) : (
                      <button
                        onClick={() => handleSolicitar(slot.id)}
                        className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-800 transition-colors"
                      >
                        Solicitar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-xs text-gray-400 text-center mt-3">
            El profesor confirma o rechaza tu solicitud
          </p>
        </div>
      )}

      {/* Pagar mensualidad — siempre al fondo */}
      {tieneTenant && (
        <button className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-green-800 active:scale-[0.98] transition-all">
          Pagar mensualidad
        </button>
      )}
    </div>
  )
}
