"use client"

import { useState } from "react"
import {
  getAlumnosDeDia,
  cancelarDia,
  type AlumnoAfectado,
} from "@/app/dashboard/turnos/actions"

type Estado =
  | { tipo: "idle" }
  | { tipo: "preview"; alumnos: AlumnoAfectado[] }
  | { tipo: "cancelado"; alumnos: AlumnoAfectado[] }

export default function CancelarDiaPanel() {
  const [fecha, setFecha] = useState("")
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleCambioFecha(val: string) {
    setFecha(val)
    setEstado({ tipo: "idle" })
    setError(null)
  }

  async function handleVerAfectados() {
    if (!fecha) return
    setLoading(true)
    setError(null)
    const res = await getAlumnosDeDia(fecha)
    if (res.error) setError(res.error)
    else setEstado({ tipo: "preview", alumnos: res.alumnos ?? [] })
    setLoading(false)
  }

  async function handleConfirmarCancelacion() {
    if (!fecha) return
    setLoading(true)
    const res = await cancelarDia(fecha)
    if (res.error) {
      setError(res.error)
    } else {
      setEstado({ tipo: "cancelado", alumnos: res.cancelados ?? [] })
    }
    setLoading(false)
  }

  const fechaLabel = fecha
    ? new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Cancelar clases por el día</h3>
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          ⚠ Acción irreversible
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Por lluvia u otras complicaciones — luego podrás avisar a tus alumnos por WhatsApp
      </p>

      <div className="flex gap-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => handleCambioFecha(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleVerAfectados}
          disabled={!fecha || loading}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading && estado.tipo === "idle" ? "Buscando..." : "Ver afectados"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {estado.tipo === "preview" && (
        <div className="mt-4">
          {estado.alumnos.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              No hay clases confirmadas para {fechaLabel}.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                <span className="font-semibold text-gray-800">{estado.alumnos.length}</span>{" "}
                alumno{estado.alumnos.length !== 1 ? "s" : ""} afectado
                {estado.alumnos.length !== 1 ? "s" : ""} el{" "}
                <span className="capitalize">{fechaLabel}</span>:
              </p>

              <div className="divide-y divide-gray-50 mb-4">
                {estado.alumnos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm text-gray-800">
                        {a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}
                      </span>
                      {a.telefono && (
                        <span className="text-xs text-gray-400 ml-2">{a.telefono}</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                      {a.horaInicio}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirmarCancelacion}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? "Cancelando clases..."
                  : `Cancelar ${estado.alumnos.length} clase${estado.alumnos.length !== 1 ? "s" : ""} del día`}
              </button>
            </>
          )}
        </div>
      )}

      {estado.tipo === "cancelado" && (
        <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-700 mb-1">
            ✓ {estado.alumnos.length} clase{estado.alumnos.length !== 1 ? "s" : ""} cancelada
            {estado.alumnos.length !== 1 ? "s" : ""}
          </p>
          {estado.alumnos.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {estado.alumnos.map((a, i) => (
                <p key={i} className="text-xs text-green-600">
                  {a.horaInicio} · {a.apellido ? `${a.apellido}, ${a.nombre}` : a.nombre}
                  {a.telefono ? ` (${a.telefono})` : ""}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-green-100">
            Cuando integres WhatsApp, cada alumno recibirá un aviso automático con el detalle.
          </p>
        </div>
      )}
    </div>
  )
}
