// Configuración COMPLETA de Auth.js — solo para el servidor (Node.js Runtime)
//
// Este archivo incluye el Prisma Adapter para guardar usuarios en la BD.
// NO se importa en el middleware — solo en Server Components y API routes.

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Extendemos la config liviana con el adapter de Prisma
  ...authConfig,

  // El adapter conecta Auth.js con nuestra BD:
  // crea el usuario en la tabla 'users' la primera vez que se loguea
  adapter: PrismaAdapter(db),
})
