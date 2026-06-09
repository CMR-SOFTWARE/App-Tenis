"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { BookingEstado, NivelJugador, TipoClase } from "@/generated/prisma/enums"
import { revalidatePath, revalidateTag } from "next/cache"

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  // tenantId viene del JWT — sin query a la DB
  return session?.user?.tenantId ?? null
}

export async function initializarSlots(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) return { ok: false, error: "No autenticado" }

  const slotCount = await db.scheduleSlot.count({ where: { tenantId } })
  if (slotCount > 0) return { ok: true }

  const initSlots: { tenantId: string; diaSemana: number; horaInicio: string; duracionMin: number; activo: boolean }[] = []
  for (let day = 1; day <= 6; day++) {
    for (let hour = 8; hour <= 21; hour++) {
      for (const min of [0, 30]) {
        if (hour === 21 && min === 30) continue
        initSlots.push({
          tenantId,
          diaSemana: day,
          horaInicio: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
          duracionMin: 30,
          activo: true,
        })
      }
    }
  }
  await db.scheduleSlot.createMany({ data: initSlots })
  revalidatePath("/dashboard/turnos")
  return { ok: true }
}

export async function bloquearSlot(
  diaSemana: number,
  horaInicio: string
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const existente = await db.scheduleSlot.findFirst({
    where: { tenantId, diaSemana, horaInicio },
  })

  if (existente) {
    await db.scheduleSlot.update({ where: { id: existente.id }, data: { activo: false } })
  } else {
    await db.scheduleSlot.create({ data: { tenantId, diaSemana, horaInicio, activo: false } })
  }

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function desbloquearSlot(slotId: string): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return

  await db.scheduleSlot.update({ where: { id: slotId }, data: { activo: true } })
  revalidatePath("/dashboard/turnos")
}

export async function configurarSlot(
  slotId: string,
  tipoClase: TipoClase,
  capacidadMaxima: number,
  nivelRequerido: NivelJugador | null,
  precioGrupal: number | null
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return { error: "Slot no encontrado" }

  await db.scheduleSlot.update({
    where: { id: slotId },
    data: { tipoClase, capacidadMaxima, nivelRequerido, precioGrupal },
  })

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function asignarAlumno(
  diaSemana: number,
  horaInicio: string,
  studentId: string,
  config?: {
    tipoClase?: TipoClase
    capacidadMaxima?: number
    nivelRequerido?: NivelJugador | null
    precioGrupal?: number | null
  }
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const alumno = await db.user.findUnique({
    where: { id: studentId },
    select: { tenantId: true, nivelJugador: true },
  })
  if (!alumno || alumno.tenantId !== tenantId) {
    return { error: "Este alumno no pertenece a tu academia" }
  }

  let slot = await db.scheduleSlot.findFirst({ where: { tenantId, diaSemana, horaInicio } })

  if (!slot) {
    slot = await db.scheduleSlot.create({
      data: {
        tenantId,
        diaSemana,
        horaInicio,
        activo: true,
        tipoClase: config?.tipoClase ?? TipoClase.INDIVIDUAL,
        capacidadMaxima: config?.capacidadMaxima ?? 1,
        nivelRequerido: config?.nivelRequerido ?? null,
        precioGrupal: config?.precioGrupal ?? null,
      },
    })
  } else if (!slot.activo) {
    return { error: "Este horario está bloqueado. Desbloquealo primero." }
  } else if (config) {
    // Actualizar config si se envía
    await db.scheduleSlot.update({
      where: { id: slot.id },
      data: {
        tipoClase: config.tipoClase ?? slot.tipoClase,
        capacidadMaxima: config.capacidadMaxima ?? slot.capacidadMaxima,
        nivelRequerido: config.nivelRequerido !== undefined ? config.nivelRequerido : slot.nivelRequerido,
        precioGrupal: config.precioGrupal !== undefined ? config.precioGrupal : slot.precioGrupal,
      },
    })
    slot = (await db.scheduleSlot.findUnique({ where: { id: slot.id } }))!
  }

  // Validar nivel
  if (slot.nivelRequerido && slot.nivelRequerido !== alumno.nivelJugador) {
    return { error: `Este turno es para nivel ${slot.nivelRequerido.toLowerCase()}` }
  }

  // Validar capacidad
  const hoy = new Date()
  const alumnosActuales = await db.booking.groupBy({
    by: ["studentId"],
    where: {
      slotId: slot.id,
      fecha: { gte: hoy },
      estado: BookingEstado.CONFIRMADO,
      studentId: { not: studentId },
    },
  })
  if (alumnosActuales.length >= slot.capacidadMaxima) {
    return { error: `Este turno ya está completo (máx. ${slot.capacidadMaxima} alumnos)` }
  }

  // Cancelar reservas futuras anteriores de este alumno en este slot
  await db.booking.updateMany({
    where: { slotId: slot.id, studentId, fecha: { gte: hoy }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  // Crear 12 reservas semanales
  const fechas: Date[] = []
  const cursor = new Date()
  cursor.setUTCHours(12, 0, 0, 0)
  cursor.setUTCDate(cursor.getUTCDate() + 1)

  while (fechas.length < 12) {
    if (cursor.getUTCDay() === diaSemana) fechas.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  await db.booking.createMany({
    data: fechas.map((fecha) => ({
      slotId: slot!.id,
      studentId,
      fecha,
      estado: BookingEstado.CONFIRMADO,
    })),
  })

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function cancelarAsignacionSlot(slotId: string): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return

  await db.booking.updateMany({
    where: { slotId, fecha: { gte: new Date() }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/turnos")
}

export async function crearSlotDisponible(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const diaSemana = parseInt(formData.get("diaSemana") as string)
  const horaInicio = formData.get("horaInicio") as string
  const duracionMin = parseInt(formData.get("duracionMin") as string) || 60
  const tipoClase = (formData.get("tipoClase") as TipoClase) || TipoClase.INDIVIDUAL
  const capacidadMaxima = parseInt(formData.get("capacidadMaxima") as string) || 1
  const nivelRequeridoStr = formData.get("nivelRequerido") as string
  const nivelRequerido = nivelRequeridoStr ? (nivelRequeridoStr as NivelJugador) : null
  const precioStr = formData.get("precio") as string
  const precio = precioStr ? parseFloat(precioStr) : null

  if (isNaN(diaSemana) || diaSemana < 1 || diaSemana > 6) {
    return { error: "Día inválido" }
  }
  if (!horaInicio || !/^\d{2}:\d{2}$/.test(horaInicio)) {
    return { error: "Hora inválida" }
  }

  const existente = await db.scheduleSlot.findFirst({
    where: { tenantId, diaSemana, horaInicio },
  })

  if (existente) {
    await db.scheduleSlot.update({
      where: { id: existente.id },
      data: { activo: true, duracionMin, tipoClase, capacidadMaxima, nivelRequerido },
    })
  } else {
    await db.scheduleSlot.create({
      data: {
        tenantId,
        diaSemana,
        horaInicio,
        duracionMin,
        activo: true,
        tipoClase,
        capacidadMaxima,
        nivelRequerido,
      },
    })
  }

  // Actualizar precioPorHora en el tenant si se envió
  if (precio) {
    await db.tenant.update({ where: { id: tenantId }, data: { precioPorHora: precio } })
  }

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function cancelarAsignacionEstudiante(
  slotId: string,
  studentId: string
): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return

  await db.booking.updateMany({
    where: { slotId, studentId, fecha: { gte: new Date() }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/turnos")
}

export async function setSlotCapacidad(slotId: string, capacidad: number): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return { error: "Slot no encontrado" }

  await db.scheduleSlot.update({ where: { id: slotId }, data: { capacidadMaxima: Math.max(1, capacidad) } })
  revalidatePath("/dashboard/turnos")
  return {}
}

export async function toggleSlotActivo(slotId: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return { error: "Slot no encontrado" }

  await db.scheduleSlot.update({ where: { id: slotId }, data: { activo: !slot.activo } })
  revalidatePath("/dashboard/turnos")
  return {}
}

export async function setSlotNivel(slotId: string, nivel: string): Promise<{ error?: string; cancelados?: number }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return { error: "Slot no encontrado" }

  const nivelRequerido = nivel ? (nivel as NivelJugador) : null
  await db.scheduleSlot.update({ where: { id: slotId }, data: { nivelRequerido } })

  // Si se restringe a un nivel, cancelar bookings futuros de alumnos que no coincidan
  let cancelados = 0
  if (nivelRequerido) {
    const incompatibles = await db.booking.findMany({
      where: {
        slotId,
        estado: BookingEstado.CONFIRMADO,
        fecha: { gte: new Date() },
        student: { nivelJugador: { not: nivelRequerido } },
      },
      select: { id: true },
    })
    if (incompatibles.length > 0) {
      await db.booking.updateMany({
        where: { id: { in: incompatibles.map((b) => b.id) } },
        data: { estado: BookingEstado.CANCELADO },
      })
      cancelados = incompatibles.length
    }
  }

  revalidatePath("/dashboard/turnos")
  return { cancelados }
}

export async function eliminarSlot(slotId: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return { error: "Slot no encontrado" }

  await db.booking.updateMany({
    where: { slotId, fecha: { gte: new Date() }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  await db.scheduleSlot.delete({ where: { id: slotId } })

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function cancelarSlotDelDia(
  slotId: string,
  fechaStr: string
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  // Permitido si el slot pertenece al tenant propio O está asignado a él como empleado
  const slot = await db.scheduleSlot.findFirst({
    where: { id: slotId, OR: [{ tenantId }, { empleadoTenantId: tenantId }] },
  })
  if (!slot) return { error: "Slot no encontrado o sin permiso" }

  const [y, m, d] = fechaStr.split("-").map(Number)
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0))

  await db.booking.updateMany({
    where: { slotId, fecha: { gte: start, lt: end }, estado: BookingEstado.CONFIRMADO },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/turnos")
  return {}
}

export async function asignarEmpleadoASlot(
  slotId: string,
  empleadoTenantId: string | null
): Promise<{ error?: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.tenantId !== tenantId) return { error: "Slot no encontrado" }

  if (empleadoTenantId !== null) {
    const relacion = await db.jefeEmpleado.findUnique({
      where: { jefeTenantId_empleadoTenantId: { jefeTenantId: tenantId, empleadoTenantId } },
    })
    if (!relacion) return { error: "Ese profesor no está en tu equipo" }
  }

  await db.scheduleSlot.update({
    where: { id: slotId },
    data: { empleadoTenantId },
  })

  revalidatePath("/dashboard/turnos")
  return {}
}

export type AlumnoAfectado = {
  nombre: string
  apellido: string | null
  telefono: string | null
  horaInicio: string
}

function rangoDia(fechaStr: string): { start: Date; end: Date } {
  const [y, m, d] = fechaStr.split("-").map(Number)
  return {
    start: new Date(Date.UTC(y, m - 1, d, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0)),
  }
}

export async function getAlumnosDeDia(
  fechaStr: string
): Promise<{ error?: string; alumnos?: AlumnoAfectado[] }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const { start, end } = rangoDia(fechaStr)

  const bookings = await db.booking.findMany({
    where: {
      slot: { tenantId },
      fecha: { gte: start, lt: end },
      estado: BookingEstado.CONFIRMADO,
    },
    include: {
      student: { select: { nombre: true, apellido: true, telefono: true } },
      slot: { select: { horaInicio: true } },
    },
  })

  bookings.sort((a, b) => a.slot.horaInicio.localeCompare(b.slot.horaInicio))

  return {
    alumnos: bookings.map((b) => ({
      nombre: b.student.nombre ?? "Alumno",
      apellido: b.student.apellido,
      telefono: b.student.telefono,
      horaInicio: b.slot.horaInicio,
    })),
  }
}

export async function cancelarDia(
  fechaStr: string
): Promise<{ error?: string; cancelados?: AlumnoAfectado[] }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { error: "No autenticado" }

  const { start, end } = rangoDia(fechaStr)

  const bookings = await db.booking.findMany({
    where: {
      slot: { tenantId },
      fecha: { gte: start, lt: end },
      estado: BookingEstado.CONFIRMADO,
    },
    include: {
      student: { select: { nombre: true, apellido: true, telefono: true } },
      slot: { select: { horaInicio: true } },
    },
  })

  if (bookings.length > 0) {
    await db.booking.updateMany({
      where: { id: { in: bookings.map((b) => b.id) } },
      data: { estado: BookingEstado.CANCELADO },
    })
  }

  revalidatePath("/dashboard/turnos")
  revalidatePath("/dashboard")

  bookings.sort((a, b) => a.slot.horaInicio.localeCompare(b.slot.horaInicio))

  return {
    cancelados: bookings.map((b) => ({
      nombre: b.student.nombre ?? "Alumno",
      apellido: b.student.apellido,
      telefono: b.student.telefono,
      horaInicio: b.slot.horaInicio,
    })),
  }
}

export async function confirmarSolicitud(bookingId: string): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { select: { tenantId: true } } },
  })
  if (!booking || booking.slot.tenantId !== tenantId) return
  if (booking.estado !== BookingEstado.PENDIENTE) return

  await db.booking.update({
    where: { id: bookingId },
    data: { estado: BookingEstado.CONFIRMADO },
  })

  revalidateTag(`tenant-${tenantId}`)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/mis-turnos")
}

export async function rechazarSolicitud(bookingId: string): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { select: { tenantId: true } } },
  })
  if (!booking || booking.slot.tenantId !== tenantId) return
  if (booking.estado !== BookingEstado.PENDIENTE) return

  await db.booking.update({
    where: { id: bookingId },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidateTag(`tenant-${tenantId}`)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/mis-turnos")
}
