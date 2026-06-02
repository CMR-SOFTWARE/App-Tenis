"use server"

import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { AlumnoEstado, NivelJugador, UserRol } from "@/generated/prisma/enums"
import bcrypt from "bcryptjs"

type ActionState = { error?: string; success?: string } | null

export async function registrarAlumno(
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
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard"

  // Validaciones
  if (!nombre || nombre.length < 2) return { error: "Ingresá tu nombre (mínimo 2 caracteres)" }
  if (!apellido || apellido.length < 2) return { error: "Ingresá tu apellido" }
  if (!email || !email.includes("@")) return { error: "Ingresá un email válido" }
  if (!password || password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }
  if (password !== passwordConfirm) return { error: "Las contraseñas no coinciden" }
  if (esMenor && !tutorNombre) return { error: "Ingresá el nombre del tutor/padre" }

  // Verificar email único
  const existente = await db.user.findUnique({ where: { email } })
  if (existente) return { error: "Ya existe una cuenta con ese email" }

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
    },
  })

  // Auto-login después del registro
  await signIn("credentials", { email, password, redirectTo: callbackUrl })

  // signIn con redirectTo hace redirect internamente — este return no se alcanza
  return { success: "Cuenta creada exitosamente" }
}
