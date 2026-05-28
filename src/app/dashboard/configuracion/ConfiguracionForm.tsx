"use client"
// Formulario de configuración del perfil — Client Component

import { useActionState } from "react"
import { actualizarPerfil } from "./actions"

export default function ConfiguracionForm({ tenant }:{ 
    tenant: {
        nombre:string 
        bio:string | null
        experienciaAnios:number | null
        whatsapp:string | null
    }
    }) {
  // useActionState conecta el formulario con el Server Action
  // - state: lo que devuelve el action (null si no hay error, { error: "..." } si falla)
  // - formAction: se pasa al atributo action del <form>
  // - isPending: true mientras el server está procesando
  const [state, formAction, isPending] = useActionState(actualizarPerfil, null)

  

  return (
    <form action={formAction} className="space-y-6">
     {/* Nombre */}
        <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la academia
        </label>
        <input id="nombre" name="nombre" type="text" required
            defaultValue={tenant.nombre}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
        />
        </div>

        {/* Bio */}
        <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (bio)
        </label>
        <textarea id="bio" name="bio" rows={4}
            defaultValue={tenant.bio ?? ""}
            placeholder="Contá quién sos, tu experiencia, tu metodología..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
        />
        </div>

        {/* Años de experiencia */}
        <div>
        <label htmlFor="experienciaAnios" className="block text-sm font-medium text-gray-700 mb-2">
            Años de experiencia
        </label>
        <input id="experienciaAnios" name="experienciaAnios" type="number" min={0} max={80}
            defaultValue={tenant.experienciaAnios ?? ""}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
        />
        </div>

        {/* WhatsApp */}
        <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp
        </label>
        <input id="whatsapp" name="whatsapp" type="text"
            defaultValue={tenant.whatsapp ?? ""}
            placeholder="+5491112345678"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900 placeholder-gray-400"
        />
        </div>

      {/* Mensaje de error del server */}
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


      {/* Botón de submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  )
}
