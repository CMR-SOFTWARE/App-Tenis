// Proxy de Next.js 16 (antes se llamaba middleware.ts)
// Se ejecuta ANTES de que se cargue cualquier página
// Usa la config LIVIANA de auth (sin Prisma) para funcionar en Edge Runtime

import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

// Usamos auth(callback) para poder inyectar headers personalizados.
// En este callback req.auth tiene la sesión (null si no está logueado).
// NOTA: cuando se usa auth(callback), el callback "authorized" del config NO se ejecuta;
// la lógica de protección de rutas vive acá.
export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isPublic =
    nextUrl.pathname === "/" ||
    ["/login", "/api/auth", "/reservar", "/unirse"].some((p) => nextUrl.pathname.startsWith(p))

  // Extraer el subdominio del host e inyectarlo para que los Server Components lo lean
  const host = req.headers.get("host") ?? ""
  const subdomain = extractSubdomain(host)
  const requestHeaders = new Headers(req.headers)
  if (subdomain) requestHeaders.set("x-subdominio", subdomain)

  if (!isPublic && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
})

// Solo extrae subdominio si el host termina en .acepro.app
// Así evitamos falsos positivos en Vercel (app-tenis.vercel.app), localhost, etc.
function extractSubdomain(host: string): string | null {
  const hostname = host.split(":")[0]
  if (!hostname.endsWith(".acepro.app")) return null
  const subdomain = hostname.slice(0, -(".acepro.app".length))
  if (!subdomain || subdomain === "www" || subdomain === "app") return null
  return subdomain
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
}
