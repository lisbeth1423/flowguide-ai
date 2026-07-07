# FlowGuide AI — Sprint 1

MVP: texto operativo desordenado → guía + quick guide + FAQ + quiz, con cuentas multi-empresa,
control de acceso por rol, biblioteca de guías, panel admin, y flujo de usuario final (pregunta
libre interpretada por IA + chips de módulo).

## 1. Crear el proyecto de Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project** (tier gratuito alcanza para el
   piloto).
2. Cuando termine de aprovisionar, ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (nunca la expongas al navegador)
3. Pega esos tres valores en `.env.local` (ya existe en la raíz del proyecto, creado a partir de
   `.env.local.example`).

## 2. Correr las migraciones

En el panel de Supabase, ve a **SQL Editor** y corre, en este orden, el contenido completo de:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`

## 3. Obtener la API key de Anthropic

1. Entra a [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) y
   crea una key.
2. Pégala en `.env.local` como `ANTHROPIC_API_KEY`.

## 4. Crear tu primer usuario y empresa de prueba

Sprint 1 no tiene self-signup público (los usuarios se crean por invitación). Para probar:

1. En Supabase, **Authentication → Users → Add user**, crea un usuario con email/contraseña.
   Copia su UUID.
2. En **SQL Editor**, abre `supabase/bootstrap_example.sql`, reemplaza los placeholders
   (`<PARTNER_ID>`, `<CLIENT_COMPANY_ID>`, `<USER_UUID>`) y corre cada `insert` en orden.

## 5. Correr la app

```bash
npm install   # ya se corrió una vez al construir el scaffold
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), inicia sesión con el usuario que creaste.

## 6. Probar el flujo completo

1. **Admin**: entra a la empresa → **Admin** → **+ Nueva guía** → pega un texto desordenado de
   ejemplo (explicación de un proceso) → generar. Debe aparecer en la biblioteca.
2. **Usuario final**: ve a **Aprender**, escribe una pregunta con tus propias palabras (sin usar
   los términos exactos del título de la guía) y confirma que la IA la encuentra igual. Abre la
   guía (queda registrada en `guide_reads`), toma el examen (queda registrado en
   `quiz_attempts`).
3. **Reporte**: vuelve a **Admin → [la guía]** y confirma que aparece la lectura y el intento de
   examen.
4. **Aislamiento entre empresas**: crea una segunda `client_company` (y opcionalmente otro
   usuario con acceso solo a esa empresa) y confirma que las guías de una no se filtran a la
   otra.

## Estructura

- `supabase/migrations/` — esquema SQL y políticas de Row Level Security.
- `src/lib/supabase/` — clientes de Supabase (browser, server, admin/service-role).
- `src/lib/anthropic.ts` — generación de guías y matching de intención vía Claude API.
- `src/lib/auth.ts` — helpers de sesión, empresa activa y rol efectivo.
- `src/proxy.ts` — protección de rutas `/app/**` y `/print/**` (Next.js 16 renombró Middleware a
  Proxy).
- `src/app/app/[companyId]/admin/` — panel admin (biblioteca, crear/editar guía, reportes).
- `src/app/app/[companyId]/learn/` — flujo de usuario final (Camino A + B, guía, quiz).

## Decisiones de scope (Sprint 1)

- UI en español; el campo `language` por guía controla el idioma del contenido generado.
- Export a PDF vía vista imprimible (`/print/[guideId]` + "Guardar como PDF" del navegador) en
  vez de un generador de PDF pesado en servidor. Export a Markdown también disponible.
- Sin self-signup: usuarios se crean por invitación (ver paso 4).
