"use server"

import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { TenantTipo, UserRol } from "@/generated/prisma/enums"
import bcrypt from "bcryptjs"

type ActionState = { error?: string } | null

export async function registrarClub(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nombre = (formData.get("nombre") as string)?.trim()
  const subdominio = (formData.get("subdominio") as string)?.trim().toLowerCase()
  const ciudad = (formData.get("ciudad") as string)?.trim() || null
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const passwordConfirm = formData.get("passwordConfirm") as string

  if (!nombre || nombre.length < 2) return { error: "Ingresá el nombre del club (mínimo 2 caracteres)" }
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

  const hashedPassword = await bcrypt.hash(password, 12)

  const tenant = await db.tenant.create({
    data: {
      nombre,
      subdominio,
      tipo: TenantTipo.CLUB,
      bio: ciudad ?? undefined,
    },
  })

  await db.user.create({
    data: {
      name: nombre,
      nombre,
      email,
      password: hashedPassword,
      rol: UserRol.TENANT_OWNER,
      tenantId: tenant.id,
    },
  })

  await signIn("credentials", { email, password, redirectTo: "/dashboard" })

  return null
}
