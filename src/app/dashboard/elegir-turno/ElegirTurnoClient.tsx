"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { reclamarSlot } from "./actions"
import { NivelJugador } from "@/generated/prisma/enums"

type Slot = {
  id: string
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
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {slots.map((slot) => {
        const estaCargando = isPending && seleccionado === slot.id
        const nivelBloqueado = slot.nivelRequerido && slot.nivelRequerido !== nivelAlumno

        return (
          <button
            key={slot.id}
            onClick={() => handleElegir(slot.id)}
            disabled={isPending || !!nivelBloqueado}
            className={`w-full bg-white border rounded-2xl px-5 py-4 text-left transition-all
              ${nivelBloqueado
                ? "border-gray-100 opacity-40 cursor-not-allowed"
                : "border-gray-200 hover:border-green-400 hover:shadow-sm active:scale-[0.98]"}
              disabled:opacity-50`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-bold text-gray-900 text-base">
                {estaCargando ? "Reservando..." : slot.label}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{slot.tipo}</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {slot.nivelRequerido && (
                <span className={`px-2 py-0.5 rounded-full font-medium ${NIVEL_COLOR[slot.nivelRequerido]}`}>
                  {NIVEL_LABEL[slot.nivelRequerido]}
                </span>
              )}
              <span className="text-gray-400">
                {slot.lugaresLibres} lugar{slot.lugaresLibres !== 1 ? "es" : ""} libre{slot.lugaresLibres !== 1 ? "s" : ""} / {slot.capacidadMaxima}
              </span>
            </div>

            {slot.precioMensual !== null && (
              <div className="mt-2 text-sm text-green-700 font-semibold">
                {slot.esGrupal ? (
                  <>{formatPeso(slot.precioMensual)}/mes (precio grupal fijo)</>
                ) : (
                  <>
                    {slot.precioClase !== null && <>{formatPeso(slot.precioClase)}/clase · </>}
                    {formatPeso(slot.precioMensual)}/mes
                    {slot.esCompartida && <span className="text-green-500 font-normal"> (compartida)</span>}
                  </>
                )}
              </div>
            )}

            {nivelBloqueado && (
              <p className="mt-1.5 text-xs text-red-400">
                Requiere nivel {NIVEL_LABEL[slot.nivelRequerido!]}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
