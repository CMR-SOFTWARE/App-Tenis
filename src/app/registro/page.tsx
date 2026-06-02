import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import RegistroForm from "./RegistroForm"

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session) redirect("/dashboard")

  const { callbackUrl } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">AcePro</h1>
          <p className="text-gray-500 mt-1">Creá tu cuenta para reservar clases</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <RegistroForm callbackUrl={callbackUrl ?? "/dashboard"} />
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="text-green-700 font-medium hover:underline">
            Iniciá sesión
          </a>
        </p>
      </div>
    </div>
  )
}
