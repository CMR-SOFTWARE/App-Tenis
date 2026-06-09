"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  crearServicio,
  editarServicio,
  toggleServicio,
  confirmarPedido,
  cancelarPedidoProfe,
} from "./actions"

type Servicio = {
  id: string
  nombre: string
  precio: number
  activo: boolean
}

type Pedido = {
  id: string
  precioSnapshot: number
  nota: string | null
  creadoEn: Date
  alumno: { nombre: string | null; apellido: string | null; email: string }
  catalogoServicio: { nombre: string }
}

type Props = {
  catalogo: Servicio[]
  pedidos: Pedido[]
}

type Tab = "catalogo" | "pedidos"

export default function ServiciosClient({ catalogo: initialCatalogo, pedidos: initialPedidos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>("catalogo")

  // Nuevo servicio
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoPrecio, setNuevoPrecio] = useState("")

  // Edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editPrecio, setEditPrecio] = useState("")

  function handleCrear() {
    const precio = parseFloat(nuevoPrecio)
    if (!nuevoNombre.trim() || isNaN(precio) || precio <= 0) return
    startTransition(async () => {
      await crearServicio({ nombre: nuevoNombre, precio })
      setNuevoNombre("")
      setNuevoPrecio("")
      router.refresh()
    })
  }

  function iniciarEdicion(s: Servicio) {
    setEditandoId(s.id)
    setEditNombre(s.nombre)
    setEditPrecio(String(s.precio))
  }

  function handleEditar(id: string) {
    const precio = parseFloat(editPrecio)
    if (!editNombre.trim() || isNaN(precio) || precio <= 0) return
    startTransition(async () => {
      await editarServicio(id, { nombre: editNombre, precio })
      setEditandoId(null)
      router.refresh()
    })
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleServicio(id)
      router.refresh()
    })
  }

  function handleConfirmar(id: string) {
    startTransition(async () => {
      await confirmarPedido(id)
      router.refresh()
    })
  }

  function handleCancelar(id: string) {
    startTransition(async () => {
      await cancelarPedidoProfe(id)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("catalogo")}
          className={`flex-1 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
            tab === "catalogo"
              ? "border-green-700 text-green-800 bg-green-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Catálogo
        </button>
        <button
          onClick={() => setTab("pedidos")}
          className={`flex-1 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 relative ${
            tab === "pedidos"
              ? "border-green-700 text-green-800 bg-green-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Pedidos pendientes
          {initialPedidos.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold">
              {initialPedidos.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* ── TAB: CATÁLOGO ── */}
        {tab === "catalogo" && (
          <>
            {/* Formulario nuevo servicio */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Agregar nuevo servicio
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del servicio (ej: Encordado)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                />
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    placeholder="Precio"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  />
                </div>
                <button
                  onClick={handleCrear}
                  disabled={isPending || !nuevoNombre.trim() || !nuevoPrecio}
                  className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Lista de servicios */}
            {initialCatalogo.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Aún no agregaste ningún servicio.
              </p>
            ) : (
              <div className="space-y-2">
                {initialCatalogo.map((s) =>
                  editandoId === s.id ? (
                    <div key={s.id} className="flex gap-2 items-center p-3 bg-green-50 border border-green-200 rounded-xl">
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={editPrecio}
                          onChange={(e) => setEditPrecio(e.target.value)}
                          min="0"
                          className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => handleEditar(s.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        s.activo ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${s.activo ? "text-gray-900" : "text-gray-400 line-through"}`}>
                            {s.nombre}
                          </p>
                          <p className="text-sm text-green-700 font-semibold">
                            ${s.precio.toLocaleString("es-AR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {s.activo ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => iniciarEdicion(s)}
                          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(s.id)}
                          disabled={isPending}
                          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          {s.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}

        {/* ── TAB: PEDIDOS ── */}
        {tab === "pedidos" && (
          <>
            {initialPedidos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No hay pedidos pendientes.</p>
                <p className="text-xs text-gray-300 mt-1">
                  Cuando un alumno solicite un servicio aparecerá acá.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  Los pedidos confirmados se incluirán automáticamente al generar el cobro mensual del alumno.
                </p>
                {initialPedidos.map((p) => {
                  const nombre = p.alumno.nombre && p.alumno.apellido
                    ? `${p.alumno.nombre} ${p.alumno.apellido}`
                    : p.alumno.nombre ?? p.alumno.email
                  return (
                    <div key={p.id} className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{nombre}</p>
                          <p className="text-xs text-gray-500">
                            {p.catalogoServicio.nombre} ·{" "}
                            <span className="font-semibold text-green-700">
                              ${p.precioSnapshot.toLocaleString("es-AR")}
                            </span>
                          </p>
                          {p.nota && (
                            <p className="text-xs text-gray-400 italic mt-0.5">"{p.nota}"</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 flex-shrink-0">
                          {new Date(p.creadoEn).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleConfirmar(p.id)}
                          disabled={isPending}
                          className="flex-1 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleCancelar(p.id)}
                          disabled={isPending}
                          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
