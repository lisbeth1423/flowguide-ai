// Catálogo de sistemas ERP/POS soportados. Es una lista FIJA a propósito: antes
// "Sistema" era texto libre, y "SAP Business One" vs "SAP BUSINESS ONE" quedaban
// como dos valores distintos para la base de datos — rompía el match de contenido
// genérico (ver src/app/api/guides/match/route.ts, que compara con "=" exacto) y
// partía la biblioteca en grupos separados que en realidad son el mismo sistema.
//
// Si hace falta agregar un sistema nuevo, se agrega acá UNA sola vez y ya queda
// disponible en los 4 lugares que lo usan (ver src/components/system-select.tsx).
export const SYSTEMS = [
  "SAP Business One",
  "SAP S/4HANA",
  "Odoo",
  "Microsoft Dynamics 365 Business Central",
  "NetSuite",
  "QuickBooks",
] as const;
