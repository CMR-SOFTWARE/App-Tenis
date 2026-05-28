// Proxy de Next.js 16 (antes se llamaba middleware.ts)
// Se ejecuta ANTES de que se cargue cualquier página
// Usa la config LIVIANA de auth (sin Prisma) para funcionar en Edge Runtime

import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

// Exportamos el auth de la config liviana como el handler del proxy
export const { auth: default_export } = NextAuth(authConfig)
export default default_export

// Qué rutas activa el proxy
// Excluimos archivos estáticos para no ralentizar la app
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
}
