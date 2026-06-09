import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { AlumnoEstado, UserRol } from "@/generated/prisma/enums"
import AlumnosPagosClient from "./AlumnosPagosClient"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const tenantId = session.user.tenantId
  if (!tenantId) redirect("/onboarding")
  if (session.user.rol === UserRol.STUDENT) redirect("/dashboard")

  const { mes: mesParam } = await searchParams
  const hoy = new Date()
  const mes = mesParam ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`

  const [anio, mesNum] = mes.split("-").map(Number)
  const mesDate = new Date(Date.UTC(anio, mesNum - 1, 1))
  const mesLabel = `${MESES[mesNum - 1]} ${anio}`

  const rawAlumnos = await db.user.findMany({
    where: { tenantId, rol: UserRol.STUDENT, alumnoEstado: AlumnoEstado.ACTIVO },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      resumenesMensuales: {
        where: { mes: mesDate },
        take: 1,
        include: { extras: { select: { id: true, descripcion: true, monto: true } } },
      },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  })

  const alumnos = rawAlumnos.map((a) => {
    const r = a.resumenesMensuales[0] ?? null
    return {
      id: a.id,
      nombre: a.nombre,
      apellido: a.apellido,
      email: a.email,
      resumen: r
        ? {
            id: r.id,
            horasTomadas: r.horasTomadas,
            montoClases: r.montoClases,
            montoExtras: r.montoExtras,
            totalMonto: r.totalMonto,
            estado: r.estado,
            comprobanteUrl: r.comprobanteUrl,
            metodoPago: r.metodoPago,
            extras: r.extras,
          }
        : null,
    }
  })

  return <AlumnosPagosClient alumnos={alumnos} mes={mes} mesLabel={mesLabel} />
}
