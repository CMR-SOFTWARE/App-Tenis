"use client"

import { useState } from "react"

const DIA_LABEL: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
}

const TIPO_LABEL: Record<string, string> = {
  INDIVIDUAL: "Individual",
  PARTICULAR_CERRADA: "Grupo cerrado",
  GRUPAL: "Grupal",
}

export type SlotLanding = {
  id: string
  diaSemana: number
  horaInicio: string
  tipoClase: string
  duracionMin: number
}

type Props = {
  slots: SlotLanding[]
  subdominio: string
}

export default function HorariosLanding({ slots, subdominio }: Props) {
  const diasConSlots = [...new Set(slots.map((s) => s.diaSemana))].sort((a, b) => a - b)
  const [diaActivo, setDiaActivo] = useState<number>(diasConSlots[0] ?? 1)

  const slotsFiltrados = slots.filter((s) => s.diaSemana === diaActivo)

  return (
    <div>
      {/* Pills de días */}
      <div className="flex gap-2 overflow-x-auto pb-3 justify-center flex-wrap">
        {diasConSlots.map((dia) => {
          const count = slots.filter((s) => s.diaSemana === dia).length
          const activo = dia === diaActivo
          return (
            <button
              key={dia}
              onClick={() => setDiaActivo(dia)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
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

      {/* Lista del día activo */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6 max-w-lg mx-auto">
        {slotsFiltrados.map((slot, i, arr) => (
          <div
            key={slot.id}
            className={`flex items-center gap-4 px-6 py-4 ${
              i < arr.length - 1 ? "border-b border-gray-50" : ""
            }`}
          >
            <span className="font-mono font-bold text-gray-900 text-base w-14 flex-shrink-0">
              {slot.horaInicio}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-500">
                {TIPO_LABEL[slot.tipoClase] ?? slot.tipoClase}
              </span>
              <span className="text-xs text-gray-300 ml-2">{slot.duracionMin} min</span>
            </div>
            <a
              href={`/unirse/${subdominio}`}
              className="flex-shrink-0 text-sm bg-green-700 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-800 transition-colors"
            >
              Reservar →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
