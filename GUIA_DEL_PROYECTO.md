# Guía del proyecto FlowGuide AI (para no-programadores)

Este documento no es para programar — es para **orientarte**: entender qué hay en esta
carpeta, en qué lenguaje está, dónde tocar si algo hay que cambiar, y qué palabras raras
vas a encontrarte cuando hables con un desarrollador (o conmigo) sobre esto.

Para instrucciones de **instalación y puesta en marcha**, ver [README.md](./README.md).

---

## 1. Qué es esto, en una frase

Una app web (se usa desde el navegador, como Gmail o Notion) donde un partner de
implementación de software carga el conocimiento operativo de sus empresas cliente como
texto, una IA (Claude) lo convierte en guías + resúmenes + preguntas frecuentes + examen,
y los empleados de cada empresa cliente pueden buscar esas guías con sus propias
palabras y comprobar que las entendieron con el examen.

## 2. En qué lenguaje/tecnología está hecho

- **TypeScript** (JavaScript con revisión de errores agregada) para todo: tanto lo que
  se ve en pantalla como la lógica de servidor.
- **Next.js**: el "framework" (conjunto de piezas ya armadas) sobre el que corre todo.
  Es el mismo que recomendaba el documento original del proyecto.
- **Supabase**: la base de datos (dónde se guardan las guías, usuarios, empresas) y el
  sistema de login. Es un servicio externo (como tener una base de datos "en la nube").
- **Claude (Anthropic)**: la IA que convierte el texto en guías y que interpreta las
  preguntas de los usuarios.
- **Tailwind CSS**: cómo se define el estilo visual (colores, espaciados) directo en el
  código de cada pantalla, en vez de archivos de estilo separados.

Es un stack (combinación de tecnologías) moderno y muy usado hoy para este tipo de
producto — no es una elección "de prueba", es lo mismo que usan la mayoría de startups
que construyen productos con IA en 2025-2026.

## 3. Glosario rápido

| Palabra | Qué significa acá |
|---|---|
| **Repositorio (repo)** | La carpeta del proyecto con todo su historial de cambios (Git). |
| **Commit** | Una "foto" guardada de cómo estaba el código en un momento dado. |
| **Frontend** | Lo que ve y toca el usuario en el navegador (pantallas, botones). |
| **Backend** | La lógica que corre "atrás", en el servidor: guardar datos, hablar con la IA. |
| **API / endpoint** | Una "puerta" del backend a la que el frontend le pide algo (ej. "generá esta guía"). En este proyecto están en `src/app/api/`. |
| **Base de datos** | Donde se guardan permanentemente los datos (empresas, guías, usuarios, resultados de examen). Es Supabase (por debajo, Postgres). |
| **Tabla** | Una "hoja de cálculo" dentro de la base de datos (ej. la tabla `guides` guarda las guías). |
| **Migración (SQL)** | Un archivo con instrucciones para crear o cambiar las tablas de la base de datos. Están en `supabase/migrations/`. |
| **RLS (Row Level Security)** | Las reglas de seguridad de la base de datos: quién puede ver/editar qué fila de cada tabla. Es LO QUE GARANTIZA que la Empresa A nunca vea las guías de la Empresa B. |
| **Componente** | Un pedazo reutilizable de pantalla (ej. el formulario de login es un componente). |
| **Server / Client Component** | Si un archivo dice `"use client"` arriba, ese código corre en el navegador del usuario. Si no lo dice, corre en el servidor (más seguro y rápido para leer datos). |
| **Proxy** (antes "Middleware") | Código que se ejecuta antes de cada página, para revisar cosas como "¿esta persona inició sesión?". En este proyecto es `src/proxy.ts`. |
| **Prompt** | Las instrucciones en texto que se le mandan a la IA para decirle qué hacer. En este proyecto están en `src/lib/anthropic.ts`. |
| **Deploy / Desplegar** | Publicar la app para que sea accesible en internet (se hace con Vercel). |

## 4. Estructura de carpetas (qué hay adentro)

```
Proyecto_FGAI/
├── README.md                    → cómo instalar y correr el proyecto
├── GUIA_DEL_PROYECTO.md         → este documento
├── .env.local                   → tus claves secretas (Supabase, Anthropic). NUNCA se sube a GitHub.
├── .env.local.example           → plantilla vacía de ese archivo, para saber qué claves hacen falta
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql      → crea todas las tablas de la base de datos
│   │   └── 0002_rls.sql         → crea las reglas de seguridad (quién ve qué)
│   └── bootstrap_example.sql    → ejemplo para crear tu primera empresa/usuario a mano
│
└── src/
    ├── proxy.ts                 → revisa el login antes de cada página
    ├── lib/                     → funciones de ayuda reutilizadas en todo el proyecto
    │   ├── supabase/            → cómo se conecta a la base de datos (3 variantes, ver abajo)
    │   ├── auth.ts              → "¿quién es este usuario?" y "¿qué rol tiene?"
    │   └── anthropic.ts         → TODO lo relacionado a hablarle a la IA (Claude)
    │
    └── app/                     → cada carpeta acá adentro es una "pantalla" o "endpoint"
        ├── login/                        → pantalla de inicio de sesión
        ├── app/                          → selector de empresa (si el usuario tiene varias)
        │   └── [companyId]/              → todo lo que pasa DENTRO de una empresa elegida
        │       ├── admin/                → panel del administrador
        │       │   └── guides/
        │       │       ├── new/          → formulario "nueva guía desde texto"
        │       │       └── [guideId]/    → ver/editar una guía + reportes de lectura
        │       └── learn/                → pantalla del usuario final ("¿qué necesitas resolver hoy?")
        │           └── guide/[guideId]/
        │               └── quiz/         → el examen de esa guía
        ├── print/[guideId]/              → vista imprimible / para PDF
        └── api/                          → los "endpoints" (puertas del backend)
            ├── guides/generate/          → texto desordenado → guía (llama a la IA)
            ├── guides/match/             → interpreta la pregunta del usuario final
            ├── guides/[guideId]/         → editar una guía / exportar a Markdown
            ├── guide-reads/              → registra que alguien abrió una guía
            └── quiz-attempts/            → corrige un examen y guarda el resultado
```

Nota sobre `[companyId]` y `[guideId]`: los corchetes significan "esto es una parte
variable de la dirección web" (el ID real de la empresa o la guía). No es una carpeta
literal llamada "[companyId]".

### Los 3 archivos de `src/lib/supabase/`

Los tres hacen "lo mismo" (conectarse a la base de datos) pero con permisos distintos:

- **`client.ts`**: para usar desde el navegador. Respeta las reglas de seguridad.
- **`server.ts`**: para usar desde el servidor (páginas, endpoints). También respeta
  las reglas de seguridad — es el que más se usa.
- **`admin.ts`**: se SALTA las reglas de seguridad. Solo se usa en 2 casos puntuales
  (buscar el email de un usuario, scripts de arranque). Ver el comentario dentro del
  archivo para más detalle — es el único que hay que tratar con cuidado extra.

## 5. Cómo fluyen las piezas (ejemplo real)

**Cuando un admin genera una guía nueva:**

1. Entra a `/app/[companyId]/admin/guides/new` → llena el formulario y aprieta "Generar".
2. El formulario (`new-guide-form.tsx`, del lado del navegador) le pide a
   `POST /api/guides/generate` que la genere.
3. Esa ruta (`src/app/api/guides/generate/route.ts`, del lado del servidor):
   - Confirma que el usuario tiene permiso (rol admin/editor) en esa empresa.
   - Le manda el texto a Claude (`src/lib/anthropic.ts`) y espera la guía estructurada.
   - Guarda todo en la base de datos (4 tablas: knowledge_sources → guides →
     guide_versions → quizzes).
4. El formulario recibe el ID de la guía nueva y lleva al admin a verla.

**Cuando un usuario final busca algo:**

1. Entra a `/app/[companyId]/learn`, escribe su pregunta con sus propias palabras.
2. Eso llama a `POST /api/guides/match`, que le pasa la pregunta + la lista de guías
   de esa empresa a Claude, y Claude decide cuál(es) responden a la intención.
3. Si hay una sola clara, se abre directo. Si hay varias, se muestran para elegir.
4. Al abrir la guía, queda un registro en la tabla `guide_reads` (visible después en
   el panel admin).

## 6. "Quiero cambiar X, ¿dónde lo toco?"

| Quiero cambiar... | Archivo |
|---|---|
| El texto/instrucciones que recibe la IA para generar guías | `src/lib/anthropic.ts` (dentro de `generateGuide`, el texto `system:`) |
| Cuántos pasos/preguntas máximo tiene una guía (hoy: 6 pasos, 2 FAQ, 3 quiz) | `src/lib/anthropic.ts` (`GUIDE_SCHEMA`, más el texto `system`) |
| El % mínimo para aprobar un examen (hoy: 70%) | `src/app/api/quiz-attempts/route.ts` (`PASS_THRESHOLD`) |
| Qué modelo de Claude se usa | `src/lib/anthropic.ts` (constante `MODEL`) |
| Los textos/colores de la pantalla de login | `src/app/login/page.tsx` |
| Los links del menú de arriba (Aprender/Admin/Salir) | `src/app/app/[companyId]/layout.tsx` |
| Qué roles pueden entrar al panel admin | `src/lib/auth.ts` (función `canManageGuides`) |
| Las tablas de la base de datos (agregar una columna nueva, etc.) | `supabase/migrations/` — se agrega un archivo NUEVO (`0003_...sql`), nunca se edita uno viejo que ya se corrió en producción |
| Quién puede ver/editar qué (reglas de seguridad) | `supabase/migrations/0002_rls.sql` — **tocar con mucho cuidado**, ver sección 7 |
| El formato del archivo Markdown exportado | `src/app/api/guides/[guideId]/export/route.ts` |
| El diseño de la vista para imprimir/PDF | `src/app/print/[guideId]/page.tsx` |

## 7. Sobre la seguridad (RLS) — la parte más delicada

Las reglas en `supabase/migrations/0002_rls.sql` son las que garantizan que **una
empresa cliente nunca vea los datos de otra**, y que un "aprendiz" no pueda editar
guías. Si alguna vez alguien reporta "estoy viendo guías que no son de mi empresa" o
"puedo editar algo que no debería", el problema está ahí (o en cómo se llama a esa
regla desde el código).

Regla de oro si van a tocar este archivo: **cualquier cambio ahí se prueba creando dos
empresas de prueba con usuarios distintos y confirmando que siguen sin verse entre
sí**, antes de darlo por bueno. No es un archivo para "probar y ver qué pasa" en un
proyecto con datos reales de clientes.

## 8. Si algo se rompe

1. Mirá el mensaje de error tal cual aparece (en la pantalla o en la consola donde
   corre `npm run dev`) — cópialo entero.
2. Volvé a esta conversación (o a Claude Code) con: qué estabas haciendo, el mensaje
   de error completo, y qué archivo tocaste último (si tocaste alguno).
3. Antes de tocar `supabase/migrations/0002_rls.sql` o borrar datos de la base,
   preguntá primero — son los dos lugares donde un error se nota menos al toque pero
   puede tener más consecuencias.
