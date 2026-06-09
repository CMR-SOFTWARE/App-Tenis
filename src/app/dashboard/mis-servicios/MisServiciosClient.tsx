"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PedidoEstado } from "@/generated/prisma/enums"
import { solicitarServicio, cancelarPedidoAlumno } from "./actions"

type ServicioCatalogo = { id: string; nombre: string; precio: number }

type Pedido = {
  id: string
  estado: PedidoEstado
  precioSnapshot: number
  nota: string | null
  creadoEn: Date
  catalogoServicio: { nombre: string }
}

type Props = {
  catalogo: ServicioCatalogo[]
  pedidos: Pedido[]
}

const ESTADO_LABEL: Record<PedidoEstado, string> = {
  PENDIENTE:  "Pendiente",
  CONFIRMADO: "Confirmado",
  FACTURADO:  "Facturado",
  CANCELADO:  "Cancelado",
}

const ESTADO_COLOR: Record<PedidoEstado, string> = {
  PENDIENTE:  "bg-amber-100 text-amber-700",
  CONFIRMADO: "bg-green-100 text-green-700",
  FACTURADO:  "bg-gray-100 text-gray-500",
  CANCELADO:  "bg-red-100 text-red-500",
}

export default function MisServiciosClient({ catalogo, pedidos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [solicitando, setSolicitando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  function handleSolicitar(servicioId: string, nombreServicio: string) {
    setError(null)
    setExito(null)
    setSolicitando(servicioId)
    startTransition(async () => {
      const res = await solicitarServicio(servicioId, notas[servicioId])
      setSolicitando(null)
      if (res.error) {
        setError(res.error)
      } else {
        setExito(`Pediste "${nombreServicio}" — tu profesor lo verá pronto.`)
        setNotas((prev) => ({ ...prev, [servicioId]: "" }))
        router.refresh()
      }
    })
  }

  function handleCancelar(pedidoId: string) {
    startTransition(async () => {
      await cancelarPedidoAlumno(pedidoId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Feedback global */}
      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          ✓ {exito}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Catálogo */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Servicios disponibles</p>
        </div>

        {catalogo.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Tu profesor aún no habilitó servicios.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {catalogo.map((s) => (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.nombre}</p>
                    <p className="text-sm text-green-700 font-bold">
                      ${s.precio.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notas[s.id] ?? ""}
                    onChange={(e) => setNotas((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Nota opcional (ej: tensión 55 lbs)"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <button
                    onClick={() => handleSolicitar(s.id, s.nombre)}
                    disabled={isPending || solicitando === s.id}
                    className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {solicitando === s.id ? "Pidiendo..." : "Solicitar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mis pedidos */}
      {pedidos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Mis pedidos</p>
          </div>
          <div className="divide-y divide-gray-50">
            {pedidos.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.catalogoServicio.nombre}
                  </p>
                  {p.nota && (
                    <p className="text-xs text-gray-400 italic truncate">"{p.nota}"</p>
                  )}
                  <p className="text-xs text-gray-400">
                    ${p.precioSnapshot.toLocaleString("es-AR")} ·{" "}
                    {new Date(p.creadoEn).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[p.estado]}`}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                  {p.estado === PedidoEstado.PENDIENTE && (
                    <button
                      onClick={() => handleCancelar(p.id)}
                      disabled={isPending}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
