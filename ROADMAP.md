# Roadmap FlowGuide (post Sprint 1)

Plan de prioridades para ir mejorando el producto en tandas manejables, en vez de
saltar de pedido en pedido. Se actualiza a medida que se termina o se reprioriza algo
— avisale a Claude "actualizá el roadmap" después de cada tanda.

Cómo leer las prioridades: **Ahora** = próxima sesión de trabajo. **Siguiente** = la
tanda después de esa. **Después** / **Más adelante** = con menos urgencia, se
reordenan solos a medida que el negocio lo pida.

## Ahora

_(vacío — los 3 puntos de esta tanda ya se hicieron, ver "Ya resuelto")_

## Siguiente

- [ ] Pantalla para crear empresas (tenants) nuevas desde el panel admin. Hoy se crean
      a mano por SQL Editor — no escala más allá de un puñado de clientes.
- [ ] Convertir "Sistema" (empresa) y los valores de "Módulo" (guías) en listas
      predefinidas con selección múltiple, en vez de texto libre. Evita que un typo
      rompa el match entre empresas y contenido genérico / áreas de usuario.
- [ ] **Límite de uso en `/api/guides/generate`** (rate limiting): hoy cualquier
      admin/editor puede generar guías sin límite, y cada una gasta crédito real de la
      API de Anthropic. Antes de tener clientes reales con acceso, conviene poner un
      tope (ej. X guías por hora por usuario) para que nadie —ni por error, ni por mal
      uso— te vacíe el crédito de la cuenta.

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

Nota sobre velocidad: además de la optimización de arriba, una parte de la lentitud
que se siente en desarrollo es normal — `next dev` compila cada pantalla la PRIMERA
vez que se visita (se ve en los logs como "Compiling..." y tarda varios segundos esa
vez sola); en la versión publicada (`npm run build` + Vercel) eso no pasa. Si sigue
sintiéndose lento después de esta tanda, el siguiente sospechoso sería la región del
proyecto de Supabase (si quedó lejos de donde estás probando, cada consulta tarda más
por la distancia) — se puede revisar en Supabase → Project Settings → General.
