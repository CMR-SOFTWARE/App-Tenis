// Configuración COMPLETA de Auth.js — solo para el servidor (Node.js Runtime)
//
// Este archivo incluye el Prisma Adapter para guardar usuarios en la BD.
// NO se importa en el middleware — solo en Server Components y API routes.

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user?.password) return null
        const ok = await bcrypt.compare(credentials.password as string, user.password)
        return ok ? user : null
      },
    }),
  ],

  adapter: PrismaAdapter(db),
})
