"use client"

import { useState, useTransition, useRef } from "react"
import {
  guardarPerfil,
  guardarGaleria,
  guardarServicios,
  guardarTestimonios,
  type ServicioItem,
  type TestimonioItem,
} from "./actions"

type Tab = "perfil" | "galeria" | "servicios" | "testimonios"

type Props = {
  fotoPerfil: string
  certificaciones: string[]
  galeriaFotos: string[]
  servicios: ServicioItem[]
  testimonios: TestimonioItem[]
}

// ── Upload helper ──────────────────────────────────────────────
async function subirArchivo(file: File, carpeta: string): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("carpeta", carpeta)
  const res = await fetch("/api/upload", { method: "POST", body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Error al subir")
  return data.url as string
}

// ── ImageUploader ─────────────────────────────────────────────
function ImageUploader({
  value,
  onChange,
  label,
  carpeta,
}: {
  value: string
  onChange: (url: string) => void
  label: string
  carpeta: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    setUploading(true)
    try {
      const url = await subirArchivo(file, carpeta)
      onChange(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>

      <div className="flex items-start gap-3">
        {/* Preview */}
        <div
          className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-50 cursor-pointer hover:border-green-400 transition-colors"
          onClick={() => ref.current?.click()}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-2xl text-gray-300">📷</span>
          )}
        </div>

        <div className="flex-1">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="text-sm bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? "Subiendo..." : value ? "Cambiar foto" : "Subir foto"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="ml-2 text-xs text-red-400 hover:text-red-600"
            >
              Quitar
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP · máx 5 MB</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>

      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function LandingEditorClient(props: Props) {
  const [tab, setTab] = useState<Tab>("perfil")
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<Tab | null>(null)

  // ── Perfil state ──
  const [fotoPerfil, setFotoPerfil] = useState(props.fotoPerfil)
  const [certificaciones, setCertificaciones] = useState<string[]>(props.certificaciones)

  // ── Galería state ──
  const [galeriaFotos, setGaleriaFotos] = useState<string[]>(
    props.galeriaFotos.length >= 6 ? props.galeriaFotos : [...props.galeriaFotos, ...Array(6).fill("")].slice(0, 6)
  )

  // ── Servicios state ──
  const [servicios, setServicios] = useState<ServicioItem[]>(props.servicios)

  // ── Testimonios state ──
  const [testimonios, setTestimonios] = useState<TestimonioItem[]>(props.testimonios)

  function showSaved(t: Tab) {
    setSaved(t)
    setTimeout(() => setSaved(null), 2500)
  }

  // ── Save handlers ──
  function handleGuardarPerfil() {
    startTransition(async () => {
      await guardarPerfil({ fotoPerfil, certificaciones })
      showSaved("perfil")
    })
  }
  function handleGuardarGaleria() {
    startTransition(async () => {
      await guardarGaleria(galeriaFotos)
      showSaved("galeria")
    })
  }
  function handleGuardarServicios() {
    startTransition(async () => {
      await guardarServicios(servicios)
      showSaved("servicios")
    })
  }
  function handleGuardarTestimonios() {
    startTransition(async () => {
      await guardarTestimonios(testimonios)
      showSaved("testimonios")
    })
  }

  const TABS: { id: Tab; label: string; seccion: string }[] = [
    { id: "perfil", label: "Foto y perfil", seccion: "Sección «Sobre mí»" },
    { id: "galeria", label: "Galería", seccion: "Sección «En la cancha»" },
    { id: "servicios", label: "Servicios", seccion: "Sección «Clases»" },
    { id: "testimonios", label: "Testimonios", seccion: "Sección «Lo que dicen»" },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === t.id
                ? "border-green-700 text-green-800 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Section label */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">
          {TABS.find((t) => t.id === tab)?.seccion}
        </p>

        {/* ── TAB: PERFIL ── */}
        {tab === "perfil" && (
          <div className="space-y-6">
            <ImageUploader
              value={fotoPerfil}
              onChange={setFotoPerfil}
              label="Foto de perfil"
              carpeta="perfil"
            />

            {/* Certificaciones */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Certificaciones / logros
              </p>
              <p className="text-xs text-gray-400">
                Estos puntos aparecen como bullets en la sección «Sobre mí»
              </p>
              {certificaciones.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const copy = [...certificaciones]
                      copy[i] = e.target.value
                      setCertificaciones(copy)
                    }}
                    placeholder={`Logro ${i + 1}`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <button
                    type="button"
                    onClick={() => setCertificaciones(certificaciones.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {certificaciones.length < 6 && (
                <button
                  type="button"
                  onClick={() => setCertificaciones([...certificaciones, ""])}
                  className="text-sm text-green-700 hover:underline"
                >
                  + Agregar logro
                </button>
              )}
            </div>

            <SaveButton onClick={handleGuardarPerfil} isPending={isPending} saved={saved === "perfil"} />
          </div>
        )}

        {/* ── TAB: GALERÍA ── */}
        {tab === "galeria" && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Subí hasta 6 fotos que aparecerán en la galería de tu página.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galeriaFotos.map((url, i) => (
                <ImageUploader
                  key={i}
                  value={url}
                  onChange={(newUrl) => {
                    const copy = [...galeriaFotos]
                    copy[i] = newUrl
                    setGaleriaFotos(copy)
                  }}
                  label={`Foto ${i + 1}`}
                  carpeta="galeria"
                />
              ))}
            </div>
            <SaveButton onClick={handleGuardarGaleria} isPending={isPending} saved={saved === "galeria"} />
          </div>
        )}

        {/* ── TAB: SERVICIOS ── */}
        {tab === "servicios" && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Estos 4 cards aparecen en la sección «Clases» de tu página.
            </p>
            {servicios.map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={s.icono}
                    onChange={(e) => {
                      const copy = [...servicios]
                      copy[i] = { ...copy[i], icono: e.target.value }
                      setServicios(copy)
                    }}
                    maxLength={2}
                    className="w-14 text-center text-2xl border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                    placeholder="🎾"
                  />
                  <input
                    type="text"
                    value={s.nombre}
                    onChange={(e) => {
                      const copy = [...servicios]
                      copy[i] = { ...copy[i], nombre: e.target.value }
                      setServicios(copy)
                    }}
                    placeholder="Nombre del servicio"
                    className="flex-1 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  />
                </div>
                <textarea
                  value={s.descripcion}
                  onChange={(e) => {
                    const copy = [...servicios]
                    copy[i] = { ...copy[i], descripcion: e.target.value }
                    setServicios(copy)
                  }}
                  rows={2}
                  placeholder="Descripción del servicio..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none bg-white"
                />
              </div>
            ))}
            <SaveButton onClick={handleGuardarServicios} isPending={isPending} saved={saved === "servicios"} />
          </div>
        )}

        {/* ── TAB: TESTIMONIOS ── */}
        {tab === "testimonios" && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Hasta 3 testimonios de tus alumnos. Aparecen en la sección «Lo que dicen mis alumnos».
            </p>
            {testimonios.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <input
                    type="text"
                    value={t.nombre}
                    onChange={(e) => {
                      const copy = [...testimonios]
                      copy[i] = { ...copy[i], nombre: e.target.value }
                      setTestimonios(copy)
                    }}
                    placeholder="Nombre del alumno (ej: Martín G.)"
                    className="flex-1 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  />
                  <input
                    type="text"
                    value={t.nivel}
                    onChange={(e) => {
                      const copy = [...testimonios]
                      copy[i] = { ...copy[i], nivel: e.target.value }
                      setTestimonios(copy)
                    }}
                    placeholder="Nivel"
                    className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  />
                </div>
                <textarea
                  value={t.texto}
                  onChange={(e) => {
                    const copy = [...testimonios]
                    copy[i] = { ...copy[i], texto: e.target.value }
                    setTestimonios(copy)
                  }}
                  rows={3}
                  placeholder="Texto del testimonio..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none bg-white"
                />
              </div>
            ))}
            {testimonios.length < 3 && (
              <button
                type="button"
                onClick={() => setTestimonios([...testimonios, { nombre: "", texto: "", nivel: "" }])}
                className="text-sm text-green-700 hover:underline"
              >
                + Agregar testimonio
              </button>
            )}
            <SaveButton onClick={handleGuardarTestimonios} isPending={isPending} saved={saved === "testimonios"} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── SaveButton ─────────────────────────────────────────────────
function SaveButton({
  onClick,
  isPending,
  saved,
}: {
  onClick: () => void
  isPending: boolean
  saved: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
        saved
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-green-700 text-white hover:bg-green-800 disabled:opacity-60"
      }`}
    >
      {saved ? "✓ Guardado" : isPending ? "Guardando..." : "Guardar cambios"}
    </button>
  )
}
