"use server"

import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { AlumnoEstado, NivelJugador, TenantTipo, UserRol } from "@/generated/prisma/enums"
import bcrypt from "bcryptjs"

type ActionState = { error?: string } | null

export async function registrarAlumnoFlow(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nombre = (formData.get("nombre") as string)?.trim()
  const apellido = (formData.get("apellido") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const passwordConfirm = formData.get("passwordConfirm") as string
  const telefono = (formData.get("telefono") as string)?.trim() || null
  const nivelRaw = formData.get("nivelJugador") as string
  const nivelJugador: NivelJugador = (Object.values(NivelJugador).includes(nivelRaw as NivelJugador)
    ? nivelRaw
    : NivelJugador.SEPTIMA) as NivelJugador
  const esMenor = formData.get("esMenor") === "on"
  const tutorNombre = esMenor ? (formData.get("tutorNombre") as string)?.trim() || null : null
  const tutorTelefono = esMenor ? (formData.get("tutorTelefono") as string)?.trim() || null : null
  const profesorTenantId = (formData.get("profesorTenantId") as string)?.trim()

  if (!nombre || nombre.length < 2) return { error: "Ingresá tu nombre" }
  if (!apellido || apellido.length < 2) return { error: "Ingresá tu apellido" }
  if (!email || !email.includes("@")) return { error: "Ingresá un email válido" }
  if (!password || password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }
  if (password !== passwordConfirm) return { error: "Las contraseñas no coinciden" }
  if (esMenor && !tutorNombre) return { error: "Ingresá el nombre del tutor/padre" }
  if (!profesorTenantId) return { error: "Seleccioná un profesor" }

  const [emailExiste, profesor] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.tenant.findUnique({ where: { id: profesorTenantId, tipo: TenantTipo.PROFESOR } }),
  ])
  if (emailExiste) return { error: "Ya existe una cuenta con ese email" }
  if (!profesor) return { error: "El profesor seleccionado no existe" }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      name: `${nombre} ${apellido}`,
      nombre,
      apellido,
      email,
      password: hashedPassword,
      telefono,
      rol: UserRol.STUDENT,
      alumnoEstado: AlumnoEstado.STANDBY,
      nivelJugador,
      esMenor,
      tutorNombre,
      tutorTelefono,
      tenantId: profesorTenantId,
    },
  })

  await signIn("credentials", { email, password, redirectTo: "/dashboard" })

  return null
}
