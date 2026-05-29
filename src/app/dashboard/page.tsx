import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { UserRol } from "@/generated/prisma/enums"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  })

  // Solo los profesores (TENANT_OWNER / STAFF) necesitan completar el onboarding
  // Los alumnos y el super admin entran directo al dashboard
  const esProfesor = user?.rol === UserRol.TENANT_OWNER || user?.rol === UserRol.STAFF
  if (esProfesor && !user?.tenantId) redirect("/onboarding")

  const esAlumno = user?.rol === UserRol.STUDENT

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">AcePro</h1>

        <div className="flex items-center gap-4">
          {session.user.image && (
            <img src={session.user.image} alt="Foto de perfil" className="w-8 h-8 rounded-full" />
          )}
          <span className="text-sm text-gray-600">
            {user?.tenant?.nombre ?? session.user.email}
          </span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button type="submit" className="text-sm text-red-500 hover:text-red-700">
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Bienvenido, {user?.nombre ?? user?.name ?? session.user.email}
        </h2>
        <p className="text-gray-500 mb-8">
          {user?.tenant?.nombre && (
            <>Academia: <span className="font-medium text-gray-700">{user.tenant.nombre}</span> · </>
          )}
          Rol: <span className="font-medium text-gray-700">{user?.rol}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Card "Mis turnos" — distinto según rol */}
          {esAlumno ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-1">Mis turnos</h3>
              <p className="text-gray-400 text-sm mb-3">Tus próximas clases</p>
              <a href="/dashboard/mis-turnos" className="text-sm text-green-700 font-medium hover:underline">
                Ver mis turnos →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-1">Turnos</h3>
              <p className="text-gray-400 text-sm mb-3">Gestioná tus horarios</p>
              <a href="/dashboard/turnos" className="text-sm text-green-700 font-medium hover:underline">
                Gestionar →
              </a>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-1">Alumnos</h3>
            <p className="text-gray-400 text-sm">Próximamente</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-1">Pagos</h3>
            <p className="text-gray-400 text-sm">Próximamente</p>
          </div>

          {/* Solo el profe ve la configuración */}
          {!esAlumno && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-1">Perfil</h3>
              <p className="text-gray-400 text-sm mb-3">Editá tu landing pública</p>
              <a href="/dashboard/configuracion" className="text-sm text-green-700 font-medium hover:underline">
                Configurar →
              </a>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
