import { db } from "@/lib/db"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import { NextRequest } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params

  const relaciones = await db.profesorClub.findMany({
    where: { clubTenantId: clubId },
    include: {
      profesorTenant: {
        select: {
          id: true,
          nombre: true,
          bio: true,
          fotoPerfil: true,
          usuarios: {
            where: { rol: UserRol.TENANT_OWNER },
            select: { name: true, nombre: true, apellido: true },
            take: 1,
          },
        },
      },
    },
  })

  const profesores = relaciones.map((r) => ({
    tenantId: r.profesorTenant.id,
    nombre: r.profesorTenant.nombre,
    bio: r.profesorTenant.bio,
    fotoPerfil: r.profesorTenant.fotoPerfil,
  }))

  return Response.json(profesores)
}
