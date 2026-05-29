"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { BookingEstado } from "@/generated/prisma/enums"
import { revalidatePath } from "next/cache"

export async function cancelarTurno(bookingId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  const booking = await db.booking.findUnique({ where: { id: bookingId } })

  // Solo puede cancelar sus propias reservas
  if (!booking || booking.studentId !== session.user.id) return

  await db.booking.update({
    where: { id: bookingId },
    data: { estado: BookingEstado.CANCELADO },
  })

  revalidatePath("/dashboard/mis-turnos")
}
