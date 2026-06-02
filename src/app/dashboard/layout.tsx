import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import DashboardTabs from "./DashboardTabs"

type Tab = { label: string; href: string }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  })

  const esProfesor =
    (user?.rol === UserRol.TENANT_OWNER || user?.rol === UserRol.STAFF) &&
    user?.tenant?.tipo !== TenantTipo.CLUB

  const esClub = user?.rol === UserRol.TENANT_OWNER && user?.tenant?.tipo === TenantTipo.CLUB

  // Redirects de onboarding (solo aplican a TENANT_OWNER sin tenant)
  if ((esProfesor || (user?.rol === UserRol.TENANT_OWNER && !user?.tenantId)) && !user?.tenantId) {
    redirect("/onboarding")
  }
  if (user?.rol === UserRol.STUDENT && !user?.nivelJugador) {
    redirect("/onboarding/alumno")
  }

  let tabs: Tab[]
  if (esClub) {
    tabs = [
      { label: "Panel", href: "/dashboard" },
      { label: "Profesores", href: "/dashboard/profesores" },
      { label: "Socios", href: "/dashboard/socios" },
      { label: "Canchas", href: "/dashboard/canchas" },
    ]
  } else if (esProfesor) {
    tabs = [
      { label: "Panel", href: "/dashboard" },
      { label: "Agenda", href: "/dashboard/turnos" },
      { label: "Alumnos", href: "/dashboard/alumnos" },
      { label: "Equipo", href: "/dashboard/empleados" },
      { label: "Pagos", href: "/dashboard/pagos" },
    ]
  } else {
    // Alumno / Student
    tabs = [
      { label: "Panel", href: "/dashboard" },
      { label: "Mis turnos", href: "/dashboard/mis-turnos" },
      { label: "Mi perfil", href: "/dashboard/mi-perfil" },
      { label: "Pagos", href: "/dashboard/pagos" },
    ]
  }

  const panelTitle = esProfesor
    ? "Panel del profesor"
    : esClub
    ? "Panel del club"
    : "Mi panel"

  const displayName =
    user?.tenant?.nombre ??
    user?.nombre ??
    user?.name ??
    session.user.email ??
    "Usuario"

  const avatarSrc = user?.fotoPerfil ?? user?.image ?? null
  const avatarInitials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg">🎾</span>
            <span className="font-bold text-gray-900">Cancha</span>
          </a>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{displayName}</span>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-green-700">{avatarInitials}</span>
              )}
            </div>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 py-2">{panelTitle}</h1>
          </div>
          <DashboardTabs tabs={tabs} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">{children}</main>
    </div>
  )
}
