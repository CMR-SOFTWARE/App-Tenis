import { db } from "@/lib/db"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import Link from "next/link"

export default async function ProfesoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ciudad?: string }>
}) {
  const { q, ciudad } = await searchParams

  const profesores = await db.tenant.findMany({
    where: {
      tipo: TenantTipo.PROFESOR,
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
      ...(ciudad ? { ciudad: { contains: ciudad, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      nombre: true,
      subdominio: true,
      bio: true,
      fotoPerfil: true,
      experienciaAnios: true,
      whatsapp: true,
      ciudad: true,
      precioPorHora: true,
      _count: { select: { usuarios: { where: { rol: UserRol.STUDENT } } } },
    },
    orderBy: { nombre: "asc" },
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-xl">🎾</span>
              <span className="font-bold text-gray-900 text-lg">Cancha</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 font-medium hover:text-gray-900">
              Ingresar
            </Link>
            <Link
              href="/registro/alumno"
              className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Encontrá tu profesor</h1>
          <p className="text-gray-500">Buscá por nombre o ciudad y empezá a jugar</p>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          <div className="relative sm:w-56">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              name="ciudad"
              defaultValue={ciudad ?? ""}
              placeholder="Ciudad..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Buscar
          </button>
          {(q || ciudad) && (
            <Link
              href="/profesores"
              className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </Link>
          )}
        </form>

        {/* Resultados */}
        {profesores.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎾</div>
            <p className="text-gray-500 text-lg font-medium mb-2">
              {q || ciudad ? "No encontramos profesores con esa búsqueda" : "Todavía no hay profesores registrados"}
            </p>
            {(q || ciudad) && (
              <Link href="/profesores" className="text-green-700 text-sm hover:underline mt-2 inline-block">
                Ver todos los profesores
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5">
              {profesores.length} {profesores.length === 1 ? "profesor" : "profesores"} encontrados
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {profesores.map((p) => {
                const iniciales = p.nombre
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                const alumnosCount = p._count.usuarios

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                  >
                    {/* Avatar + nombre */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-green-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.fotoPerfil ? (
                          <img src={p.fotoPerfil} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-black text-lg">{iniciales}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 text-base leading-snug truncate">{p.nombre}</h2>
                        {p.ciudad && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <span>📍</span> {p.ciudad}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 flex-1">
                        {p.bio}
                      </p>
                    )}
                    {!p.bio && <div className="flex-1" />}

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-5">
                      {p.experienciaAnios != null && (
                        <span className="bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                          {p.experienciaAnios} años exp.
                        </span>
                      )}
                      <span className="bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
                        {alumnosCount} {alumnosCount === 1 ? "alumno" : "alumnos"}
                      </span>
                      {p.precioPorHora && (
                        <span className="bg-green-50 border border-green-100 text-green-700 rounded-full px-2.5 py-1">
                          ${Math.round(p.precioPorHora).toLocaleString("es-AR")}/h
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Link
                        href={`/unirse/${p.subdominio}`}
                        className="flex-1 text-center bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
                      >
                        Ver perfil →
                      </Link>
                      {p.whatsapp && (
                        <a
                          href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 border border-green-100 text-green-700 hover:bg-green-100 transition-colors"
                          title="WhatsApp"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer link */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">
            ¿Sos profesor?{" "}
            <Link href="/registro/profesor" className="text-green-700 font-medium hover:underline">
              Registrate gratis →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
