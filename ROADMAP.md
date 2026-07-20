# Roadmap FlowGuide (post Sprint 1)

Plan de prioridades para ir mejorando el producto en tandas manejables, en vez de
saltar de pedido en pedido. Se actualiza a medida que se termina o se reprioriza algo
— avisale a Claude "actualizá el roadmap" después de cada tanda.

Cómo leer las prioridades: **Ahora** = próxima sesión de trabajo. **Siguiente** = la
tanda después de esa. **Después** / **Más adelante** = con menos urgencia, se
reordenan solos a medida que el negocio lo pida.

## Ahora

- [x] Diagrama Mermaid de los pasos de una guía (gratis, sin IA — código
      determinístico a partir de `pasos`). Caso simple (lineal) resuelto; ramas
      (aprobado/rechazado) quedan para cuando exista `step_rules` (ver abajo).

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
