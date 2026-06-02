import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AlumnoFlowClient from "./AlumnoFlowClient"

export default async function RegistroAlumnoPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <div className="mb-6">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Volver
          </a>
          <h1 className="text-2xl font-black text-gray-900 mt-3">Quiero tomar clases</h1>
          <p className="text-gray-500 text-sm mt-1">
            Encontrá tu club y tu profesor en 3 pasos
          </p>
        </div>

        <AlumnoFlowClient />

        <p className="text-xs text-gray-400 mt-6 text-center">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="text-green-700 font-medium hover:underline">
            Iniciá sesión
          </a>
        </p>
      </div>
    </div>
  )
}
