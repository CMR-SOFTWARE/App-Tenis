// Dashboard principal — página post-login
//
// IMPORTANTE: NO tiene "use client" → es un Server Component
// Ventajas:
//   - Puede llamar a auth() directamente (sin fetch ni hooks)
//   - No suma JavaScript al bundle del browser
//   - Más rápido: los datos se renderizan en el servidor

import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) redirect("/login");

  // Leemos el usuario de la BD para tener datos frescos
  // El JWT puede estar desactualizado (ej: recién completó el onboarding)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });

  // Si no tiene academia todavía, lo mandamos al onboarding
  if (!user?.tenantId && user?.rol !== "SUPER_ADMIN") {
    redirect("/onboarding");
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
          <span className="text-sm text-gray-600">
            {user?.tenant?.nombre ?? session.user.email}
          </span>

          {/* Botón de logout — usa un form porque signOut es Server Action */}
          <form
            action={async () => {
              "use server"; // esta función corre en el servidor
              await signOut({ redirectTo: "/login" });
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
          Bienvenido, {user?.nombre ?? user?.name ?? session.user.email}
        </h2>
        <p className="text-gray-500 mb-8">
          Academia:{" "}
          <span className="font-medium text-gray-700">
            {user?.tenant?.nombre}
          </span>
          {" · "}
          Rol: <span className="font-medium text-gray-700">{user?.rol}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-1">Perfil</h3>
            <p className="text-gray-400 text-sm mb-3">
              Editá tu landing pública
            </p>
            <a
              href="/dashboard/configuracion"
              className="text-sm text-green-700 font-medium hover:underline"
            >
              Configurar →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
