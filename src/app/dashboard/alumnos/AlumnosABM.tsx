"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlumnoEstado, ModalidadClase, NivelJugador, TipoDocumento } from "@/generated/prisma/enums"
import { crearAlumno, editarAlumno, cambiarEstadoAlumno, cancelarTurnoAlumno } from "./actions"

export type AlumnoRow = {
  id: string
  nombre: string | null
  apellido: string | null
  email: string
  fechaNacimiento: string | null
  tipoDocumento: TipoDocumento | null
  nroDocumento: string | null
  nivelJugador: NivelJugador | null
  modalidadClase: ModalidadClase | null
  clubNombre: string | null
  telefono: string | null
  alumnoEstado: AlumnoEstado | null
  esMenor: boolean
  tutorNombre: string | null
  tutorTelefono: string | null
  turno: string | null
}

type Props = {
  alumnos: AlumnoRow[]
  clubSugerencias: string[]
}

const ESTADO_STYLE: Record<AlumnoEstado, string> = {
  ACTIVO:     "bg-green-100 text-green-700",
  STANDBY:    "bg-yellow-100 text-yellow-700",
  SUSPENDIDO: "bg-red-100 text-red-600",
  INACTIVO:   "bg-gray-100 text-gray-500",
}
const ESTADO_LABEL: Record<AlumnoEstado, string> = {
  ACTIVO: "Activo", STANDBY: "Pendiente", SUSPENDIDO: "Debe", INACTIVO: "Inactivo",
}
const NIVEL_LABEL: Record<NivelJugador, string> = {
  SEPTIMA: "7ma", SEXTA: "6ta", QUINTA: "5ta",
  CUARTA: "4ta", TERCERA: "3ra", SEGUNDA: "2da", PRIMERA: "1ra",
}

function calcEdad(fechaStr: string): number | null {
  if (!fechaStr) return null
  const hoy = new Date()
  const nac = new Date(fechaStr + "T00:00:00")
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
  return isNaN(edad) ? null : edad
}

const INPUT = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
const LABEL = "block text-sm font-medium text-gray-700 mb-1"

export default function AlumnosABM({ alumnos, clubSugerencias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AlumnoRow | null>(null)
  const [fechaNac, setFechaNac] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const edad = calcEdad(fechaNac)
  const esMenor = edad !== null && edad < 18

  function abrirCrear() {
    setEditing(null); setFechaNac(""); setFormError(null); setDrawerOpen(true)
  }
  function abrirEditar(a: AlumnoRow) {
    setEditing(a); setFechaNac(a.fechaNacimiento ?? ""); setFormError(null); setDrawerOpen(true)
  }
  function cerrarDrawer() { setDrawerOpen(false); setEditing(null) }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editing) fd.set("alumnoId", editing.id)
    setFormError(null)
    startTransition(async () => {
      const result = editing
        ? await editarAlumno(null, fd)
        : await crearAlumno(null, fd)
      if (result?.error) { setFormError(result.error); return }
      cerrarDrawer()
      router.refresh()
    })
  }

  function handleEstado(id: string, estado: AlumnoEstado) {
    startTransition(async () => { await cambiarEstadoAlumno(id, estado); router.refresh() })
  }
  function handleCancelarTurno(id: string) {
    startTransition(async () => { await cancelarTurnoAlumno(id); router.refresh() })
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alumnos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{alumnos.length} registrados</p>
        </div>
        <button
          onClick={abrirCrear}
          className="px-4 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-colors"
        >
          + Nuevo alumno
        </button>
      </div>

      {/* ── Lista ── */}
      {alumnos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-4">🎾</p>
          <p className="font-semibold text-gray-700 mb-1">Todavía no tenés alumnos</p>
          <p className="text-sm text-gray-400 mb-6">
            Dá de alta a tus alumnos para asignarles horarios en el calendario.
          </p>
          <button
            onClick={abrirCrear}
            className="px-5 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-colors"
          >
            + Dar de alta primer alumno
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Table header — solo desktop */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Alumno</span>
            <span>Categoría · Club</span>
            <span>Modalidad</span>
            <span>Turno</span>
            <span>Estado</span>
            <span />
          </div>

          {alumnos.map((a) => {
            const estado = a.alumnoEstado ?? AlumnoEstado.STANDBY
            const nombreCompleto = [a.apellido, a.nombre].filter(Boolean).join(", ") || a.email

            const AccionesMenu = () => (
              <div className="relative group">
                <button className="text-xs font-medium text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  ···
                </button>
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {estado === AlumnoEstado.STANDBY && (
                    <button onClick={() => handleEstado(a.id, AlumnoEstado.ACTIVO)} disabled={isPending}
                      className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 rounded-t-xl transition-colors">
                      Confirmar pago
                    </button>
                  )}
                  {estado === AlumnoEstado.ACTIVO && (
                    <button onClick={() => handleEstado(a.id, AlumnoEstado.SUSPENDIDO)} disabled={isPending}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-t-xl transition-colors">
                      Suspender
                    </button>
                  )}
                  {estado === AlumnoEstado.SUSPENDIDO && (
                    <button onClick={() => handleEstado(a.id, AlumnoEstado.ACTIVO)} disabled={isPending}
                      className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 rounded-t-xl transition-colors">
                      Reactivar
                    </button>
                  )}
                  {a.turno && (
                    <button onClick={() => handleCancelarTurno(a.id)} disabled={isPending}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors">
                      Cancelar turno
                    </button>
                  )}
                  <button onClick={() => handleEstado(a.id, AlumnoEstado.INACTIVO)} disabled={isPending}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-t border-gray-100 rounded-b-xl transition-colors">
                    Dar de baja
                  </button>
                </div>
              </div>
            )

            return (
              <div key={a.id} className="border-b border-gray-50 last:border-0">
                {/* ── Mobile card ── */}
                <div className="md:hidden px-4 py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {nombreCompleto}
                        {a.esMenor && (
                          <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full align-middle">
                            Menor
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {a.tipoDocumento && a.nroDocumento ? `${a.tipoDocumento} ${a.nroDocumento}` : a.email}
                        {a.telefono && ` · ${a.telefono}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_STYLE[estado]}`}>
                      {ESTADO_LABEL[estado]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                    {a.nivelJugador && (
                      <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {NIVEL_LABEL[a.nivelJugador]}
                      </span>
                    )}
                    {a.clubNombre && <span className="text-xs text-gray-500">{a.clubNombre}</span>}
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-600">
                      {a.modalidadClase === ModalidadClase.PARTICULAR ? "Particular" : "Mensual"}
                    </span>
                    {a.turno && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-600">{a.turno}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => abrirEditar(a)}
                      className="flex-1 text-sm font-medium text-gray-600 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                      Editar
                    </button>
                    <AccionesMenu />
                  </div>
                </div>

                {/* ── Desktop table row ── */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {nombreCompleto}
                      {a.esMenor && <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Menor</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {a.tipoDocumento && a.nroDocumento ? `${a.tipoDocumento} ${a.nroDocumento}` : a.email}
                      {a.telefono && <span className="ml-2">· {a.telefono}</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {a.nivelJugador && (
                      <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {NIVEL_LABEL[a.nivelJugador]}
                      </span>
                    )}
                    {a.clubNombre && <span className="text-xs text-gray-500 truncate max-w-[100px]">{a.clubNombre}</span>}
                  </div>
                  <span className="text-sm text-gray-600">
                    {a.modalidadClase === ModalidadClase.PARTICULAR ? "Particular" : "Mensual"}
                  </span>
                  <span className="text-sm text-gray-600">{a.turno ?? <span className="text-gray-300">—</span>}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${ESTADO_STYLE[estado]}`}>
                    {ESTADO_LABEL[estado]}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => abrirEditar(a)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      Editar
                    </button>
                    <AccionesMenu />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Drawer ── */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ${drawerOpen ? "visible" : "invisible"}`}>
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={cerrarDrawer}
        />

        {/* Panel */}
        <div
          className={`relative z-10 w-full md:max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Editar alumno" : "Nuevo alumno"}
              </h2>
              <button
                type="button"
                onClick={cerrarDrawer}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Apellido *</label>
                  <input
                    name="apellido"
                    required
                    defaultValue={editing?.apellido ?? ""}
                    placeholder="García"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Nombre *</label>
                  <input
                    name="nombre"
                    required
                    defaultValue={editing?.nombre ?? ""}
                    placeholder="Juan"
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <label className={LABEL}>
                  Fecha de nacimiento *
                  {edad !== null && (
                    <span className={`ml-2 font-normal text-xs px-2 py-0.5 rounded-full ${esMenor ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                      {edad} años{esMenor ? " · Menor" : ""}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={fechaNac}
                  onChange={(e) => setFechaNac(e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Tipo y Nro de documento */}
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <div>
                  <label className={LABEL}>Tipo doc. *</label>
                  <select name="tipoDocumento" required defaultValue={editing?.tipoDocumento ?? "DNI"} className={INPUT}>
                    {Object.values(TipoDocumento).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Nro de documento *</label>
                  <input
                    name="nroDocumento"
                    required
                    defaultValue={editing?.nroDocumento ?? ""}
                    placeholder="12345678"
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Categoría y Club */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Categoría</label>
                  <select name="nivelJugador" defaultValue={editing?.nivelJugador ?? ""} className={INPUT}>
                    <option value="">Sin categoría</option>
                    {Object.values(NivelJugador).map((n) => (
                      <option key={n} value={n}>{NIVEL_LABEL[n]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Club</label>
                  <input
                    name="clubNombre"
                    list="club-sugerencias"
                    defaultValue={editing?.clubNombre ?? ""}
                    placeholder="Nombre del club"
                    className={INPUT}
                  />
                  <datalist id="club-sugerencias">
                    {clubSugerencias.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Modalidad */}
              <div>
                <label className={LABEL}>Modalidad</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: ModalidadClase.MENSUAL, label: "Mensual", desc: "Turno fijo semanal" },
                    { value: ModalidadClase.PARTICULAR, label: "Particular", desc: "Por clase, sin turno fijo" },
                  ].map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-green-400 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50"
                    >
                      <input
                        type="radio"
                        name="modalidadClase"
                        value={value}
                        defaultChecked={(editing?.modalidadClase ?? ModalidadClase.MENSUAL) === value}
                        className="mt-0.5 accent-green-700"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className={LABEL}>Teléfono</label>
                <input
                  name="telefono"
                  type="tel"
                  defaultValue={editing?.telefono ?? ""}
                  placeholder="+54 336 000 0000"
                  className={INPUT}
                />
              </div>

              {/* Email (opcional) */}
              <div>
                <label className={LABEL}>
                  Email <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editing?.email?.endsWith("@alumno.cancha.app") ? "" : (editing?.email ?? "")}
                  placeholder="juan@gmail.com"
                  className={INPUT}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si no ingresás un email, se genera uno automático a partir del documento.
                </p>
              </div>

              {/* Contraseña */}
              <div>
                <label className={LABEL}>
                  Contraseña{editing ? <span className="font-normal text-gray-400"> (dejar vacío para no cambiar)</span> : " *"}
                </label>
                <input
                  name="password"
                  type="password"
                  required={!editing}
                  placeholder={editing ? "••••••••" : "Mínimo 6 caracteres"}
                  autoComplete="new-password"
                  className={INPUT}
                />
              </div>

              {/* Menor de edad */}
              {esMenor && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-yellow-800">Datos del tutor / responsable</p>
                  <div>
                    <label className={LABEL}>Nombre del tutor</label>
                    <input
                      name="tutorNombre"
                      defaultValue={editing?.tutorNombre ?? ""}
                      placeholder="María García"
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Teléfono del tutor</label>
                    <input
                      name="tutorTelefono"
                      type="tel"
                      defaultValue={editing?.tutorTelefono ?? ""}
                      placeholder="+54 336 000 0000"
                      className={INPUT}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 shrink-0">
              {formError && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {formError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cerrarDrawer}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-60"
                >
                  {isPending ? "Guardando..." : editing ? "Guardar cambios" : "Dar de alta"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
