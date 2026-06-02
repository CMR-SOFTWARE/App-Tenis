"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlumnoEstado, NivelJugador } from "@/generated/prisma/enums"
import { cambiarEstadoAlumno, cancelarTurnoAlumno } from "./actions"

type Alumno = {
  id: string
  name: string | null
  email: string
  alumnoEstado: AlumnoEstado | null
  nivelJugador: NivelJugador | null
  turno: string | null
}

type Props = {
  alumnos: Alumno[]
  precioMensual: number | null
}

const ESTADO_LABEL: Record<AlumnoEstado, string> = {
  ACTIVO:     "Activo",
  STANDBY:    "Esperando pago",
  SUSPENDIDO: "Debe",
  INACTIVO:   "Inactivo",
}

const ESTADO_COLOR: Record<AlumnoEstado, string> = {
  ACTIVO:     "bg-green-100 text-green-800",
  STANDBY:    "bg-yellow-100 text-yellow-800",
  SUSPENDIDO: "bg-red-100 text-red-800",
  INACTIVO:   "bg-gray-100 text-gray-500",
}

const NIVEL_LABEL: Record<NivelJugador, string> = {
  SEPTIMA:  "7ma",
  SEXTA:    "6ta",
  QUINTA:   "5ta",
  CUARTA:   "4ta",
  TERCERA:  "3ra",
  SEGUNDA:  "2da",
  PRIMERA:  "1ra",
}

const NIVEL_COLOR: Record<NivelJugador, string> = {
  SEPTIMA:  "bg-gray-100 text-gray-500",
  SEXTA:    "bg-blue-100 text-blue-600",
  QUINTA:   "bg-sky-100 text-sky-700",
  CUARTA:   "bg-teal-100 text-teal-700",
  TERCERA:  "bg-yellow-100 text-yellow-700",
  SEGUNDA:  "bg-orange-100 text-orange-700",
  PRIMERA:  "bg-red-100 text-red-700",
}

export default function AlumnosClient({ alumnos, precioMensual }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCambiarEstado(studentId: string, nuevoEstado: AlumnoEstado) {
    startTransition(async () => {
      const result = await cambiarEstadoAlumno(studentId, nuevoEstado)
      if (!result.error) router.refresh()
    })
  }

  function handleCancelarTurno(studentId: string) {
    startTransition(async () => {
      const result = await cancelarTurnoAlumno(studentId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {precioMensual && (
        <p className="text-xs text-gray-400 px-1">
          Precio por hora: <span className="font-semibold text-gray-600">${precioMensual.toLocaleString("es-AR")}</span>
        </p>
      )}

      {alumnos.map((alumno) => {
        const estado = alumno.alumnoEstado ?? AlumnoEstado.STANDBY
        const esSuspendido = estado === AlumnoEstado.SUSPENDIDO
        const esperandoPago = estado === AlumnoEstado.STANDBY

        return (
          <div key={alumno.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            {/* Header: nombre + chips */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{alumno.name ?? "Sin nombre"}</p>
                <p className="text-xs text-gray-400 truncate">{alumno.email}</p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[estado]}`}>
                  {ESTADO_LABEL[estado]}
                </span>
                {alumno.nivelJugador && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NIVEL_COLOR[alumno.nivelJugador]}`}>
                    {NIVEL_LABEL[alumno.nivelJugador]}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Turno: <span className="font-medium text-gray-800">{alumno.turno ?? "Sin turno"}</span>
            </p>

            <div className="flex gap-2">
              {/* Confirmar pago (cuando está en STANDBY) */}
              {esperandoPago && (
                <button
                  onClick={() => handleCambiarEstado(alumno.id, AlumnoEstado.ACTIVO)}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors"
                >
                  ✓ Confirmar pago
                </button>
              )}

              {/* Suspender / Activar (cuando está ACTIVO o SUSPENDIDO) */}
              {!esperandoPago && (
                <button
                  onClick={() =>
                    handleCambiarEstado(
                      alumno.id,
                      esSuspendido ? AlumnoEstado.ACTIVO : AlumnoEstado.SUSPENDIDO
                    )
                  }
                  disabled={isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    esSuspendido
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  {esSuspendido ? "Activar" : "Suspender"}
                </button>
              )}

              {alumno.turno && (
                <button
                  onClick={() => handleCancelarTurno(alumno.id)}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancelar turno
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
