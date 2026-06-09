import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import LandingEditorClient from "./LandingEditorClient"
import type { ServicioItem, TestimonioItem } from "./actions"

const SERVICIOS_DEFAULT: ServicioItem[] = [
  { icono: "🎾", nombre: "Clases individuales", descripcion: "Atención personalizada para trabajar en los aspectos técnicos y tácticos de tu juego." },
  { icono: "👥", nombre: "Clases grupales", descripcion: "Grupos reducidos de 3 a 5 alumnos de nivel similar. Más dinámica, misma calidad." },
  { icono: "💪", nombre: "Preparación física", descripcion: "Entrenamiento físico específico para el tenis: agilidad, velocidad y resistencia." },
  { icono: "🏆", nombre: "Torneos y competencia", descripcion: "Preparación específica para competidores. Análisis táctico y manejo de la presión." },
]

const TESTIMONIOS_DEFAULT: TestimonioItem[] = [
  { nombre: "Martín G.", texto: "Después de 2 años mejoré muchísimo mi técnica y empecé a competir en torneos locales.", nivel: "Intermedio" },
  { nombre: "Laura S.", texto: "Empecé de cero a los 35 años y en 6 meses ya juego con mis amigas. Tiene mucha paciencia.", nivel: "Principiante" },
  { nombre: "Federico M.", texto: "El mejor profesor que tuve. Se nota que le apasiona el deporte y eso se contagia.", nivel: "Avanzado" },
]

const CERTIFICACIONES_DEFAULT = [
  "Certificado por la Asociación Argentina de Tenis (AAT)",
  "Especialización en tenis juvenil y adultos",
  "Experiencia en competencia profesional nacional",
]

export default async function LandingEditorPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, tenantId: true, tenant: { select: { tipo: true } } },
  })

  const esProfesor =
    (user?.rol === UserRol.TENANT_OWNER || user?.rol === UserRol.STAFF) &&
    user?.tenant?.tipo !== TenantTipo.CLUB

  if (!esProfesor || !user?.tenantId) redirect("/dashboard")

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      subdominio: true,
      fotoPerfil: true,
      certificaciones: true,
      galeriaFotos: true,
      landingServicios: true,
      landingTestimonios: true,
    },
  })

  if (!tenant) redirect("/dashboard")

  const servicios: ServicioItem[] =
    Array.isArray(tenant.landingServicios) && tenant.landingServicios.length > 0
      ? (tenant.landingServicios as ServicioItem[])
      : SERVICIOS_DEFAULT

  const testimonios: TestimonioItem[] =
    Array.isArray(tenant.landingTestimonios) && tenant.landingTestimonios.length > 0
      ? (tenant.landingTestimonios as TestimonioItem[])
      : TESTIMONIOS_DEFAULT

  const certificaciones =
    tenant.certificaciones.length > 0 ? tenant.certificaciones : CERTIFICACIONES_DEFAULT

  const galeriaFotos = tenant.galeriaFotos.length > 0 ? tenant.galeriaFotos : Array(6).fill("")

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Editor de tu página pública</h2>
          <p className="text-sm text-gray-400 mt-0.5">Los cambios se ven al instante en tu landing</p>
        </div>
        <a
          href={`/?subdominio=${tenant.subdominio}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-700 border border-green-300 bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
        >
          Ver mi página →
        </a>
      </div>

      <LandingEditorClient
        fotoPerfil={tenant.fotoPerfil ?? ""}
        certificaciones={certificaciones}
        galeriaFotos={galeriaFotos}
        servicios={servicios}
        testimonios={testimonios}
      />
    </div>
  )
}
