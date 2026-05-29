"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { bloquearSlot, desbloquearSlot, asignarAlumno, cancelarAsignacionSlot } from "./actions"

const HORAS = Array.from({ length: 12 }, (_, i) =>
  `${(i + 8).toString().padStart(2, "0")}:00`
)
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DIA_NUMS = [1, 2, 3, 4, 5, 6]

type CeldaInfo = {
  slotId: string
  activo: boolean
  alumno: { id: string; name: string | null; email: string } | null
}

type Props = {
  gridData: Record<string, CeldaInfo>
  students: { id: string; name: string | null; email: string }[]
}

export default function GrillaTurnos({ gridData, students }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<{ dia: number; hora: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function getInfo(dia: number, hora: string) {
    return gridData[`${dia}-${hora}`] ?? null
  }

  function getEstado(dia: number, hora: string) {
    const info = getInfo(dia, hora)
    if (!info) return "libre"
    if (!info.activo) return "bloqueado"
    if (info.alumno) return "asignado"
    return "libre"
  }

  function doAction(fn: () => Promise<{ error?: string } | void>) {
    setActionError(null)
    startTransition(async () => {
      const result = await fn()
      if (result && "error" in result && result.error) {
        setActionError(result.error)
        return
      }
      router.refresh()
      cerrar()
    })
  }

  function cerrar() {
    setSelected(null)
    setActionError(null)
  }

  const selInfo = selected ? getInfo(selected.dia, selected.hora) : null
  const selEstado = selected ? getEstado(selected.dia, selected.hora) : null

  return (
    <>
      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
          Bloqueado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200 inline-block" />
          Asignado
        </span>
      </div>

      {/* Grilla con scroll horizontal en mobile */}
      <div className="overflow-x-auto -mx-1">
        <table className="border-separate border-spacing-1" style={{ minWidth: "320px", width: "100%" }}>
          <thead>
            <tr>
              <th className="w-10" />
              {DIAS.map((d) => (
                <th key={d} className="text-xs font-semibold text-gray-500 pb-2 text-center" style={{ minWidth: "44px" }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((hora) => (
              <tr key={hora}>
                <td className="text-xs text-gray-400 text-right pr-2 align-middle select-none w-10">
                  {hora}
                </td>
                {DIA_NUMS.map((dia) => {
                  const estado = getEstado(dia, hora)
                  const isSel = selected?.dia === dia && selected?.hora === hora

                  return (
                    <td key={dia} className="p-0">
                      <button
                        onClick={() => {
                          setActionError(null)
                          setSelected(isSel ? null : { dia, hora })
                        }}
                        disabled={isPending}
                        className={[
                          "w-full h-11 rounded-lg text-xs font-medium transition-colors border touch-manipulation",
                          isSel ? "ring-2 ring-green-600 ring-offset-1" : "",
                          estado === "libre"
                            ? "bg-white border-gray-200 text-transparent active:bg-green-50"
                            : estado === "bloqueado"
                            ? "bg-gray-100 border-gray-200 text-gray-500"
                            : "bg-green-100 border-green-200 text-green-800 overflow-hidden px-0.5",
                        ].join(" ")}
                      >
                        {estado === "bloqueado" && "—"}
                        {estado === "asignado" &&
                          (getInfo(dia, hora)?.alumno?.name?.split(" ")[0] ?? "✓")}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Overlay oscuro — cierra el sheet al tocar */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={cerrar}
      />

      {/* Bottom sheet — se desliza desde abajo */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out
          ${selected ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Handle visual (estilo iOS) */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header del sheet */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-lg">
            {selected
              ? `${DIAS[DIA_NUMS.indexOf(selected.dia)]} — ${selected.hora}`
              : ""}
          </p>
          <button
            onClick={cerrar}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xl font-medium active:bg-gray-200"
          >
            ×
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="px-6 py-5 overflow-y-auto space-y-3" style={{ maxHeight: "60vh" }}>

          {/* Mensaje de error */}
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
              {actionError}
            </div>
          )}

          {/* Celda libre → bloquear o asignar */}
          {selEstado === "libre" && (
            <>
              <button
                onClick={() => doAction(() => bloquearSlot(selected!.dia, selected!.hora))}
                disabled={isPending}
                className="w-full border border-gray-300 text-gray-700 py-4 rounded-2xl text-sm font-semibold active:bg-gray-50 transition-colors disabled:opacity-50"
              >
                🔒 Bloquear este horario
              </button>

              {students.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Asignar alumno
                  </p>
                  <div className="space-y-2">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          doAction(() => asignarAlumno(selected!.dia, selected!.hora, s.id))
                        }
                        disabled={isPending}
                        className="w-full bg-green-700 text-white py-4 rounded-2xl text-sm font-semibold active:bg-green-900 transition-colors disabled:opacity-50 text-left px-5"
                      >
                        {s.name ?? s.email}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-5 text-center">
                  <p className="text-sm font-semibold text-gray-600">
                    No tenés alumnos registrados
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Compartí el link de invitación para que se unan
                  </p>
                </div>
              )}
            </>
          )}

          {/* Celda bloqueada → desbloquear */}
          {selEstado === "bloqueado" && (
            <button
              onClick={() => doAction(() => desbloquearSlot(selInfo!.slotId))}
              disabled={isPending}
              className="w-full bg-gray-800 text-white py-4 rounded-2xl text-sm font-semibold active:bg-black transition-colors disabled:opacity-50"
            >
              Desbloquear horario
            </button>
          )}

          {/* Celda asignada → ver alumno o cancelar */}
          {selEstado === "asignado" && (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-green-600 mb-1">Asignado a</p>
                <p className="text-lg font-black text-green-900">
                  {selInfo?.alumno?.name ?? selInfo?.alumno?.email}
                </p>
                <p className="text-xs text-green-600">{selInfo?.alumno?.email}</p>
              </div>
              <button
                onClick={() => doAction(() => cancelarAsignacionSlot(selInfo!.slotId))}
                disabled={isPending}
                className="w-full border border-red-200 text-red-500 py-4 rounded-2xl text-sm font-semibold active:bg-red-50 transition-colors disabled:opacity-50"
              >
                Cancelar asignación
              </button>
            </div>
          )}

          {isPending && (
            <p className="text-sm text-center text-gray-400 py-2">Guardando...</p>
          )}

          {/* Espacio extra en la parte inferior para el safe area de iOS */}
          <div className="h-6" />
        </div>
      </div>
    </>
  )
}
