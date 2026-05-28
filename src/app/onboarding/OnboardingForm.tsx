"use client"
// Formulario de onboarding — Client Component
//
// Es "use client" porque necesita:
//   - useActionState: hook de React 19 para manejar el estado del formulario
//   - useState: para el preview del subdominio en tiempo real

import { useActionState, useState } from "react"
import { crearAcademia } from "./actions"

export default function OnboardingForm({ userName }: { userName?: string | null }) {
  // useActionState conecta el formulario con el Server Action
  // - state: lo que devuelve el action (null si no hay error, { error: "..." } si falla)
  // - formAction: se pasa al atributo action del <form>
  // - isPending: true mientras el server está procesando
  const [state, formAction, isPending] = useActionState(crearAcademia, null)

  // Para mostrar el preview del subdominio mientras el usuario escribe
  const [subdominio, setSubdominio] = useState("")

  // Limpia el subdominio mientras escribe: minúsculas y solo caracteres válidos
  function handleSubdominio(e: React.ChangeEvent<HTMLInputElement>) {
    const limpio = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    setSubdominio(limpio)
    e.target.value = limpio
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Nombre de la academia */}
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
          Nombre de tu academia o perfil
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          placeholder="Ej: Academia Juan Pérez"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900 placeholder-gray-400"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          Este nombre aparece en tu landing page y en el título del browser.
        </p>
      </div>

      {/* Subdominio */}
      <div>
        <label htmlFor="subdominio" className="block text-sm font-medium text-gray-700 mb-2">
          Elegí tu dirección web (subdominio)
        </label>
        <div className="flex items-center gap-0">
          <input
            id="subdominio"
            name="subdominio"
            type="text"
            required
            placeholder="juanperez"
            onChange={handleSubdominio}
            className="flex-1 px-4 py-3 rounded-l-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900 placeholder-gray-400"
          />
          <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-gray-500 text-sm whitespace-nowrap">
            .acepro.app
          </span>
        </div>

        {/* Preview de la URL */}
        {subdominio && (
          <p className="mt-2 text-sm text-green-700 font-medium">
            Tu link: <span className="underline">{subdominio}.acepro.app</span>
          </p>
        )}

        <p className="mt-1.5 text-xs text-gray-400">
          Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.
        </p>
      </div>

      {/* Mensaje de error del server */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      {/* Botón de submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Creando tu academia..." : "Crear mi academia →"}
      </button>
    </form>
  )
}
