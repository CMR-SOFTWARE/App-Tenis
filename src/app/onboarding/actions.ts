"use server"
// Acción de servidor para crear la academia del profe
//
// Las Server Actions corren SOLO en el servidor — nunca en el browser.
// Ventaja: podemos usar Prisma, leer env variables, y verificar auth de forma segura.

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRol } from "@/generated/prisma/enums"

// Tipo que devolvemos cuando hay un error de validación
type ActionState = { error: string } | null

export async function crearAcademia(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Verificar que el usuario está autenticado
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "No estás autenticado" }
  }

  // 2. Leer los campos del formulario
  const nombre = (formData.get("nombre") as string)?.trim()
  const subdominio = (formData.get("subdominio") as string)?.toLowerCase().trim()

  // 3. Validaciones de formato
  if (!nombre || nombre.length < 2) {
    return { error: "El nombre de la academia debe tener al menos 2 caracteres" }
  }
  if (!subdominio) {
    return { error: "El subdominio es obligatorio" }
  }
  // Solo letras minúsculas, números y guiones; entre 3 y 30 caracteres
  if (!/^[a-z0-9-]{3,30}$/.test(subdominio)) {
    return { error: "El subdominio solo puede tener letras minúsculas, números y guiones (3-30 caracteres)" }
  }
  if (subdominio.startsWith("-") || subdominio.endsWith("-")) {
    return { error: "El subdominio no puede empezar ni terminar con un guión" }
  }

  // 4. Verificar que el usuario no tenga academia ya
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  })
  if (user?.tenantId) {
    return { error: "Ya tenés una academia creada" }
  }

  // 5. Verificar que el subdominio no esté en uso
  const subdominioExistente = await db.tenant.findUnique({
    where: { subdominio },
  })
  if (subdominioExistente) {
    return { error: "Ese subdominio ya está en uso, probá con otro" }
  }

  // 6. Crear el Tenant en la BD
  const tenant = await db.tenant.create({
    data: {
      nombre,
      subdominio,
    },
  })

  // 7. Vincular el usuario al tenant como TENANT_OWNER
  await db.user.update({
    where: { id: session.user.id },
    data: {
      tenantId: tenant.id,
      rol: UserRol.TENANT_OWNER,
    },
  })

  // 8. Redirigir al dashboard
  // redirect() en un Server Action lanza una excepción especial que Next.js intercepta
  // y convierte en una redirección del browser — no es un error real
  redirect("/dashboard")
}
