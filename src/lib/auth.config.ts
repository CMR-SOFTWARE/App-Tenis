// Configuración LIVIANA de Auth.js — solo para el middleware (Edge Runtime)
//
// El middleware corre en Edge Runtime: un entorno JS liviano sin Node.js completo.
// Prisma usa módulos de Node (node:path, node:url) que NO funcionan en Edge.
// Por eso separamos la config en dos archivos:
//   - auth.config.ts (este) → sin Prisma, funciona en Edge → lo usa el proxy
//   - auth.ts → con Prisma, solo se usa en el servidor normal

import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import type { NivelJugador, UserRol } from "@/generated/prisma/enums"

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // JWT strategy: la sesión se guarda en una cookie cifrada, no en la BD
  // Ventaja: el middleware puede verificar la sesión sin tocar la BD
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    // jwt() se ejecuta al crear o actualizar el token
    // Cuando el usuario se loguea, guardamos sus datos custom en el token
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { rol: UserRol; tenantId: string | null; nivelJugador: NivelJugador | null }
        token.id = user.id
        token.rol = u.rol
        token.tenantId = u.tenantId
        token.nivelJugador = u.nivelJugador
      }
      return token
    },

    // session() convierte el token JWT en el objeto session que usamos en la app
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.rol = token.rol as UserRol
      session.user.tenantId = token.tenantId as string | null
      session.user.nivelJugador = (token.nivelJugador as NivelJugador | null) ?? null
      return session
    },

    // authorized() decide si una ruta es accesible
    // Se usa en el proxy para proteger rutas sin tocar la BD
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isPublic =
        nextUrl.pathname === "/" ||
        ["/login", "/api/auth"].some((p) => nextUrl.pathname.startsWith(p))
      if (isPublic) return true
      if (!isLoggedIn) return false
      return true
    },
  },
}
