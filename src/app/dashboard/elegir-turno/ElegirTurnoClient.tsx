"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { reclamarSlot } from "./actions"
import { NivelJugador } from "@/generated/prisma/enums"

type Slot = {
  id: string
  diaSemana: number
  horaInicio: string
  label: string
  tipo: string
  nivelRequerido: NivelJugador | null
  lugaresLibres: number
  capacidadMaxima: number
  precioClase: number | null
  precioMensual: number | null
  esCompartida: boolean
  esGrupal: boolean
}

type Props = {
  slots: Slot[]
  nivelAlumno: NivelJugador | null
}

const DIA_LABEL: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
}

const NIVEL_COLOR: Record<NivelJugador, string> = {
  SEPTIMA:  "bg-gray-100 text-gray-500",
  SEXTA:    "bg-blue-100 text-blue-600",
  QUINTA:   "bg-sky-100 text-sky-700",
  CUARTA:   "bg-teal-100 text-teal-700",
  TERCERA:  "bg-yellow-100 text-yellow-700",
  SEGUNDA:  "bg-orange-100 text-orange-700",
  PRIMERA:  "bg-red-100 text-red-700",
}

const NIVEL_LABEL: Record<NivelJugador, string> = {
  SEPTIMA:  "7ma",
  SEXTA:    "6ta",
  QUINTA:   "5ta",
  CUARTA:   "4ta",
  TERCERA:  "3ra",
  SEGUNDA:  "2da",
  PRIMERA:  "1ra",
}

function formatPeso(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR")
}

export default function ElegirTurnoClient({ slots, nivelAlumno }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  const diasConSlots = [...new Set(slots.map((s) => s.diaSemana))].sort((a, b) => a - b)

  const [diaActivo, setDiaActivo] = useState<number>(diasConSlots[0] ?? 1)

  const slotsFiltrados = slots.filter((s) => s.diaSemana === diaActivo)

  function handleElegir(slotId: string) {
    setError(null)
    setSeleccionado(slotId)
    startTransition(async () => {
      const result = await reclamarSlot(slotId)
      if (result.error) {
        setError(result.error)
        setSeleccionado(null)
        return
      }
      router.push("/dashboard/mis-turnos")
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Pills de días */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {diasConSlots.map((dia) => {
          const count = slots.filter((s) => s.diaSemana === dia).length
          const activo = dia === diaActivo
          return (
            <button
              key={dia}
              onClick={() => { setDiaActivo(dia); setError(null) }}
              disabled={isPending}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activo
                  ? "bg-green-700 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"
              }`}
            >
              {DIA_LABEL[dia]}
              <span className={`ml-1.5 text-xs font-normal ${activo ? "text-green-200" : "text-gray-400"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Contador */}
      <p className="text-xs text-gray-400 px-1">
        {slotsFiltrados.length} horario{slotsFiltrados.length !== 1 ? "s" : ""} disponible{slotsFiltrados.length !== 1 ? "s" : ""}
      </p>

      {/* Lista de slots del día activo */}
      <div className="space-y-2">
        {slotsFiltrados.map((slot) => {
          const estaCargando = isPending && seleccionado === slot.id
          const nivelBloqueado = slot.nivelRequerido && slot.nivelRequerido !== nivelAlumno

          return (
            <div
              key={slot.id}
              className={`bg-white border rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 transition-all ${
                nivelBloqueado ? "opacity-40" : "border-gray-200"
              }`}
            >
              {/* Info del slot */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-bold text-gray-900 text-base">{slot.horaInicio}</span>
                  <span className="text-xs text-gray-400">{slot.tipo}</span>
                  {slot.nivelRequerido && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${NIVEL_COLOR[slot.nivelRequerido]}`}>
                      {NIVEL_LABEL[slot.nivelRequerido]}
                    </span>
                  )}
                </div>

                {slot.precioMensual !== null ? (
                  <p className="text-sm text-green-700 font-semibold">
                    {slot.esGrupal ? (
                      <>{formatPeso(slot.precioMensual)}/mes</>
                    ) : (
                      <>
                        {slot.precioClase !== null && (
                          <span className="text-gray-400 font-normal text-xs mr-1">
                            {formatPeso(slot.precioClase)}/clase ·{" "}
                          </span>
                        )}
                        {formatPeso(slot.precioMensual)}/mes
                        {slot.esCompartida && (
                          <span className="text-green-500 font-normal text-xs ml-1">(compartida)</span>
                        )}
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {slot.lugaresLibres} lugar{slot.lugaresLibres !== 1 ? "es" : ""} libre{slot.lugaresLibres !== 1 ? "s" : ""}
                  </p>
                )}

                {nivelBloqueado && (
                  <p className="text-xs text-red-400 mt-0.5">
                    Requiere {NIVEL_LABEL[slot.nivelRequerido!]}
                  </p>
                )}
              </div>

              {/* Botón */}
              <button
                onClick={() => handleElegir(slot.id)}
                disabled={isPending || !!nivelBloqueado}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {estaCargando ? "..." : "Solicitar"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
