// Página de onboarding — Server Component
//
// Se ejecuta en el servidor, puede usar auth() y Prisma directamente.
// Si el usuario ya tiene academia, lo redirigimos al dashboard sin mostrar nada.

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import OnboardingForm from "./OnboardingForm"

export default async function OnboardingPage() {
  const session = await auth()

  // Si no está logueado, lo mandamos al login
  if (!session) redirect("/login")

  // Consultamos la BD para verificar si ya tiene academia
  // No confiamos solo en el JWT porque puede estar desactualizado
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })

  // Si ya tiene academia, no hay nada que hacer acá
  if (user?.tenantId) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎾</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            Bienvenido a AcePro
          </h1>
          <p className="text-gray-500 mt-2">
            {session.user.name
              ? `Hola, ${session.user.name.split(" ")[0]}. `
              : ""}
            Configurá tu academia en 2 pasos.
          </p>
        </div>

        {/* Card del formulario */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Datos de tu academia
          </h2>

          <OnboardingForm userName={session.user.name} />
        </div>

        {/* Nota al pie */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Esto se puede cambiar después desde la configuración.
        </p>
      </div>
    </div>
  )
}
