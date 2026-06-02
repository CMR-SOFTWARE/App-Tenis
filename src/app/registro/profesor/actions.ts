"use server"

import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import bcrypt from "bcryptjs"

type ActionState = { error?: string } | null

export async function registrarProfesor(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nombre = (formData.get("nombre") as string)?.trim()
  const apellido = (formData.get("apellido") as string)?.trim()
  const subdominio = (formData.get("subdominio") as string)?.trim().toLowerCase()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const passwordConfirm = formData.get("passwordConfirm") as string
  const clubId = (formData.get("clubId") as string)?.trim() || null

  if (!nombre || nombre.length < 2) return { error: "Ingresá tu nombre" }
  if (!apellido || apellido.length < 2) return { error: "Ingresá tu apellido" }
  if (!subdominio || subdominio.length < 3) return { error: "El subdominio debe tener al menos 3 caracteres" }
  if (!/^[a-z0-9-]+$/.test(subdominio)) return { error: "El subdominio solo puede tener letras minúsculas, números y guiones" }
  if (subdominio.length > 30) return { error: "El subdominio no puede tener más de 30 caracteres" }
  if (!email || !email.includes("@")) return { error: "Ingresá un email válido" }
  if (!password || password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }
  if (password !== passwordConfirm) return { error: "Las contraseñas no coinciden" }

  const [subdominioExiste, emailExiste] = await Promise.all([
    db.tenant.findUnique({ where: { subdominio } }),
    db.user.findUnique({ where: { email } }),
  ])
  if (subdominioExiste) return { error: "Ese subdominio ya está en uso" }
  if (emailExiste) return { error: "Ya existe una cuenta con ese email" }

  // Verificar que el club exista si se proporcionó
  if (clubId) {
    const club = await db.tenant.findUnique({ where: { id: clubId, tipo: TenantTipo.CLUB } })
    if (!club) return { error: "El club seleccionado no existe" }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const tenant = await db.tenant.create({
    data: {
      nombre: `${nombre} ${apellido}`,
      subdominio,
      tipo: TenantTipo.PROFESOR,
    },
  })

  await db.user.create({
    data: {
      name: `${nombre} ${apellido}`,
      nombre,
      apellido,
      email,
      password: hashedPassword,
      rol: UserRol.TENANT_OWNER,
      tenantId: tenant.id,
    },
  })

  if (clubId) {
    await db.profesorClub.create({
      data: { profesorTenantId: tenant.id, clubTenantId: clubId },
    })
  }

  await signIn("credentials", { email, password, redirectTo: "/dashboard" })

  return null
}
