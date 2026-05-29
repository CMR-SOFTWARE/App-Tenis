"use client"

import { useActionState } from "react"
import { reservarTurno } from "./actions"

type Props = {
  slotId: string
  fechas: { fecha: string; label: string }[]
  fechasReservadas: string[]
}

export default function ReservarForm({ slotId, fechas, fechasReservadas }: Props) {
  const [state, formAction, isPending] = useActionState(reservarTurno, null)

  return (
    <form action={formAction} className="space-y-4">
      {/* Campo oculto con el ID del slot — el Server Action lo necesita */}
      <input type="hidden" name="slotId" value={slotId} />

      {/* Opciones de fecha como radio buttons estilizados */}
      <div className="space-y-2">
        {fechas.map(({ fecha, label }) => {
          const yaReservada = fechasReservadas.includes(fecha)
          return (
            <label
              key={fecha}
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                yaReservada
                  ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                  : "border-gray-200 hover:border-green-600 hover:bg-green-50"
              }`}
            >
              <input
                type="radio"
                name="fecha"
                value={fecha}
                disabled={yaReservada}
                required
                className="accent-green-600"
              />
              <span className="text-gray-900 text-sm capitalize">
                {label}
                {yaReservada && (
                  <span className="ml-2 text-xs text-gray-400">(ya reservado)</span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          {state.success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Reservando..." : "Confirmar reserva →"}
      </button>
    </form>
  )
}
