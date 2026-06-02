import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserRol } from "@/generated/prisma/enums"
import { db } from "@/lib/db"
import PerfilAlumnoForm from "./PerfilAlumnoForm"

export default async function OnboardingAlumnoPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  // Solo para alumnos
  if (session.user.rol !== UserRol.STUDENT) redirect("/dashboard")

  // Si ya tiene nivel, no necesita este paso
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { nivelJugador: true, name: true },
  })
  if (user?.nivelJugador) redirect("/dashboard")

  const { callbackUrl } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-900">Completá tu perfil</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Necesitamos algunos datos antes de que puedas reservar clases
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <PerfilAlumnoForm
            nombreGoogle={user?.name ?? null}
            callbackUrl={callbackUrl ?? "/dashboard"}
          />
        </div>
      </div>
    </div>
  )
}
