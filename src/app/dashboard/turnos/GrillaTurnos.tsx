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
  // useTransition permite correr código async sin bloquear la UI
  // isPending es true mientras el server action se ejecuta
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<{ dia: number; hora: string } | null>(null)

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

  // Llama al Server Action y después refresca los datos del Server Component
  function doAction(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      router.refresh()
      setSelected(null)
    })
  }

  const selInfo = selected ? getInfo(selected.dia, selected.hora) : null
  const selEstado = selected ? getEstado(selected.dia, selected.hora) : null

  return (
    <div>
      {/* Leyenda */}
      <div className="flex items-center gap-5 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-300 bg-white inline-block" />
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

      {/* Grilla */}
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 min-w-[400px]" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th className="w-12" />
              {DIAS.map((d) => (
                <th key={d} className="text-xs font-semibold text-gray-500 pb-2 text-center">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((hora) => (
              <tr key={hora}>
                <td className="text-xs text-gray-400 text-right pr-2 align-middle select-none w-12">
                  {hora}
                </td>
                {DIA_NUMS.map((dia) => {
                  const estado = getEstado(dia, hora)
                  const isSel = selected?.dia === dia && selected?.hora === hora

                  return (
                    <td key={dia} className="p-0">
                      <button
                        onClick={() =>
                          setSelected(isSel ? null : { dia, hora })
                        }
                        disabled={isPending}
                        title={
                          estado === "bloqueado"
                            ? "Bloqueado"
                            : estado === "asignado"
                            ? getInfo(dia, hora)?.alumno?.name ?? "Asignado"
                            : "Libre — click para opciones"
                        }
                        className={[
                          "w-full h-9 rounded-lg text-xs font-medium transition-all border",
                          isSel ? "ring-2 ring-green-600 ring-offset-1" : "",
                          estado === "libre"
                            ? "bg-white border-gray-200 text-transparent hover:bg-green-50 hover:border-green-300"
                            : estado === "bloqueado"
                            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-pointer"
                            : "bg-green-100 border-green-200 text-green-800 truncate px-1",
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

      {/* Panel de acción — aparece al seleccionar una celda */}
      {selected && (
        <div className="mt-6 p-5 rounded-2xl border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-800">
              {DIAS[DIA_NUMS.indexOf(selected.dia)]} — {selected.hora}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Celda libre */}
          {selEstado === "libre" && (
            <div className="space-y-3">
              <button
                onClick={() => doAction(() => bloquearSlot(selected.dia, selected.hora))}
                disabled={isPending}
                className="w-full border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Bloquear este horario
              </button>

              {students.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Asignar alumno:</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => doAction(() => asignarAlumno(selected.dia, selected.hora, s.id))}
                        disabled={isPending}
                        className="w-full bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50 text-left px-4"
                      >
                        {s.name ?? s.email}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-1">
                  Todavía no tenés alumnos registrados
                </p>
              )}
            </div>
          )}

          {/* Celda bloqueada */}
          {selEstado === "bloqueado" && (
            <button
              onClick={() => doAction(() => desbloquearSlot(selInfo!.slotId))}
              disabled={isPending}
              className="w-full bg-gray-800 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              Desbloquear
            </button>
          )}

          {/* Celda asignada */}
          {selEstado === "asignado" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Asignado a:{" "}
                <span className="font-semibold text-gray-900">
                  {selInfo?.alumno?.name ?? selInfo?.alumno?.email}
                </span>
              </p>
              <button
                onClick={() => doAction(() => cancelarAsignacionSlot(selInfo!.slotId))}
                disabled={isPending}
                className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Cancelar asignación
              </button>
            </div>
          )}

          {isPending && (
            <p className="text-xs text-gray-400 text-center mt-3">Guardando...</p>
          )}
        </div>
      )}
    </div>
  )
}
