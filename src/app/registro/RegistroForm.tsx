"use client"

import { useState, useActionState } from "react"
import { registrarAlumno } from "./actions"

const NIVELES = [
  { value: "SEPTIMA",  label: "7ma (inicial)" },
  { value: "SEXTA",    label: "6ta" },
  { value: "QUINTA",   label: "5ta" },
  { value: "CUARTA",   label: "4ta" },
  { value: "TERCERA",  label: "3ra" },
  { value: "SEGUNDA",  label: "2da" },
  { value: "PRIMERA",  label: "1ra (élite)" },
]

export default function RegistroForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, isPending] = useActionState(registrarAlumno, null)
  const [esMenor, setEsMenor] = useState(false)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Nombre y apellido */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="Juan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
          <input
            name="apellido"
            type="text"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="García"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="juan@ejemplo.com"
        />
      </div>

      {/* Contraseña */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
        <input
          name="passwordConfirm"
          type="password"
          required
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="Repetí la contraseña"
        />
      </div>

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
          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          onChange={(e) => setEsMenor(e.target.checked)}
        />
        <label htmlFor="esMenor" className="text-sm text-gray-700">
          Es menor de edad (el padre/tutor completa el registro)
        </label>
      </div>

      {/* Datos del tutor — solo si es menor */}
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

      {/* Error / éxito */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold hover:bg-green-800 transition-colors disabled:opacity-60 mt-2"
      >
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  )
}
