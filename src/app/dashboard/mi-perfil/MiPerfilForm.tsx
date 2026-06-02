"use client"

import { useActionState, useState, useRef } from "react"
import { actualizarPerfilAlumno } from "./actions"
import { NivelJugador } from "@/generated/prisma/enums"

const NIVEL_LABELS: Record<NivelJugador, string> = {
  SEPTIMA: "7ma categoría",
  SEXTA: "6ta categoría",
  QUINTA: "5ta categoría",
  CUARTA: "4ta categoría",
  TERCERA: "3ra categoría",
  SEGUNDA: "2da categoría",
  PRIMERA: "1ra categoría",
}

type Props = {
  nombre: string
  apellido: string
  telefono: string
  nivelJugador: NivelJugador | null
  esMenor: boolean
  tutorNombre: string
  tutorTelefono: string
  fechaNacimiento: string
  fotoPerfil: string
  fotoGoogle: string | null
}

export default function MiPerfilForm(props: Props) {
  const [state, formAction, isPending] = useActionState(actualizarPerfilAlumno, null)
  const [esMenor, setEsMenor] = useState(props.esMenor)
  const [preview, setPreview] = useState<string | null>(props.fotoPerfil || props.fotoGoogle || null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const initials = [props.nombre, props.apellido]
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "?"

  return (
    <form action={formAction} className="space-y-5">

      {/* ── Foto de perfil ── */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group w-24 h-24 rounded-full overflow-hidden bg-green-100 border-2 border-gray-200 hover:border-green-500 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {preview ? (
            <img src={preview} alt="Foto de perfil" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-green-600">{initials}</span>
          )}
          {/* Overlay al hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </button>

        <input
          ref={fileRef}
          type="file"
          name="foto"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <p className="text-xs text-gray-400">
          Tocá la foto para cambiarla · máx. 4 MB
        </p>
        {props.fotoGoogle && !props.fotoPerfil && (
          <p className="text-xs text-gray-400">Usando foto de Google</p>
        )}
      </div>

      {/* ── Nombre y Apellido ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            defaultValue={props.nombre}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1.5">
            Apellido
          </label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            required
            defaultValue={props.apellido}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* ── Teléfono ── */}
      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1.5">
          Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          defaultValue={props.telefono}
          placeholder="+549..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {/* ── Categoría ── */}
      <div>
        <label htmlFor="nivelJugador" className="block text-sm font-medium text-gray-700 mb-1.5">
          Categoría de juego
        </label>
        <select
          id="nivelJugador"
          name="nivelJugador"
          defaultValue={props.nivelJugador ?? ""}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white"
        >
          <option value="">Sin categoría definida</option>
          {(Object.keys(NIVEL_LABELS) as NivelJugador[]).map((nivel) => (
            <option key={nivel} value={nivel}>
              {NIVEL_LABELS[nivel]}
            </option>
          ))}
        </select>
      </div>

      {/* ── Fecha de nacimiento ── */}
      <div>
        <label htmlFor="fechaNacimiento" className="block text-sm font-medium text-gray-700 mb-1.5">
          Fecha de nacimiento <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          id="fechaNacimiento"
          name="fechaNacimiento"
          type="date"
          defaultValue={props.fechaNacimiento}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {/* ── Menor de edad ── */}
      <div className="flex items-center gap-3">
        <input
          id="esMenor"
          name="esMenor"
          type="checkbox"
          defaultChecked={props.esMenor}
          onChange={(e) => setEsMenor(e.target.checked)}
          className="w-4 h-4 accent-green-700 rounded"
        />
        <label htmlFor="esMenor" className="text-sm text-gray-700">
          Es menor de edad
        </label>
      </div>

      {esMenor && (
        <div className="grid grid-cols-2 gap-4 pl-7">
          <div>
            <label htmlFor="tutorNombre" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del tutor
            </label>
            <input
              id="tutorNombre"
              name="tutorNombre"
              type="text"
              defaultValue={props.tutorNombre}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="tutorTelefono" className="block text-sm font-medium text-gray-700 mb-1.5">
              Teléfono del tutor
            </label>
            <input
              id="tutorTelefono"
              name="tutorTelefono"
              type="tel"
              defaultValue={props.tutorTelefono}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          Perfil actualizado correctamente
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  )
}
