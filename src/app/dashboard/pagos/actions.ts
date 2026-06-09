"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AlumnoEstado, BookingEstado, MetodoPago, PedidoEstado, ResumenEstado, UserRol } from "@/generated/prisma/enums"
import { revalidatePath, revalidateTag } from "next/cache"

function parseMes(mes: string): { inicio: Date; fin: Date; mesDate: Date } {
  const [anio, mesNum] = mes.split("-").map(Number)
  const inicio = new Date(Date.UTC(anio, mesNum - 1, 1))
  const fin = new Date(Date.UTC(anio, mesNum, 1))
  return { inicio, fin, mesDate: inicio }
}

export async function generarResumenesMes(mes: string) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  const profe = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, rol: true, tenant: { select: { precioPorHora: true } } },
  })
  if (!profe?.tenantId) return { error: "Sin tenant" }
  if (profe.rol === UserRol.STUDENT) return { error: "Sin permiso" }

  const precioPorHora = profe.tenant?.precioPorHora ?? 0
  const { inicio, fin, mesDate } = parseMes(mes)

  const alumnos = await db.user.findMany({
    where: { tenantId: profe.tenantId, rol: UserRol.STUDENT, alumnoEstado: AlumnoEstado.ACTIVO },
    select: { id: true },
  })

  let generados = 0

  for (const alumno of alumnos) {
    const existente = await db.resumenMensual.findUnique({
      where: {
        tenantId_alumnoId_mes: { tenantId: profe.tenantId, alumnoId: alumno.id, mes: mesDate },
      },
    })
    if (existente) continue

    const horasTomadas = await db.booking.count({
      where: {
        studentId: alumno.id,
        estado: BookingEstado.CONFIRMADO,
        fecha: { gte: inicio, lt: fin },
      },
    })

    const montoClases = horasTomadas * precioPorHora

    // Buscar servicios confirmados del alumno aún no facturados
    const pedidosConfirmados = await db.pedidoServicio.findMany({
      where: { tenantId: profe.tenantId, alumnoId: alumno.id, estado: PedidoEstado.CONFIRMADO },
      include: { catalogoServicio: { select: { nombre: true } } },
    })

    const montoExtras = pedidosConfirmados.reduce((sum, p) => sum + p.precioSnapshot, 0)

    const resumen = await db.resumenMensual.create({
      data: {
        tenantId: profe.tenantId,
        alumnoId: alumno.id,
        mes: mesDate,
        horasTomadas,
        montoClases,
        montoExtras,
        totalMonto: montoClases + montoExtras,
        estado: ResumenEstado.PENDIENTE,
      },
    })

    if (pedidosConfirmados.length > 0) {
      await db.extraItem.createMany({
        data: pedidosConfirmados.map((p) => ({
          resumenId: resumen.id,
          descripcion: p.catalogoServicio.nombre,
          monto: p.precioSnapshot,
        })),
      })
      await db.pedidoServicio.updateMany({
        where: { id: { in: pedidosConfirmados.map((p) => p.id) } },
        data: { estado: PedidoEstado.FACTURADO },
      })
    }

    generados++
  }

  revalidateTag(`tenant-${profe.tenantId}`, {})
  revalidatePath("/dashboard/pagos")
  return { ok: true, generados }
}

export async function confirmarPago(resumenId: string, metodoPago: MetodoPago) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  const profe = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, rol: true },
  })
  if (!profe?.tenantId || profe.rol === UserRol.STUDENT) return { error: "Sin permiso" }

  await db.resumenMensual.update({
    where: { id: resumenId, tenantId: profe.tenantId },
    data: {
      estado: ResumenEstado.CONFIRMADO,
      metodoPago,
      confirmadoEn: new Date(),
    },
  })

  revalidatePath("/dashboard/pagos")
  return { ok: true }
}
