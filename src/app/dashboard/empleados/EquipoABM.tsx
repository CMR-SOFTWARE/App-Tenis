"use client"

import { useActionState, useTransition } from "react"
import { agregarEmpleado, eliminarEmpleado } from "./actions"

export type EmpleadoInfo = {
  tenantId: string
  nombre: string
  subdominio: string
  slotsAsignados: number
  clasesDelMes: number
}

const initialState = { error: undefined, ok: undefined }

export default function EquipoABM({ empleados }: { empleados: EmpleadoInfo[] }) {
  const [state, formAction, isPending] = useActionState(agregarEmpleado, initialState)
  const [isRemoving, startRemove] = useTransition()

  function handleEliminar(empleadoTenantId: string, nombre: string) {
    if (!confirm(`¿Quitar a ${nombre} del equipo? Se desasignará de todos tus slots.`)) return
    startRemove(() => eliminarEmpleado(empleadoTenantId))
  }

  return (
    <div className="space-y-6">
      {/* Formulario agregar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Agregar profesor al equipo</h3>
        <p className="text-xs text-gray-400 mb-4">
          El profesor debe estar registrado en la plataforma. Ingresá su subdominio (ej: &quot;maria-garcia&quot;).
        </p>
        <form action={formAction} className="flex gap-2">
          <input
            type="text"
            name="subdominio"
            placeholder="subdominio del profesor"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium disabled:opacity-40"
          >
            {isPending ? "Agregando..." : "Agregar"}
          </button>
        </form>
        {state?.error && <p className="text-sm text-red-500 mt-2">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-600 mt-2">✓ Profesor agregado al equipo</p>}
      </div>

      {/* Lista de empleados */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Mi equipo{" "}
            <span className="text-gray-400 font-normal">({empleados.length})</span>
          </h3>
        </div>

        {empleados.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Todavía no tenés profesores en tu equipo.</p>
            <p className="text-xs text-gray-400 mt-1">Agregá uno usando el formulario de arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {empleados.map((e) => (
              <div
                key={e.tenantId}
                className="flex items-center justify-between px-5 py-4 gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{e.nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{e.subdominio}</p>
                </div>
                <div className="flex items-center gap-5 text-xs text-gray-500 shrink-0">
                  <div className="text-center">
                    <p className="font-semibold text-gray-700 text-sm">{e.slotsAsignados}</p>
                    <p>slots asignados</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700 text-sm">{e.clasesDelMes}</p>
                    <p>clases este mes</p>
                  </div>
                  <button
                    onClick={() => handleEliminar(e.tenantId, e.nombre)}
                    disabled={isRemoving}
                    className="text-red-400 hover:text-red-600 text-xs border border-red-100 hover:border-red-300 px-2 py-1 rounded-lg disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
