import { db } from "@/lib/db"
import { TenantTipo } from "@/generated/prisma/enums"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""

  const clubes = await db.tenant.findMany({
    where: {
      tipo: TenantTipo.CLUB,
      ...(q.length > 0 && {
        nombre: { contains: q, mode: "insensitive" },
      }),
    },
    select: { id: true, nombre: true, subdominio: true, bio: true },
    take: 10,
    orderBy: { nombre: "asc" },
  })

  return Response.json(clubes)
}
