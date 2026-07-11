# Pendientes

Cosas identificadas pero pospuestas a propósito, para no perderlas entre sesiones.
Cuando se resuelva una, se borra de acá (no hace falta tachar, se borra directo).

## Sistema de la empresa: lista predefinida + selección múltiple

Hoy "Sistema" (en el panel admin de cada empresa) es un campo de texto libre. Dos
problemas detectados:
1. Si dos personas escriben el mismo sistema con mayúsculas/tildes/espacios distintos
   (ej. "SAP Business One" vs "sap business one"), el sistema los trata como cosas
   distintas y el contenido genérico no le llega a una de las dos empresas.
2. Una empresa puede usar VARIOS sistemas a la vez (ej. SAP B1 + SAP CCO + una app a
   medida), no solo uno.

Solución acordada: convertir el campo en una selección múltiple (checkboxes o
multi-select) sacada de una lista predefinida de sistemas/soluciones, en vez de texto
libre. Afecta: `client_companies.system` (tendría que pasar de `text` a `text[]`),
`guides.system` (¿debería poder tener varios sistemas también, o uno solo por guía
genérica?), el formulario de "Nueva guía genérica", y el campo del panel admin.

## Editor de guías más flexible (agregar/quitar filas)

El formulario de editar una guía (tanto normal como genérica) solo deja editar el
TEXTO de los pasos/FAQ/preguntas de examen que ya generó la IA — no deja agregar una
fila nueva ni borrar una que sobra. Agregar botones "+ Agregar paso/pregunta" y
"🗑 Quitar" en cada sección (pasos, FAQ, quiz) en:
- `src/app/app/[companyId]/admin/guides/[guideId]/edit-guide-form.tsx`
- `src/app/platform-admin/guides/[guideId]/edit-generic-guide-form.tsx`

## Sugerencias/alternativas generadas por IA en el editor

Idea: un botón tipo "Sugerime otra pregunta" o "Otra alternativa" al lado de cada
paso/pregunta del editor, que le vuelve a preguntar a Claude solo por esa parte
puntual (con el contexto del resto de la guía) y muestra la alternativa antes de
aceptarla. Requiere un endpoint nuevo (algo como `/api/guides/[guideId]/suggest`) y
definir bien el alcance: ¿regenera un paso solo, una pregunta de examen sola, el
quick guide completo? Se decide cuando se aborde.
