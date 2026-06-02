"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AlumnoEstado, BookingEstado, ModalidadClase, NivelJugador, TipoDocumento, UserRol } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function getTenantCtx() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, tenant: { select: { subdominio: true } } },
  })
  if (!user?.tenantId) return null
  return { tenantId: user.tenantId, subdominio: user.tenant?.subdominio ?? "cancha" }
}

export async function crearAlumno(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const ctx = await getTenantCtx()
  if (!ctx) return { error: "No autenticado" }

  const apellido = (formData.get("apellido") as string)?.trim()
  const nombre = (formData.get("nombre") as string)?.trim()
  const fechaNacimientoStr = formData.get("fechaNacimiento") as string
  const tipoDocumento = formData.get("tipoDocumento") as TipoDocumento
  const nroDocumento = (formData.get("nroDocumento") as string)?.trim()
  const nivelJugador = (formData.get("nivelJugador") as NivelJugador) || null
  const modalidadClase = (formData.get("modalidadClase") as ModalidadClase) || ModalidadClase.MENSUAL
  const clubNombre = (formData.get("clubNombre") as string)?.trim() || null
  const telefono = (formData.get("telefono") as string)?.trim() || null
  const emailInput = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  const tutorNombre = (formData.get("tutorNombre") as string)?.trim() || null
  const tutorTelefono = (formData.get("tutorTelefono") as string)?.trim() || null

  if (!apellido) return { error: "El apellido es requerido" }
  if (!nombre) return { error: "El nombre es requerido" }
  if (!nroDocumento) return { error: "El número de documento es requerido" }
  if (!tipoDocumento) return { error: "El tipo de documento es requerido" }
  if (!password || password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" }

  // Verificar que no exista otro alumno con el mismo documento en este tenant
  const docExistente = await db.user.findFirst({
    where: { tenantId: ctx.tenantId, nroDocumento, rol: UserRol.STUDENT },
  })
  if (docExistente) return { error: "Ya existe un alumno con ese número de documento" }

  // Email: usar el ingresado o generar uno automático
  const nroClean = nroDocumento.replace(/\D/g, "")
  const email = emailInput || `doc${nroClean}.${ctx.tenantId.slice(-6)}@alumno.cancha.app`

  const emailExistente = await db.user.findUnique({ where: { email } })
  if (emailExistente) return { error: "Ya existe una cuenta con ese email" }

  const fechaNacimiento = fechaNacimientoStr ? new Date(fechaNacimientoStr) : null
  const edad = fechaNacimiento
    ? Math.floor((Date.now() - fechaNacimiento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const esMenor = edad !== null && edad < 18

  const passwordHash = await bcrypt.hash(password, 10)

  await db.user.create({
    data: {
      email,
      nombre,
      apellido,
      name: `${nombre} ${apellido}`,
      password: passwordHash,
      rol: UserRol.STUDENT,
      alumnoEstado: AlumnoEstado.ACTIVO,
      tenantId: ctx.tenantId,
      fechaNacimiento,
      tipoDocumento,
      nroDocumento,
      nivelJugador,
      modalidadClase,
      clubNombre,
      telefono,
      esMenor,
      tutorNombre: esMenor ? tutorNombre : null,
      tutorTelefono: esMenor ? tutorTelefono : null,
    },
  })

  revalidatePath("/dashboard/alumnos")
  return {}
}

export async function editarAlumno(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const ctx = await getTenantCtx()
  if (!ctx) return { error: "No autenticado" }

  const alumnoId = formData.get("alumnoId") as string
  if (!alumnoId) return { error: "ID inválido" }

  const alumno = await db.user.findUnique({ where: { id: alumnoId }, select: { tenantId: true } })
  if (!alumno || alumno.tenantId !== ctx.tenantId) return { error: "Alumno no encontrado" }

  const apellido = (formData.get("apellido") as string)?.trim()
  const nombre = (formData.get("nombre") as string)?.trim()
  const fechaNacimientoStr = formData.get("fechaNacimiento") as string
  const tipoDocumento = formData.get("tipoDocumento") as TipoDocumento
  const nroDocumento = (formData.get("nroDocumento") as string)?.trim()
  const nivelJugador = (formData.get("nivelJugador") as NivelJugador) || null
  const modalidadClase = (formData.get("modalidadClase") as ModalidadClase) || ModalidadClase.MENSUAL
  const clubNombre = (formData.get("clubNombre") as string)?.trim() || null
  const telefono = (formData.get("telefono") as string)?.trim() || null
  const passwordRaw = (formData.get("password") as string)?.trim()
  const tutorNombre = (formData.get("tutorNombre") as string)?.trim() || null
  const tutorTelefono = (formData.get("tutorTelefono") as string)?.trim() || null

  if (!apellido) return { error: "El apellido es requerido" }
  if (!nombre) return { error: "El nombre es requerido" }

  const fechaNacimiento = fechaNacimientoStr ? new Date(fechaNacimientoStr) : null
  const edad = fechaNacimiento
    ? Math.floor((Date.now() - fechaNacimiento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const esMenor = edad !== null && edad < 18

  const data: Record<string, unknown> = {
    nombre,
    apellido,
    name: `${nombre} ${apellido}`,
    fechaNacimiento,
    tipoDocumento: tipoDocumento || null,
    nroDocumento: nroDocumento || null,
    nivelJugador,
    modalidadClase,
    clubNombre,
    telefono,
    esMenor,
    tutorNombre: esMenor ? tutorNombre : null,
    tutorTelefono: esMenor ? tutorTelefono : null,
  }

  if (passwordRaw && passwordRaw.length >= 6) {
    data.password = await bcrypt.hash(passwordRaw, 10)
  } else if (passwordRaw) {
    return { error: "La contraseña debe tener al menos 6 caracteres" }
  }

  await db.user.update({ where: { id: alumnoId }, data })

  revalidatePath("/dashboard/alumnos")
  return {}
}

export async function cambiarEstadoAlumno(
  studentId: string,
  nuevoEstado: AlumnoEstado
): Promise<{ error?: string }> {
  const ctx = await getTenantCtx()
  if (!ctx) return { error: "No autenticado" }

  const alumno = await db.user.findUnique({ where: { id: studentId }, select: { tenantId: true } })
  if (alumno?.tenantId !== ctx.tenantId) return { error: "Alumno no encontrado" }

  await db.user.update({ where: { id: studentId }, data: { alumnoEstado: nuevoEstado } })
  revalidatePath("/dashboard/alumnos")
  return {}
}

export async function cancelarTurnoAlumno(studentId: string): Promise<{ error?: string }> {
  const ctx = await getTenantCtx()
  if (!ctx) return { error: "No autenticado" }

  const alumno = await db.user.findUnique({ where: { id: studentId }, select: { tenantId: true } })
  if (alumno?.tenantId !== ctx.tenantId) return { error: "Alumno no encontrado" }

  await db.booking.updateMany({
    where: {
      studentId,
      fecha: { gte: new Date() },
      estado: BookingEstado.CONFIRMADO,
      slot: { tenantId: ctx.tenantId },
    },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/alumnos")
  revalidatePath("/dashboard/turnos")
  return {}
}
