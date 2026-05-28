# Aprendizaje — Semana 1 (26/05/2026)

## Qué hicimos

- Instalamos y configuramos Prisma (ORM para la base de datos)
- Conectamos el proyecto a Supabase (PostgreSQL en la nube)
- Definimos el schema inicial con 9 tablas
- Aplicamos 3 migraciones a la base de datos
- Instalamos y configuramos Auth.js con login via Google
- Creamos la página de login
- Primer usuario logueado y guardado en la base de datos

## Qué aprendimos

### Prisma
- El `schema.prisma` define las tablas y relaciones en código
- `npx prisma migrate dev --name nombre` crea la migración y la aplica a la BD
- `npx prisma generate` genera los tipos TypeScript automáticamente
- Cada migración queda guardada en `prisma/migrations/` como historial
- Prisma 7 usa "driver adapters": hay que pasarle explícitamente el cliente de PostgreSQL (`PrismaPg`)
- El import correcto del cliente generado es `@/generated/prisma/client` (no `@/generated/prisma`)

### Supabase
- La conexión Direct (puerto 5432 directo) usa IPv6 — no funciona en redes domésticas IPv4
- Solución: usar el Session Pooler (puerto 5432 via pooler) que sí soporta IPv4
- La password en la URL va sin corchetes: `postgresql://user:PASSWORD@host/db`

### Auth.js (NextAuth v5)
- El archivo `src/lib/auth.ts` exporta: `auth`, `signIn`, `signOut`, `handlers`
- `handlers` se usa en `src/app/api/auth/[...nextauth]/route.ts` para exponer los endpoints
- El `[...nextauth]` captura todas las rutas de auth con un solo archivo
- El Prisma Adapter conecta Auth.js con nuestra BD — crea usuarios automáticamente al loguearse
- Auth.js necesita el campo `name` (no `nombre`) en el modelo User — es el estándar del adapter
- Se necesita `AUTH_URL` y `AUTH_TRUST_HOST=true` en el `.env` para desarrollo

### Next.js — Server vs Client Components
- Por defecto, todos los componentes son Server Components (corren en el servidor)
- `"use client"` al inicio del archivo lo convierte en Client Component (corre en el browser)
- Client Component se necesita cuando hay `onClick`, `useState`, o cualquier interactividad
- La página de login es Client Component porque tiene un botón con `onClick`

### Patrón Singleton para Prisma
- En desarrollo, Next.js recarga los módulos constantemente (hot reload)
- Sin el patrón singleton, cada recarga crea una nueva conexión a la BD
- Solución: guardar la instancia en `globalThis` que sobrevive al hot reload

## Bugs encontrados y solucionados

| Bug | Causa | Solución |
|-----|-------|----------|
| `P1001 Can't reach database` | Supabase usa IPv6 por defecto | Usar Session Pooler en vez de Direct connection |
| `P1000 Authentication failed` | Password con corchetes `[PASSWORD]` | Poner la password real sin corchetes |
| `Module not found: @/generated/prisma` | Prisma 7 genera `client.ts`, no `index.ts` | Importar de `@/generated/prisma/client` |
| `Expected 1 argument, got 0` | Prisma 7 requiere driver adapter | Instalar `pg @prisma/adapter-pg` y pasar `PrismaPg` |
| `Argument 'nombre' is missing` | Auth.js crea usuario sin `nombre`/`apellido` | Hacer esos campos opcionales (`String?`) |
| `Unknown argument 'name'` | Auth.js usa `name`, nosotros teníamos solo `nombre` | Agregar campo `name String?` al modelo User |
| `TypeError: fetch failed` | Auth.js no sabía la URL del servidor | Agregar `AUTH_URL` y `AUTH_TRUST_HOST` al `.env` |

## Para la próxima sesión

- Crear `/dashboard` — página principal después del login
- Proteger rutas con middleware (si no estás logueado, redirige a `/login`)
- Middleware de subdominios (identificar a qué tenant pertenece cada request)
