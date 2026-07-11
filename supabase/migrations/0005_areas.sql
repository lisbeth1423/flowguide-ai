-- FlowGuide — permisos por área/departamento (ej. alguien de Compras no ve guías de
-- Finanzas o Ventas, aunque tenga acceso a la misma empresa).
--
-- Reutiliza el mismo campo `module` que ya tienen las guías (el que arma los chips en
-- "Aprender", ej. "Facturación", "Compras") — así no hace falta inventar una lista
-- nueva de departamentos por separado, un usuario simplemente tiene permitidos ciertos
-- valores de `module`.
--
-- Reglas (decididas con la usuaria):
--   - Un admin o editor de la empresa SIEMPRE ve todas las guías, sin importar su área
--     — las necesita para poder gestionar el contenido de cualquier departamento.
--   - Un viewer/aprendiz sin ninguna área asignada (areas vacío o null) también ve
--     todo — así no se rompe para usuarios ya existentes que todavía no tienen áreas
--     configuradas. La restricción es opt-in: recién se activa cuando se le asignan
--     áreas puntuales a ese usuario.
--   - Un viewer/aprendiz CON áreas asignadas solo ve guías sin módulo (module is null,
--     o sea "generales") o cuyo módulo esté en su lista de áreas.
--   - Esto solo aplica a guías DE LA EMPRESA (client_company_id). Las guías genéricas
--     (is_generic=true) no tienen una sola empresa de referencia, así que ese filtro
--     se hace en el código de la aplicación en vez de en RLS — ver
--     src/app/app/[companyId]/learn/page.tsx y src/app/api/guides/match/route.ts.

alter table user_client_access
  add column areas text[];

create or replace function has_guide_module_access(target_company_id uuid, guide_module text)
returns boolean
language sql
security definer
stable
as $$
  select
    has_company_role(target_company_id, array['admin', 'editor'])
    or guide_module is null
    or exists (
      select 1 from user_client_access uca
      where uca.client_company_id = target_company_id
        and uca.user_id = auth.uid()
        and (uca.areas is null or cardinality(uca.areas) = 0 or guide_module = any(uca.areas))
    );
$$;

drop policy guides_select on guides;
create policy guides_select on guides for select
  using (
    is_generic = true
    or (has_company_access(client_company_id) and has_guide_module_access(client_company_id, module))
  );

drop policy guide_versions_select on guide_versions;
create policy guide_versions_select on guide_versions for select
  using (
    exists (
      select 1 from guides g
      where g.id = guide_versions.guide_id
        and (
          g.is_generic = true
          or (has_company_access(g.client_company_id) and has_guide_module_access(g.client_company_id, g.module))
        )
    )
  );

drop policy quizzes_select on quizzes;
create policy quizzes_select on quizzes for select
  using (
    exists (
      select 1 from guide_versions gv
      join guides g on g.id = gv.guide_id
      where gv.id = quizzes.guide_version_id
        and (
          g.is_generic = true
          or (has_company_access(g.client_company_id) and has_guide_module_access(g.client_company_id, g.module))
        )
    )
  );
