"use client"

import { useState, useActionState } from "react"
import { completarPerfilAlumno } from "./actions"

const NIVELES = [
  { value: "SEPTIMA",  label: "7ma (inicial)" },
  { value: "SEXTA",    label: "6ta" },
  { value: "QUINTA",   label: "5ta" },
  { value: "CUARTA",   label: "4ta" },
  { value: "TERCERA",  label: "3ra" },
  { value: "SEGUNDA",  label: "2da" },
  { value: "PRIMERA",  label: "1ra (élite)" },
]

type Props = {
  nombreGoogle: string | null
  callbackUrl: string
}

export default function PerfilAlumnoForm({ nombreGoogle, callbackUrl }: Props) {
  const [state, formAction, isPending] = useActionState(completarPerfilAlumno, null)
  const [esMenor, setEsMenor] = useState(false)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {nombreGoogle && (
        <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
          Cuenta de Google: <span className="font-medium text-gray-700">{nombreGoogle}</span>
        </p>
      )}

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
        <input
          name="telefono"
          type="tel"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="+54 336 428 7306"
        />
      </div>

      {/* Nivel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de juego</label>
        <select
          name="nivelJugador"
          defaultValue=""
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
        >
          <option value="">No sé mi categoría (7ma por defecto)</option>
          {NIVELES.map((n) => (
            <option key={n.value} value={n.value}>{n.label}</option>
          ))}
        </select>
      </div>

      {/* Menor de edad */}
      <div className="flex items-center gap-2 py-1">
        <input
          id="esMenor"
          name="esMenor"
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-green-600"
          onChange={(e) => setEsMenor(e.target.checked)}
        />
        <label htmlFor="esMenor" className="text-sm text-gray-700">
          Es menor de edad
        </label>
      </div>

      {esMenor && (
        <div className="space-y-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-yellow-800">Datos del padre / tutor</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del tutor</label>
            <input
              name="tutorNombre"
              type="text"
              required={esMenor}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="María García"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono del tutor</label>
            <input
              name="tutorTelefono"
              type="tel"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="+54 336 428 7306"
            />
          </div>
        </div>
      )}

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold hover:bg-green-800 transition-colors disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Continuar"}
      </button>
    </form>
  )
}
