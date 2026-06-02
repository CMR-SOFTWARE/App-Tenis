import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BookingEstado, NivelJugador, TenantTipo, UserRol } from "@/generated/prisma/enums"
import ProfesorPanel from "./ProfesorPanel"

const NIVEL_LABELS: Record<NivelJugador, string> = {
  SEPTIMA: "7ma",
  SEXTA: "6ta",
  QUINTA: "5ta",
  CUARTA: "4ta",
  TERCERA: "3ra",
  SEGUNDA: "2da",
  PRIMERA: "1ra",
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams

  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  })

  const esProfesor =
    (user?.rol === UserRol.TENANT_OWNER || user?.rol === UserRol.STAFF) &&
    user?.tenant?.tipo !== TenantTipo.CLUB

  const esClub = user?.rol === UserRol.TENANT_OWNER && user?.tenant?.tipo === TenantTipo.CLUB
  const esAlumno = user?.rol === UserRol.STUDENT

  // Datos para el panel del alumno
  let proximaTurno: { fecha: Date; slot: { horaInicio: string } } | null = null
  let totalClasesMes = 0

  if (esAlumno && user) {
    const now = new Date()
    const startOfMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [booking, clasesMes] = await Promise.all([
      db.booking.findFirst({
        where: {
          studentId: user.id,
          estado: BookingEstado.CONFIRMADO,
          fecha: { gte: now },
        },
        orderBy: { fecha: "asc" },
        select: { fecha: true, slot: { select: { horaInicio: true } } },
      }),
      db.booking.count({
        where: {
          studentId: user.id,
          estado: BookingEstado.CONFIRMADO,
          fecha: { gte: startOfMes, lte: endOfMes },
        },
      }),
    ])

    proximaTurno = booking
    totalClasesMes = clasesMes
  }

  const subdominio = user?.tenant?.subdominio
  const nombreAlumno = user?.nombre ?? user?.name?.split(" ")[0] ?? "alumno"

  return (
    <div className="space-y-6">
      {esProfesor && user?.tenantId && (
        <ProfesorPanel tenantId={user.tenantId} mes={mes} subdominio={subdominio} />
      )}

      {esAlumno && user && (
        <div className="space-y-4">
          {/* Greeting */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              Hola, {nombreAlumno}
            </h2>
            {user.nivelJugador && (
              <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                {NIVEL_LABELS[user.nivelJugador]} cat.
              </span>
            )}
          </div>

          {/* Banner: sin profesor */}
          {!user.tenantId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-green-900 text-sm">Encontrá tu profesor</p>
                <p className="text-green-700 text-xs mt-1">
                  Buscá profesores por nombre o ciudad y reservá tus clases
                </p>
              </div>
              <a
                href="/profesores"
                className="shrink-0 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
              >
                Buscar →
              </a>
            </div>
          )}

          {/* Card: mi profesor */}
          {user.tenant && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Mi profesor</p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">{user.tenant.nombre}</p>
                  {user.tenant.ciudad && (
                    <p className="text-xs text-gray-400 mt-0.5">📍 {user.tenant.ciudad}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {user.tenant.whatsapp && (
                    <a
                      href={`https://wa.me/${user.tenant.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-700 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 mb-2">Próxima clase</p>
              {proximaTurno ? (
                <div>
                  <p className="text-lg font-black text-gray-900 leading-none">
                    {proximaTurno.slot.horaInicio}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {DIAS[proximaTurno.fecha.getUTCDay()]}{" "}
                    {proximaTurno.fecha.getUTCDate()}/{proximaTurno.fecha.getUTCMonth() + 1}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin turnos</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 mb-2">Clases este mes</p>
              <p className="text-3xl font-black text-gray-900 leading-none">{totalClasesMes}</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/dashboard/mis-turnos"
              className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors group"
            >
              <p className="text-sm font-semibold text-gray-700 group-hover:text-green-700">
                Mis turnos →
              </p>
              <p className="text-xs text-gray-400 mt-1">Ver y gestionar reservas</p>
            </a>
            <a
              href="/dashboard/mi-perfil"
              className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors group"
            >
              <p className="text-sm font-semibold text-gray-700 group-hover:text-green-700">
                Mi perfil →
              </p>
              <p className="text-xs text-gray-400 mt-1">Actualizar mis datos</p>
            </a>
          </div>
        </div>
      )}

      {esClub && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Panel de club — próximamente</p>
        </div>
      )}
    </div>
  )
}
