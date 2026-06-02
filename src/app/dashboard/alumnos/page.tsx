import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, UserRol } from "@/generated/prisma/enums"
import AlumnosABM, { type AlumnoRow } from "./AlumnosABM"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default async function AlumnosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, rol: true },
  })
  if (!user?.tenantId) redirect("/onboarding")
  if (user.rol === UserRol.STUDENT) redirect("/dashboard")

  const hoy = new Date()

  const rawAlumnos = await db.user.findMany({
    where: { tenantId: user.tenantId, rol: UserRol.STUDENT },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      name: true,
      email: true,
      fechaNacimiento: true,
      tipoDocumento: true,
      nroDocumento: true,
      nivelJugador: true,
      modalidadClase: true,
      clubNombre: true,
      telefono: true,
      alumnoEstado: true,
      esMenor: true,
      tutorNombre: true,
      tutorTelefono: true,
      reservas: {
        where: { fecha: { gte: hoy }, estado: BookingEstado.CONFIRMADO },
        orderBy: { fecha: "asc" },
        take: 1,
        include: { slot: { select: { diaSemana: true, horaInicio: true } } },
      },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  })

  const alumnos: AlumnoRow[] = rawAlumnos.map((a) => {
    const slot = a.reservas[0]?.slot
    return {
      id: a.id,
      nombre: a.nombre,
      apellido: a.apellido,
      email: a.email,
      fechaNacimiento: a.fechaNacimiento?.toISOString().slice(0, 10) ?? null,
      tipoDocumento: a.tipoDocumento,
      nroDocumento: a.nroDocumento,
      nivelJugador: a.nivelJugador,
      modalidadClase: a.modalidadClase,
      clubNombre: a.clubNombre,
      telefono: a.telefono,
      alumnoEstado: a.alumnoEstado,
      esMenor: a.esMenor,
      tutorNombre: a.tutorNombre,
      tutorTelefono: a.tutorTelefono,
      turno: slot ? `${DIAS[slot.diaSemana]} ${slot.horaInicio}` : null,
    }
  })

  // Sugerencias de club para el autocomplete (clubs ya usados por este profesor)
  const clubSugerencias = [...new Set(alumnos.map((a) => a.clubNombre).filter(Boolean))] as string[]

  return <AlumnosABM alumnos={alumnos} clubSugerencias={clubSugerencias} />
}
