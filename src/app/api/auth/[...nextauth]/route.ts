// Endpoint de Auth.js
// Maneja todas las rutas de autenticación:
//   GET  /api/auth/signin         → página de login
//   GET  /api/auth/signout        → cerrar sesión
//   GET  /api/auth/session        → consultar sesión activa
//   GET  /api/auth/callback/google → callback de Google OAuth
//   POST /api/auth/signin/google  → iniciar login con Google
//   ... y más rutas internas de Auth.js
//
// Con el spread [...nextauth] Next.js captura todas esas rutas
// y las delega a los handlers que configuramos en auth.ts

import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
