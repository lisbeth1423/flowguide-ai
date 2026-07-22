-- Arregla datos que ya quedaron cargados con "Sistema" en mayúsculas/formato distinto
-- antes de que la UI empezara a forzar una lista fija (ver src/lib/catalog.ts y
-- src/components/system-select.tsx). Ejemplo real: "SAP Business One" vs
-- "SAP BUSINESS ONE" quedaban como dos grupos separados en /platform-admin/guides,
-- y una empresa con uno de esos dos valores no recibía el contenido genérico del otro.
--
-- Si en el futuro aparece otro caso de "mismo sistema, texto distinto", se agrega acá
-- una línea más con el mismo patrón (comparación case-insensitive con ilike).
update client_companies
  set system = 'SAP Business One'
  where lower(system) = lower('SAP Business One') and system <> 'SAP Business One';

update guides
  set system = 'SAP Business One'
  where lower(system) = lower('SAP Business One') and system <> 'SAP Business One';
