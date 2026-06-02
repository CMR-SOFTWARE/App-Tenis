// Extensión de tipos de Auth.js
// Agregamos nuestros campos custom a Session y JWT para tener autocompletado

import type { NivelJugador, UserRol } from "@/generated/prisma/enums"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      rol: UserRol
      tenantId: string | null
      nivelJugador: NivelJugador | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    rol?: UserRol
    tenantId?: string | null
    nivelJugador?: NivelJugador | null
  }
}
