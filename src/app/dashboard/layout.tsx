import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { unstable_cache } from "next/cache"
import Image from "next/image"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import DashboardTabs from "./DashboardTabs"

type Tab = { label: string; href: string }

// Cache the user+tenant fetch per userId, 2-minute TTL.
// Eliminates the DB round-trip on every tab navigation within the dashboard.
// Invalidated by revalidateTag("user-profile") in mi-perfil and configuracion actions.
const getCachedUser = (userId: string) =>
  unstable_cache(
    () =>
      db.user.findUnique({
        where: { id: userId },
        select: {
          tenantId: true,
          nombre: true,
          name: true,
          fotoPerfil: true,
          image: true,
          tenant: { select: { tipo: true, nombre: true } },
        },
      }),
    [`dashboard-layout-user-${userId}`],
    { revalidate: 120, tags: ["user-profile"] }
  )()

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await getCachedUser(session.user.id)

  const esProfesor =
    (session.user.rol === UserRol.TENANT_OWNER || session.user.rol === UserRol.STAFF) &&
    user?.tenant?.tipo !== TenantTipo.CLUB

  const esClub = session.user.rol === UserRol.TENANT_OWNER && user?.tenant?.tipo === TenantTipo.CLUB

  // Redirects de onboarding — usan session.user (JWT) para evitar otra query
  if (session.user.rol === UserRol.TENANT_OWNER && !session.user.tenantId) {
    redirect("/onboarding")
  }
  if (session.user.rol === UserRol.STUDENT && !session.user.nivelJugador) {
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
      { label: "Servicios", href: "/dashboard/servicios" },
      { label: "Landing", href: "/dashboard/landing" },
    ]
  } else {
    // Alumno / Student
    tabs = [
      { label: "Panel", href: "/dashboard" },
      { label: "Mis turnos", href: "/dashboard/mis-turnos" },
      { label: "Servicios", href: "/dashboard/mis-servicios" },
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

  const avatarSrc = user?.fotoPerfil ?? user?.image ?? session.user.image ?? null
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
                <Image src={avatarSrc} alt={displayName} width={32} height={32} className="w-full h-full object-cover" />
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
