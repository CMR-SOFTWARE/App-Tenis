"use client"

import { useActionState } from "react"
import { registrarClub } from "./actions"

const INPUT = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"

export default function ClubForm() {
  const [state, formAction, isPending] = useActionState(registrarClub, null)

  return (
    <form action={formAction} className="space-y-4">

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del club</label>
        <input name="nombre" type="text" required className={INPUT} placeholder="Club Atlético San Nicolás" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-600">
          <input
            name="subdominio"
            type="text"
            required
            className="flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            placeholder="mi-club"
          />
          <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 h-full flex items-center py-2.5">
            .acepro.app
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad (opcional)</label>
        <input name="ciudad" type="text" className={INPUT} placeholder="San Nicolás" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email del responsable</label>
        <input name="email" type="email" required autoComplete="email" className={INPUT} placeholder="director@miclub.com" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input name="password" type="password" required minLength={8} className={INPUT} placeholder="Mínimo 8 caracteres" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
        <input name="passwordConfirm" type="password" required className={INPUT} placeholder="Repetí la contraseña" />
      </div>

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
        {isPending ? "Registrando club..." : "Registrar club"}
      </button>
    </form>
  )
}
