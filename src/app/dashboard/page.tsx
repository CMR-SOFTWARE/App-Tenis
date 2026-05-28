// Dashboard principal — página post-login
//
// IMPORTANTE: NO tiene "use client" → es un Server Component
// Ventajas:
//   - Puede llamar a auth() directamente (sin fetch ni hooks)
//   - No suma JavaScript al bundle del browser
//   - Más rápido: los datos se renderizan en el servidor

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth"

export default async function DashboardPage() {
  // auth() nos da la sesión actual del usuario
  // Como es Server Component, lo llamamos directamente sin hooks
  const session = await auth()

  // Doble protección: si por alguna razón el middleware no actuó,
  // redirigimos acá también. Siempre defender en múltiples capas.
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Barra de navegación */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">AcePro</h1>

        {/* Info del usuario + botón de logout */}
        <div className="flex items-center gap-4">
          {/* Foto de perfil de Google */}
          {session.user.image && (
            <img
              src={session.user.image}
              alt="Foto de perfil"
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-600">{session.user.email}</span>

          {/* Botón de logout — usa un form porque signOut es Server Action */}
          <form
            action={async () => {
              "use server" // esta función corre en el servidor
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="text-sm text-red-500 hover:text-red-700"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Bienvenido, {session.user.name ?? session.user.email}
        </h2>
        <p className="text-gray-500 mb-8">
          Rol: <span className="font-medium text-gray-700">{session.user.rol}</span>
        </p>

        {/* Placeholder — acá van a ir las funcionalidades reales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-1">Mis turnos</h3>
            <p className="text-gray-400 text-sm">Próximamente</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-1">Alumnos</h3>
            <p className="text-gray-400 text-sm">Próximamente</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-1">Pagos</h3>
            <p className="text-gray-400 text-sm">Próximamente</p>
          </div>
        </div>
      </main>
    </div>
  )
}
