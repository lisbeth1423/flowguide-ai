# Roadmap FlowGuide (post Sprint 1)

Plan de prioridades para ir mejorando el producto en tandas manejables, en vez de
saltar de pedido en pedido. Se actualiza a medida que se termina o se reprioriza algo
— avisale a Claude "actualizá el roadmap" después de cada tanda.

Cómo leer las prioridades: **Ahora** = próxima sesión de trabajo. **Siguiente** = la
tanda después de esa. **Después** / **Más adelante** = con menos urgencia, se
reordenan solos a medida que el negocio lo pida.

## Ahora

- [ ] **Confirmar que los backups automáticos de Supabase estén activos** (Project
      Settings → Database → Backups). Es el único componente de toda la arquitectura
      con datos irremplazables si algo sale mal — ver diagrama de arquitectura de esta
      sesión. Antes de tener datos reales de clientes en serio, conviene confirmarlo o
      pasar a Supabase Pro (agrega recuperación punto-en-el-tiempo).
- [ ] Convertir "Módulo" (de las guías) en lista predefinida con selección múltiple,
      igual que ya se hizo con "Sistema" (`src/lib/catalog.ts` +
      `src/components/system-select.tsx`). Mismo riesgo: un typo en Módulo rompe el
      filtro por área de un aprendiz.
- [ ] **Límite de uso en `/api/guides/generate`** (rate limiting real, del lado del
      servidor): hoy la única protección contra gasto excesivo es la confirmación
      manual de costo en el navegador (fácil de saltear). Antes de tener varios
      usuarios con acceso real, conviene un tope server-side (ej. X guías por hora por
      usuario).

## Siguiente

- [ ] **Reglas de negocio a nivel de paso** (`step_rules`): hoy `pasos` es un array de
      strings sueltos. Para soportar bifurcaciones ("si aprobado -> paso X, si
      rechazado -> paso Y") cada paso necesita un `id` estable y volverse un objeto,
      no un string. Esto es la base para diagramas Mermaid con ramas y para lógica
      condicional dentro de una guía.
- [ ] **Modelo de contenido genérico en 2 niveles**: hoy `guides.is_generic` es un
      solo nivel (todo lo genérico es visible para cualquier empresa que matchee
      `system`). Falta separar "FlowGuide Standard" (genérico de toda la plataforma,
      lo trae FlowGuide) de "genérico del partner" (una empresa consultora sube
      contenido que comparte solo entre SUS clientes, no con los de otro partner).
      Necesita una columna nueva (ej. `guides.partner_id` nullable) + ajustar RLS.
- [ ] **Plantillas de empresa + auto-aprovisionamiento**: que un partner pueda crear
      una "plantilla" (conjunto de guías genéricas + config típica de un sistema, ej.
      "plantilla SAP B1 estándar") y al crear una empresa nueva, elegir una plantilla
      para que arranque con contenido precargado en vez de vacía.
- [ ] **Fase 0 — entrevista guiada antes de generar la guía**: en vez de generar
      directo del texto pegado, un flujo de preguntas multi-turno con la IA para
      llenar huecos típicos (¿quién puede hacer este proceso? ¿qué pasa si falla?
      ¿hay aprobación de por medio?) antes de generar la guía final. Sube la calidad
      del output pero es más trabajo de UX (conversación, no un formulario).
- [ ] **Integración real con SAP Business One (Service Layer)**: sync de datos reales
      contra el ERP del cliente (auth por cookie de sesión, credenciales cifradas en
      DB, flujo de aprobación humana antes de aplicar cualquier cambio). Recomendado
      esperar a tener un cliente piloto real con acceso a un SAP B1 antes de construir
      esto — es mucho esfuerzo para probar contra un ambiente ficticio.
- [ ] **Modelo de precios**: decisión de negocio (no de código) que falta definir —
      por asiento, por empresa cliente, por guía generada, etc. Bloquea terminar el
      esquema final de cuentas/facturación, así que conviene resolverla antes de
      invertir tiempo en esa parte del esquema.
- [ ] Upgrade a Vercel Pro y/o Supabase Pro si el uso real con el primer cliente
      piloto lo justifica: hoy ambos están en plan gratuito (límite de 60s por función
      en Vercel, auto-pausa por inactividad en Supabase — mitigada con
      `/api/keepalive`, ver ROADMAP resuelto).

## Después

- [ ] Editor de guías: poder agregar y quitar pasos, preguntas de FAQ, y preguntas de
      examen (hoy solo se puede editar el texto de lo que generó la IA).
- [ ] Campo opcional en cada guía para un link externo (YouTube, Loom, Vimeo, o un
      demo interactivo tipo Arcade/Navattic/Storylane) que se embebe al ver la guía.
- [ ] Documentar (para tener la respuesta lista ante un cliente) en qué región física
      está guardada la base de datos — Supabase → Project Settings → General. Importa
      para clientes que pidan que sus datos no salgan de cierto país.

## Más adelante (evaluar cuando haya más uso real)

- [ ] Sugerencias/alternativas generadas por IA dentro del editor (ej. "sugerime otra
      pregunta de examen"), regenerando solo una parte puntual de la guía.
- [ ] Generar guías a partir de audio/video (transcripción) — Fase 2 del documento
      original del proyecto.
- [ ] Grabación/reproducción de demos interactivos propios (estilo SAP Interactive
      Demos) — antes de construir esto desde cero, evaluar integrar una herramienta ya
      existente (Arcade, Navattic, Storylane, Tango).
- [ ] Autenticación de dos factores (2FA) para login — se vuelve relevante cuando haya
      clientes pagos reales, no tanto en piloto.
- [ ] Auditoría de seguridad externa (pentest) y evaluar certificaciones (SOC 2, ISO
      27001) — solo tiene sentido cuando un cliente grande lo pida explícitamente;
      tiene costo y no vale la pena antes.

## Ya resuelto (para referencia, no para hacer)

Sprint 1 completo + rebrand FlowGuide + colores por empresa + fuentes de texto/link/PDF
+ capturas de pantalla + contenido genérico por sistema + permisos por área + botón
Inicio (logo clicable) + confirmación al guardar Sistema + optimización de
`requireCompanyAccess` (3 consultas en paralelo en vez de una detrás de otra). Ver
`GUIA_DEL_PROYECTO.md` para el mapa completo del código.

Tanda grande de estabilización (sesión de subida de PDFs de SAP):
- Diagrama Mermaid de los pasos de una guía (caso lineal).
- Subida de PDF directo a Supabase Storage desde el navegador (ya no pasa por
  Vercel, que cortaba en ~4.5MB).
- Documentos grandes ya no se recortan: se parten solos en varias guías
  ("Parte N de M"), cada una generada en su propia llamada.
- Cron diario (`/api/keepalive`) para que Supabase no se auto-pause por inactividad.
- Arreglado: sesión vencida devolvía HTML en vez de JSON en 11 rutas /api/*
  (`requireApiUser` en vez de `requireUser` dentro de rutas API).
- Arreglado: `jsdom` (para extraer texto de links) rompía también la subida de PDFs
  por un import estático — ahora es dinámico.
- Cambiado `pdf-parse`/`pdfjs-dist` por `unpdf` (extracción de PDF sin depender de
  `DOMMatrix`/canvas, que no existen en el servidor).
- "Sistema" (empresa y guía genérica) pasó de texto libre a lista fija
  (`src/lib/catalog.ts` + `SystemSelect`) — evita que un typo rompa el match de
  contenido genérico.
- **Bug real encontrado y arreglado**: nunca existió permiso de base de datos (RLS)
  para actualizar el CONTENIDO de una guía (`guide_versions`, `quizzes`) — solo
  select/insert. Editar pasos/FAQ/quiz nunca se guardaba, en ninguna guía, desde
  Sprint 1. Migración `0008_guide_content_update_policies.sql`.
- Botón "Borrar guía" (empresa y genérica).
- "Preguntas clave" (hasta 5 sugerencias clickeables) en la pantalla de Inicio.
- Prompt de generación reescrito para pedir pasos granulares (un clic por paso,
  nombres exactos de botones) en vez de un resumen de máximo 6 pasos.
- Estimación de costo en USD con confirmación antes de generar (mientras dure la
  etapa de prueba con el primer cliente piloto).

Nota sobre velocidad: además de la optimización de arriba, una parte de la lentitud
que se siente en desarrollo es normal — `next dev` compila cada pantalla la PRIMERA
vez que se visita (se ve en los logs como "Compiling..." y tarda varios segundos esa
vez sola); en la versión publicada (`npm run build` + Vercel) eso no pasa. Si sigue
sintiéndose lento después de esta tanda, el siguiente sospechoso sería la región del
proyecto de Supabase (si quedó lejos de donde estás probando, cada consulta tarda más
por la distancia) — se puede revisar en Supabase → Project Settings → General.
