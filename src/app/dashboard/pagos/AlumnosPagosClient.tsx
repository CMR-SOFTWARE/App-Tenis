"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MetodoPago, ResumenEstado } from "@/generated/prisma/enums"
import { generarResumenesMes, confirmarPago } from "./actions"

function navegarMes(mes: string, delta: number): string {
  const [anio, m] = mes.split("-").map(Number)
  const d = new Date(Date.UTC(anio, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

type ExtraRow = { id: string; descripcion: string; monto: number }

type ResumenRow = {
  id: string
  horasTomadas: number
  montoClases: number
  montoExtras: number
  totalMonto: number
  estado: ResumenEstado
  comprobanteUrl: string | null
  metodoPago: MetodoPago | null
  extras: ExtraRow[]
} | null

type AlumnoRow = {
  id: string
  nombre: string | null
  apellido: string | null
  email: string
  resumen: ResumenRow
}

type Props = {
  alumnos: AlumnoRow[]
  mes: string
  mesLabel: string
}

const ESTADO_LABEL: Record<ResumenEstado, string> = {
  PENDIENTE:           "Pendiente",
  COMPROBANTE_ENVIADO: "Comprobante enviado",
  CONFIRMADO:          "Confirmado",
  VENCIDO:             "Vencido",
}

const ESTADO_COLOR: Record<ResumenEstado, string> = {
  PENDIENTE:           "bg-yellow-100 text-yellow-800",
  COMPROBANTE_ENVIADO: "bg-blue-100 text-blue-800",
  CONFIRMADO:          "bg-green-100 text-green-800",
  VENCIDO:             "bg-red-100 text-red-800",
}

const METODO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO:      "Efectivo",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO:  "Mercado Pago",
}

export default function AlumnosPagosClient({ alumnos, mes, mesLabel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [metodos, setMetodos] = useState<Record<string, MetodoPago>>({})

  const hayAlumnosSinResumen = alumnos.some((a) => !a.resumen)

  function getMetodo(alumnoId: string): MetodoPago {
    return metodos[alumnoId] ?? MetodoPago.EFECTIVO
  }

  function handleGenerar() {
    startTransition(async () => {
      await generarResumenesMes(mes)
      router.refresh()
    })
  }

  function handleConfirmar(resumenId: string, alumnoId: string) {
    startTransition(async () => {
      await confirmarPago(resumenId, getMetodo(alumnoId))
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Navegación de meses */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
        <button
          onClick={() => router.push(`?mes=${navegarMes(mes, -1)}`)}
          disabled={isPending}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 font-bold"
        >
          ←
        </button>
        <span className="font-semibold text-gray-900">{mesLabel}</span>
        <button
          onClick={() => router.push(`?mes=${navegarMes(mes, 1)}`)}
          disabled={isPending}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 font-bold"
        >
          →
        </button>
      </div>

      {/* Botón generar cobros */}
      {hayAlumnosSinResumen && (
        <button
          onClick={handleGenerar}
          disabled={isPending}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-50"
        >
          {isPending ? "Generando..." : `Generar cobros de ${mesLabel}`}
        </button>
      )}

      {/* Sin alumnos */}
      {alumnos.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-400">No hay alumnos activos en esta academia.</p>
        </div>
      )}

      {/* Cards de alumnos */}
      {alumnos.map((alumno) => {
        const nombreCompleto =
          alumno.nombre && alumno.apellido
            ? `${alumno.nombre} ${alumno.apellido}`
            : alumno.nombre ?? alumno.email

        const r = alumno.resumen
        const puedeConfirmar =
          r &&
          (r.estado === ResumenEstado.PENDIENTE ||
            r.estado === ResumenEstado.COMPROBANTE_ENVIADO)

        return (
          <div key={alumno.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{nombreCompleto}</p>
                <p className="text-xs text-gray-400 truncate">{alumno.email}</p>
              </div>
              {r && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${ESTADO_COLOR[r.estado]}`}
                >
                  {ESTADO_LABEL[r.estado]}
                </span>
              )}
            </div>

            {/* Sin resumen */}
            {!r && (
              <p className="text-xs text-gray-400 italic">Sin resumen generado para este mes.</p>
            )}

            {/* Desglose de montos */}
            {r && (
              <div className="text-sm text-gray-600 space-y-0.5 mb-4">
                <p>
                  {r.horasTomadas} {r.horasTomadas === 1 ? "clase" : "clases"} ·{" "}
                  <span className="font-medium text-gray-800">
                    ${r.montoClases.toLocaleString("es-AR")}
                  </span>
                </p>
                {r.extras.length > 0 && (
                  <div className="space-y-0.5 pt-0.5">
                    {r.extras.map((e) => (
                      <p key={e.id} className="flex items-center justify-between">
                        <span className="text-gray-500">· {e.descripcion}</span>
                        <span className="font-medium text-gray-800">
                          ${e.monto.toLocaleString("es-AR")}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
                <p className="font-semibold text-gray-900 pt-1 border-t border-gray-100">
                  Total: ${r.totalMonto.toLocaleString("es-AR")}
                </p>
                {r.estado === ResumenEstado.CONFIRMADO && r.metodoPago && (
                  <p className="text-xs text-green-700 font-medium pt-1">
                    ✓ Pagado — {METODO_LABEL[r.metodoPago]}
                  </p>
                )}
              </div>
            )}

            {/* Acciones */}
            {puedeConfirmar && (
              <div className="flex gap-2">
                {r.comprobanteUrl && (
                  <a
                    href={r.comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Ver comprobante
                  </a>
                )}
                <select
                  value={getMetodo(alumno.id)}
                  onChange={(e) =>
                    setMetodos((prev) => ({ ...prev, [alumno.id]: e.target.value as MetodoPago }))
                  }
                  className="rounded-xl border border-gray-200 text-sm px-3 py-2.5 text-gray-700 bg-white"
                >
                  <option value={MetodoPago.EFECTIVO}>Efectivo</option>
                  <option value={MetodoPago.TRANSFERENCIA}>Transferencia</option>
                  <option value={MetodoPago.MERCADO_PAGO}>Mercado Pago</option>
                </select>
                <button
                  onClick={() => handleConfirmar(r.id, alumno.id)}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  Confirmar pago
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
