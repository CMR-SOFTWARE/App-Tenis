"use client"

import { useState, useActionState, useEffect, useRef } from "react"
import { registrarAlumnoFlow } from "./actions"

type Club = { id: string; nombre: string; subdominio: string; bio: string | null }
type Profesor = { tenantId: string; nombre: string; bio: string | null; fotoPerfil: string | null }

const NIVELES = [
  { value: "SEPTIMA",  label: "7ma (inicial)" },
  { value: "SEXTA",    label: "6ta" },
  { value: "QUINTA",   label: "5ta" },
  { value: "CUARTA",   label: "4ta" },
  { value: "TERCERA",  label: "3ra" },
  { value: "SEGUNDA",  label: "2da" },
  { value: "PRIMERA",  label: "1ra (élite)" },
]

const INPUT_CLASS = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"

export default function AlumnoFlowClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [clubSeleccionado, setClubSeleccionado] = useState<Club | null>(null)
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<Profesor | null>(null)

  // ── PASO 1: buscar club ──────────────────────────────────
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
        const data = await res.json()
        setClubes(data)
      } finally {
        setBuscando(false)
      }
    }, 300)
  }, [query])

  // ── PASO 2: profesores del club ──────────────────────────
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [cargandoProfes, setCargandoProfes] = useState(false)

  useEffect(() => {
    if (!clubSeleccionado) return
    setCargandoProfes(true)
    fetch(`/api/clubes/${clubSeleccionado.id}/profesores`)
      .then((r) => r.json())
      .then((data) => setProfesores(data))
      .finally(() => setCargandoProfes(false))
  }, [clubSeleccionado])

  // ── PASO 3: formulario ───────────────────────────────────
  const [state, formAction, isPending] = useActionState(registrarAlumnoFlow, null)
  const [esMenor, setEsMenor] = useState(false)

  // ── STEPPER ─────────────────────────────────────────────
  const STEPS = ["Club", "Profesor", "Mis datos"]

  return (
    <div>
      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3
          const activo = step === n
          const completo = step > n
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 flex-shrink-0`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  completo ? "bg-green-700 text-white" :
                  activo   ? "bg-gray-900 text-white" :
                             "bg-gray-100 text-gray-400"
                }`}>
                  {completo ? "✓" : n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${activo ? "text-gray-900" : "text-gray-400"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${step > n ? "bg-green-700" : "bg-gray-200"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── PASO 1: Buscar club ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿En qué club tomás clases?</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Escribí el nombre del club..."
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Mínimo 2 caracteres para buscar</p>
          </div>

          {buscando && (
            <p className="text-sm text-gray-400 text-center py-3">Buscando...</p>
          )}

          {!buscando && clubes.length === 0 && query.trim().length >= 2 && (
            <p className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-xl">
              No encontramos ningún club con ese nombre
            </p>
          )}

          {clubes.length > 0 && (
            <div className="space-y-2">
              {clubes.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => { setClubSeleccionado(club); setStep(2) }}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-green-400 hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-gray-900 text-sm">{club.nombre}</p>
                  {club.bio && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{club.bio}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PASO 2: Elegir profesor ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Club: <span className="font-semibold text-gray-900">{clubSeleccionado?.nombre}</span>
            </p>
            <button
              type="button"
              onClick={() => { setStep(1); setProfesorSeleccionado(null); setProfesores([]) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Cambiar
            </button>
          </div>

          <p className="text-sm font-medium text-gray-700">¿Con qué profesor querés tomar clases?</p>

          {cargandoProfes && (
            <p className="text-sm text-gray-400 text-center py-4">Cargando profesores...</p>
          )}

          {!cargandoProfes && profesores.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-sm text-yellow-800">Este club todavía no tiene profesores registrados en AcePro.</p>
              <p className="text-xs text-yellow-600 mt-1">Contactá al club para más información.</p>
            </div>
          )}

          {profesores.map((profe) => {
            const iniciales = profe.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
            return (
              <button
                key={profe.tenantId}
                type="button"
                onClick={() => { setProfesorSeleccionado(profe); setStep(3) }}
                className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-green-400 hover:shadow-sm transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profe.fotoPerfil ? (
                    <img src={profe.fotoPerfil} alt={profe.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{iniciales}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{profe.nombre}</p>
                  {profe.bio && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{profe.bio}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── PASO 3: Datos personales ── */}
      {step === 3 && (
        <form action={formAction} className="space-y-4">
          {/* Hidden: ID del tenant del profesor */}
          <input type="hidden" name="profesorTenantId" value={profesorSeleccionado?.tenantId ?? ""} />

          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
            <p className="text-green-700 font-medium">Profesor elegido</p>
            <p className="text-green-800 font-semibold">{profesorSeleccionado?.nombre}</p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-green-600 underline mt-0.5"
            >
              Cambiar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input name="nombre" type="text" required className={INPUT_CLASS} placeholder="Juan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input name="apellido" type="text" required className={INPUT_CLASS} placeholder="García" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required autoComplete="email" className={INPUT_CLASS} placeholder="juan@ejemplo.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input name="password" type="password" required minLength={8} className={INPUT_CLASS} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
            <input name="passwordConfirm" type="password" required className={INPUT_CLASS} placeholder="Repetí la contraseña" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
            <input name="telefono" type="tel" className={INPUT_CLASS} placeholder="+54 336 428 7306" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría de juego</label>
            <select name="nivelJugador" defaultValue="" className={`${INPUT_CLASS} bg-white`}>
              <option value="">No sé mi categoría (7ma por defecto)</option>
              {NIVELES.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="esMenorFlow"
              name="esMenor"
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-green-600"
              onChange={(e) => setEsMenor(e.target.checked)}
            />
            <label htmlFor="esMenorFlow" className="text-sm text-gray-700">
              Es menor de edad (el padre/tutor completa el registro)
            </label>
          </div>

          {esMenor && (
            <div className="space-y-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-800">Datos del padre / tutor</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del tutor</label>
                <input name="tutorNombre" type="text" required={esMenor} className={INPUT_CLASS} placeholder="María García" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono del tutor</label>
                <input name="tutorTelefono" type="tel" className={INPUT_CLASS} placeholder="+54 336 428 7306" />
              </div>
            </div>
          )}

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
      )}
    </div>
  )
}
