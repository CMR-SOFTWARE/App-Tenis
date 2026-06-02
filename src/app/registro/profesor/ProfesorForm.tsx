"use client"

import { useActionState, useState, useEffect, useRef } from "react"
import { registrarProfesor } from "./actions"

type Club = { id: string; nombre: string; subdominio: string }

const INPUT = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"

export default function ProfesorForm() {
  const [state, formAction, isPending] = useActionState(registrarProfesor, null)
  const [clubSeleccionado, setClubSeleccionado] = useState<Club | null>(null)
  const [query, setQuery] = useState("")
  const [clubes, setClubes] = useState<Club[]>([])
  const [buscando, setBuscando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setClubes([]); return }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/clubes?q=${encodeURIComponent(query)}`)
        setClubes(await res.json())
      } finally {
        setBuscando(false)
      }
    }, 300)
  }, [query])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clubId" value={clubSeleccionado?.id ?? ""} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input name="nombre" type="text" required className={INPUT} placeholder="Juan" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
          <input name="apellido" type="text" required className={INPUT} placeholder="García" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio de tu academia</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-600">
          <input
            name="subdominio"
            type="text"
            required
            className="flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            placeholder="juangarcia"
          />
          <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 flex items-center py-2.5">
            .acepro.app
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" required autoComplete="email" className={INPUT} placeholder="juan@ejemplo.com" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input name="password" type="password" required minLength={8} className={INPUT} placeholder="Mínimo 8 caracteres" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
        <input name="passwordConfirm" type="password" required className={INPUT} placeholder="Repetí la contraseña" />
      </div>

      {/* Club (opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿En qué club trabajás? <span className="text-gray-400 font-normal">(opcional)</span>
        </label>

        {clubSeleccionado ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-green-800">{clubSeleccionado.nombre}</span>
            <button
              type="button"
              onClick={() => { setClubSeleccionado(null); setQuery("") }}
              className="text-xs text-green-600 underline"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={INPUT}
              placeholder="Buscá el nombre del club..."
            />
            {buscando && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
            {!buscando && clubes.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden">
                {clubes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setClubSeleccionado(c); setClubes([]) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold hover:bg-green-800 transition-colors disabled:opacity-60 mt-2"
      >
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  )
}
