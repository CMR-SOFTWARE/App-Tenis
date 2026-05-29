import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, UserRol } from "@/generated/prisma/enums"
import GrillaTurnos from "./GrillaTurnos"
import CopyButton from "./CopyButton"

type CeldaInfo = {
  slotId: string
  activo: boolean
  alumno: { id: string; name: string | null; email: string } | null
}

export default async function TurnosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, tenant: { select: { subdominio: true } } },
  })
  if (!user?.tenantId) redirect("/onboarding")

  const hoy = new Date()

  const slots = await db.scheduleSlot.findMany({
    where: { tenantId: user.tenantId },
    include: {
      reservas: {
        where: { fecha: { gte: hoy }, estado: BookingEstado.CONFIRMADO },
        orderBy: { fecha: "asc" },
        take: 1,
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  const gridData: Record<string, CeldaInfo> = {}
  for (const slot of slots) {
    const key = `${slot.diaSemana}-${slot.horaInicio}`
    gridData[key] = {
      slotId: slot.id,
      activo: slot.activo,
      alumno: slot.reservas[0]?.student ?? null,
    }
  }

  const students = await db.user.findMany({
    where: { tenantId: user.tenantId, rol: UserRol.STUDENT },
    select: { id: true, name: true, email: true },
  })

  const appUrl = process.env.NEXTAUTH_URL ?? "https://app-tenis.vercel.app"
  const inviteLink = `${appUrl}/unirse/${user.tenant?.subdominio}`

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </a>
        <h1 className="text-lg font-bold text-gray-900">Gestión de turnos</h1>
      </nav>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

        {/* Link de invitación para alumnos */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-1">
            Link para que tus alumnos se unan
          </p>
          <p className="text-xs text-green-600 font-mono break-all mb-3">{inviteLink}</p>
          <CopyButton text={inviteLink} />
        </div>

        {/* Instrucción breve */}
        <p className="text-xs text-gray-400 px-1">
          Tocá cualquier celda para bloquear un horario o asignar un alumno.
        </p>

        {/* Grilla */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6">
          <GrillaTurnos gridData={gridData} students={students} />
        </div>

      </main>
    </div>
  )
}
