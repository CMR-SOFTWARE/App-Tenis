import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { unirseAcademia } from "./actions"
import Link from "next/link"

const ERRORES: Record<string, string> = {
  profesor: "Esta cuenta es de un profesor. Usá otra cuenta de Google para unirte como alumno.",
  "not-found": "Esta academia no existe.",
}

export default async function UnirsePage({
  params,
  searchParams,
}: {
  params: Promise<{ subdominio: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { subdominio } = await params
  const { error } = await searchParams
  const session = await auth()

  const tenant = await db.tenant.findUnique({ where: { subdominio } })
  if (!tenant) notFound()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">

        <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/20">
          <span className="text-3xl">🎾</span>
        </div>

        <h1 className="text-2xl font-black text-gray-900">{tenant.nombre}</h1>
        <p className="text-gray-500 mt-2 mb-8">Te invita a unirte a su academia</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl text-left">
              {ERRORES[error] ?? "Ocurrió un error. Intentá de nuevo."}
            </div>
          )}

          {session ? (
            <form action={unirseAcademia.bind(null, subdominio)}>
              <button
                type="submit"
                className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-800 active:scale-[0.98] transition-all"
              >
                Unirme a {tenant.nombre}
              </button>
            </form>
          ) : (
            <Link
              href={`/login?callbackUrl=/unirse/${subdominio}`}
              className="block w-full bg-green-700 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-800 active:scale-[0.98] transition-all text-center"
            >
              Iniciar sesión para unirme
            </Link>
          )}

          <p className="text-xs text-gray-400">
            Usá tu cuenta de Google para registrarte gratis
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Powered by <span className="font-medium">AcePro</span>
        </p>
      </div>
    </div>
  )
}
