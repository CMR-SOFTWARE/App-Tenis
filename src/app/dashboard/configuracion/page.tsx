// Server Component — lee los datos actuales del Tenant y los pasa al formulario

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import ConfiguracionForm from "./ConfiguracionForm"

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Traemos el tenant del usuario para pre-llenar el formulario con los valores actuales
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  })

  if (!user?.tenant) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Barra de navegación */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </a>
        <h1 className="text-lg font-bold text-gray-900">Configurar perfil</h1>
      </nav>

      <main className="max-w-2xl mx-auto p-8">
        <p className="text-gray-500 mb-8 text-sm">
          Estos datos aparecen en tu landing pública:{" "}
          <span className="font-medium text-gray-700">{user.tenant.subdominio}.acepro.app</span>
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <ConfiguracionForm tenant={user.tenant} />
        </div>
      </main>
    </div>
  )
}
