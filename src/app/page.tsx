// Landing pública del profesor — Server Component
//
// Lee el subdominio del header x-subdominio (inyectado por proxy.ts).
// Si hay subdominio, busca el tenant en la BD y muestra sus datos reales.
// Si el subdominio no existe en la BD, retorna 404.
// Si no hay subdominio (localhost, dominio principal), muestra placeholder.

import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ subdominio?: string }>
}) {
  const headersList = await headers()
  const params = await searchParams
  // En producción el subdominio viene del header (inyectado por proxy.ts)
  // En desarrollo se puede pasar como ?subdominio=xxx para probar sin dominio real
  const subdominio = headersList.get("x-subdominio") ?? params.subdominio ?? null

  // Buscar tenant en BD solo si hay subdominio
  let tenant: Awaited<ReturnType<typeof db.tenant.findUnique>> = null
  if (subdominio) {
    tenant = await db.tenant.findUnique({ where: { subdominio } })
    if (!tenant) notFound()
  }

  // Traer los slots activos del tenant para mostrarlos en la landing
  const slots = tenant
    ? await db.scheduleSlot.findMany({
        where: { tenantId: tenant.id, activo: true },
        orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      })
    : []

  // Sin subdominio → landing central de AcePro
  if (!subdominio) {
    return <LandingCentral />
  }

  // Datos del tenant (profesor o club)
  const nombre = tenant!.nombre
  const bio = tenant!.bio ?? ""
  const experienciaAnios = tenant!.experienciaAnios ?? 0
  const whatsapp = tenant!.whatsapp ?? null
  const fotoPerfil = tenant!.fotoPerfil ?? null

  const iniciales = nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  const subtitulo = experienciaAnios
    ? `Coach certificado · ${experienciaAnios} años de experiencia`
    : "Coach certificado"

  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

  const stats = [
    { valor: "200+", etiqueta: "Alumnos formados" },
    { valor: experienciaAnios ? String(experienciaAnios) : "—", etiqueta: "Años de experiencia" },
    { valor: "3", etiqueta: "Clubes asociados" },
    { valor: "AAT", etiqueta: "Certificación" },
  ]

  const servicios = [
    {
      nombre: "Clases individuales",
      descripcion:
        "Atención personalizada para trabajar en los aspectos técnicos y tácticos de tu juego.",
      icono: "🎾",
    },
    {
      nombre: "Clases grupales",
      descripcion:
        "Grupos reducidos de 3 a 5 alumnos de nivel similar. Más dinámica, misma calidad.",
      icono: "👥",
    },
    {
      nombre: "Preparación física",
      descripcion:
        "Entrenamiento físico específico para el tenis: agilidad, velocidad y resistencia.",
      icono: "💪",
    },
    {
      nombre: "Torneos y competencia",
      descripcion:
        "Preparación específica para competidores. Análisis táctico y manejo de la presión.",
      icono: "🏆",
    },
  ]

  const testimonios = [
    {
      nombre: "Martín G.",
      texto:
        "Después de 2 años mejoré muchísimo mi técnica y empecé a competir en torneos locales. Muy recomendable.",
      nivel: "Intermedio",
    },
    {
      nombre: "Laura S.",
      texto:
        "Empecé de cero a los 35 años y en 6 meses ya juego con mis amigas. Tiene mucha paciencia y explica muy bien.",
      nivel: "Principiante",
    },
    {
      nombre: "Federico M.",
      texto:
        "El mejor profesor que tuve. Se nota que le apasiona el deporte y eso se contagia en cada clase.",
      nivel: "Avanzado",
    },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-black">{iniciales}</span>
            </div>
            <span className="font-bold text-gray-900">{nombre}</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#sobre-mi" className="hover:text-green-700 transition-colors">Sobre mí</a>
            <a href="#servicios" className="hover:text-green-700 transition-colors">Clases</a>
            <a href="#testimonios" className="hover:text-green-700 transition-colors">Testimonios</a>
            <a href="#contacto" className="hover:text-green-700 transition-colors">Contacto</a>
          </div>

          <Link
            href="/login"
            className="bg-green-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Registrate
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-950" />

        {/* Líneas decorativas que imitan la cancha */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute top-0 left-0 right-0 h-[28%] border-b-2 border-white" />
          <div className="absolute bottom-0 left-0 right-0 h-[28%] border-t-2 border-white" />
          <div className="absolute left-[8%] top-0 bottom-0 w-px bg-white" />
          <div className="absolute right-[8%] top-0 bottom-0 w-px bg-white" />
        </div>

        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto pt-20">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8 text-sm font-medium">
            <span>🎾</span>
            <span>Profesor de Tenis</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tight leading-none">
            {nombre}
          </h1>

          <p className="text-xl md:text-2xl text-green-200 mb-5 font-medium">
            {subtitulo}
          </p>

          <p className="text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed text-lg">
            {bio}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
            >
              Registrate →
            </Link>
            <a
              href="#sobre-mi"
              className="border border-white/30 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-colors"
            >
              Conocer más
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 animate-bounce">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── BARRA DE STATS ── */}
      <section className="bg-yellow-400 py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.etiqueta} className="text-center">
              <div className="text-3xl font-black text-gray-900">{stat.valor}</div>
              <div className="text-sm font-medium text-yellow-900 mt-1">{stat.etiqueta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOBRE MÍ ── */}
      <section id="sobre-mi" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          <div className="relative">
            <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-green-700 to-green-950 flex items-center justify-center overflow-hidden">
              {fotoPerfil ? (
                <img
                  src={fotoPerfil}
                  alt={`Foto de ${nombre}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-white/30">
                  <svg className="w-24 h-24 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-sm font-medium">Foto del profesor</p>
                </div>
              )}
            </div>
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-yellow-400 rounded-2xl -z-10" />
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-green-100 rounded-2xl -z-10" />
          </div>

          <div>
            <span className="text-green-700 font-semibold text-sm uppercase tracking-wider">
              Sobre mí
            </span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-6 leading-tight">
              Pasión por el tenis, dedicación a tus resultados
            </h2>
            <p className="text-gray-500 leading-relaxed mb-5">{bio}</p>
            <p className="text-gray-500 leading-relaxed mb-8">
              Mi metodología combina el trabajo técnico con el disfrute del juego.
              Creo que cada alumno aprende diferente, por eso adapto las clases a cada persona y a sus objetivos.
            </p>

            <div className="flex flex-col gap-3">
              {[
                "Certificado por la Asociación Argentina de Tenis (AAT)",
                "Especialización en tenis juvenil y adultos",
                "Experiencia en competencia profesional nacional",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-700 font-semibold text-sm uppercase tracking-wider">
              Clases
            </span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">
              ¿Qué modalidad se adapta a vos?
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">
              Distintas modalidades para que puedas elegir la que mejor se ajusta a tu nivel, disponibilidad y objetivos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {servicios.map((servicio) => (
              <div
                key={servicio.nombre}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                <div className="text-4xl mb-4">{servicio.icono}</div>
                <h3 className="font-bold text-gray-900 mb-2">{servicio.nombre}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{servicio.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALERÍA ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-700 font-semibold text-sm uppercase tracking-wider">
              Galería
            </span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">En la cancha</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "from-green-700 to-green-900",
              "from-green-800 to-emerald-950",
              "from-emerald-600 to-green-800",
              "from-green-900 to-teal-900",
              "from-teal-700 to-green-800",
              "from-green-700 to-emerald-900",
            ].map((gradient, i) => (
              <div
                key={i}
                className={`aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
              >
                <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section id="testimonios" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-green-700 font-semibold text-sm uppercase tracking-wider">
              Testimonios
            </span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">
              Lo que dicen mis alumnos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonios.map((t) => (
              <div key={t.nombre} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-gray-500 leading-relaxed mb-6 italic">
                  &ldquo;{t.texto}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-sm">{t.nombre[0]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.nombre}</div>
                    <div className="text-gray-400 text-xs">{t.nivel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TURNOS DISPONIBLES ── */}
      {slots.length > 0 && (
        <section id="turnos" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-green-700 font-semibold text-sm uppercase tracking-wider">
                Horarios
              </span>
              <h2 className="text-4xl font-black text-gray-900 mt-2">Reservá tu turno</h2>
              <p className="text-gray-400 mt-4">
                Elegí el día y horario que más te convenga
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-green-700 font-semibold text-sm mb-2">
                    {DIAS[slot.diaSemana]}
                  </div>
                  <div className="text-3xl font-black text-gray-900">{slot.horaInicio}</div>
                  <div className="text-gray-400 text-sm mt-1">{slot.duracionMin} minutos</div>
                  <a
                    href={`/reservar/${slot.id}`}
                    className="mt-5 block text-center bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
                  >
                    Reservar →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FINAL ── */}
      <section className="py-28 px-6 bg-gradient-to-br from-green-900 via-green-800 to-emerald-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            ¿Listo para mejorar tu juego?
          </h2>
          <p className="text-green-200 text-xl mb-10">
            Creá tu cuenta y empezá a gestionar tus turnos hoy.
          </p>
          <Link
            href="/login"
            className="inline-block bg-yellow-400 text-gray-900 px-10 py-5 rounded-full font-bold text-lg hover:bg-yellow-300 transition-colors shadow-xl shadow-black/20"
          >
            Registrate →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contacto" className="bg-gray-950 text-gray-500 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-white font-bold mb-1">{nombre}</div>
            <div className="text-sm">Profesor de Tenis</div>
          </div>

          {whatsapp && (
            <div className="text-sm text-center">
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-400 transition-colors"
              >
                WhatsApp: {whatsapp}
              </a>
            </div>
          )}

          <div className="text-xs text-gray-700">
            Powered by{" "}
            <span className="text-gray-500 font-medium">Cancha</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LANDING CENTRAL — cancha.app sin subdominio
// ─────────────────────────────────────────────────────────────
function LandingCentral() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <span className="font-bold text-gray-900 text-lg">Cancha</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/profesores" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Profesores
            </Link>
            <Link href="/ranking" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Ranking
            </Link>
            <Link href="/marketplace" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Marketplace
            </Link>
            <Link href="/?subdominio=demo" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Profesor demo
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 font-medium hover:text-gray-900 transition-colors">
              Ingresar
            </Link>
            <Link
              href="/registro/profesor"
              className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="text-5xl mb-6">🎾</div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-5 leading-tight">
            Tu deporte, en una sola plataforma
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Reservá clases con profesores, gestioná tu club, seguí el ranking local y comprá en el marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/registro/profesor"
              className="bg-green-700 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-green-800 transition-colors"
            >
              Empezar gratis
            </Link>
            <Link
              href="/ranking"
              className="border border-gray-300 text-gray-700 px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Ver ranking
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Profesores</h3>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Publicá tu agenda, gestioná alumnos y cobrá clases o mensualidades con Mercado Pago.
            </p>
            <Link href="/registro/profesor" className="text-sm text-green-700 font-medium hover:underline">
              Soy profesor →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Jugadores</h3>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Reservá turnos, cancelá con anticipación y recibí recordatorios por WhatsApp.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/profesores" className="text-sm text-green-700 font-medium hover:underline">
                Buscar un profesor →
              </Link>
              <Link href="/registro/alumno" className="text-sm text-gray-500 hover:underline">
                Registrarme como jugador →
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Clubes</h3>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Administrá canchas, socios y múltiples profesores desde un panel unificado.
            </p>
            <Link href="/registro/club" className="text-sm text-green-700 font-medium hover:underline">
              Soy club →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-sm text-gray-400">© 2026 Cancha · Plataforma integral de deportes</p>
      </footer>
    </div>
  )
}
