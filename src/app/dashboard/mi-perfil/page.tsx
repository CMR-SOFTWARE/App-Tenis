import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { UserRol } from "@/generated/prisma/enums"
import MiPerfilForm from "./MiPerfilForm"

export default async function MiPerfilPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      tenant: {
        select: { nombre: true, subdominio: true, ciudad: true, whatsapp: true },
      },
    },
  })

  if (!user || user.rol !== UserRol.STUDENT) redirect("/dashboard")

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Mi perfil</h2>
        <p className="text-sm text-gray-500 mt-1">Tus datos personales y tu nivel de juego</p>
      </div>

      {/* Mi profesor */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Mi profesor</h3>
        {user.tenant ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800">{user.tenant.nombre}</p>
              {user.tenant.ciudad && (
                <p className="text-xs text-gray-400 mt-0.5">📍 {user.tenant.ciudad}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user.tenant.whatsapp && (
                <a
                  href={`https://wa.me/${user.tenant.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                >
                  WhatsApp
                </a>
              )}
              <a
                href={`/?subdominio=${user.tenant.subdominio}`}
                className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ver perfil →
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-400">Todavía no estás inscrito con ningún profesor</p>
            <a
              href="/profesores"
              className="text-sm text-green-700 border border-green-200 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              Buscar profesor →
            </a>
          </div>
        )}
      </div>

      {/* Formulario de datos personales */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-5">Datos personales</h3>
        <MiPerfilForm
          nombre={user.nombre ?? ""}
          apellido={user.apellido ?? ""}
          telefono={user.telefono ?? ""}
          nivelJugador={user.nivelJugador ?? null}
          esMenor={user.esMenor}
          tutorNombre={user.tutorNombre ?? ""}
          tutorTelefono={user.tutorTelefono ?? ""}
          fechaNacimiento={
            user.fechaNacimiento
              ? user.fechaNacimiento.toISOString().slice(0, 10)
              : ""
          }
          fotoPerfil={user.fotoPerfil ?? ""}
          fotoGoogle={user.image ?? null}
        />
      </div>
    </div>
  )
}
