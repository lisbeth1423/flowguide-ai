-- FlowGuide — contenido "genérico" (biblioteca compartida por sistema, ej. SAP Business
-- One), visible automáticamente en cualquier empresa cuyo campo `system` coincida.
--
-- Idea general: una guía normal sigue perteneciendo a una sola empresa
-- (client_company_id). Una guía "genérica" (is_generic = true) NO pertenece a ninguna
-- empresa (client_company_id queda null) y en cambio tiene un `system` (ej. "SAP
-- Business One"); la ven automáticamente todas las empresas de la plataforma que
-- tengan ese mismo `system` guardado. No es información sensible de un cliente
-- puntual, así que no hace falta restringirla por empresa/partner — cualquier usuario
-- logueado la puede leer, pero solo un "platform admin" la puede crear/editar.

-- Qué sistema (ERP/POS) usa cada empresa cliente. Lo pone el admin de esa empresa
-- (ver PATCH /api/companies/[companyId]). Si queda null, esa empresa no recibe
-- contenido genérico de ningún sistema todavía.
alter table client_companies
  add column system text;

-- Quita el "not null" de client_company_id en guides y knowledge_sources: una guía
-- genérica no tiene empresa dueña.
alter table guides
  alter column client_company_id drop not null;

alter table knowledge_sources
  alter column client_company_id drop not null;

alter table guides
  add column is_generic boolean not null default false,
  add column system text;

-- Una guía o es de una empresa puntual, o es genérica — nunca las dos cosas a la vez,
-- y nunca ninguna de las dos (eso dejaría una guía "huérfana" sin dueño y sin ser
-- compartida).
alter table guides
  add constraint guides_ownership_check
  check (
    (is_generic = true and client_company_id is null)
    or (is_generic = false and client_company_id is not null)
  );

-- Quién puede administrar el contenido genérico de la plataforma (no está atado a
-- ningún partner ni empresa — es un rol "por encima" de esos). Se otorga a mano vía
-- SQL Editor con el service role, igual que partner_admins.
create table platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table platform_admins enable row level security;

create policy platform_admins_select on platform_admins for select
  using (user_id = auth.uid());

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from platform_admins pa where pa.user_id = auth.uid());
$$;

-- --- Actualiza las políticas existentes de guides/guide_versions/quizzes/
-- knowledge_sources para que también acepten contenido genérico. Se recrean
-- (drop + create) en vez de "or replace" porque las políticas no soportan or replace.

drop policy guides_select on guides;
create policy guides_select on guides for select
  using (is_generic = true or has_company_access(client_company_id));

drop policy guides_insert on guides;
create policy guides_insert on guides for insert
  with check (
    (is_generic = true and is_platform_admin())
    or (is_generic = false and has_company_role(client_company_id, array['admin', 'editor']))
  );

drop policy guides_update on guides;
create policy guides_update on guides for update
  using (
    (is_generic = true and is_platform_admin())
    or (is_generic = false and has_company_role(client_company_id, array['admin', 'editor']))
  );

drop policy guides_delete on guides;
create policy guides_delete on guides for delete
  using (
    (is_generic = true and is_platform_admin())
    or (is_generic = false and has_company_role(client_company_id, array['admin', 'editor']))
  );

drop policy guide_versions_select on guide_versions;
create policy guide_versions_select on guide_versions for select
  using (
    exists (
      select 1 from guides g
      where g.id = guide_versions.guide_id
        and (g.is_generic = true or has_company_access(g.client_company_id))
    )
  );

drop policy guide_versions_insert on guide_versions;
create policy guide_versions_insert on guide_versions for insert
  with check (
    exists (
      select 1 from guides g
      where g.id = guide_versions.guide_id
        and (
          (g.is_generic = true and is_platform_admin())
          or (g.is_generic = false and has_company_role(g.client_company_id, array['admin', 'editor']))
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
        and (g.is_generic = true or has_company_access(g.client_company_id))
    )
  );

drop policy quizzes_insert on quizzes;
create policy quizzes_insert on quizzes for insert
  with check (
    exists (
      select 1 from guide_versions gv
      join guides g on g.id = gv.guide_id
      where gv.id = quizzes.guide_version_id
        and (
          (g.is_generic = true and is_platform_admin())
          or (g.is_generic = false and has_company_role(g.client_company_id, array['admin', 'editor']))
        )
    )
  );

drop policy knowledge_sources_select on knowledge_sources;
create policy knowledge_sources_select on knowledge_sources for select
  using (client_company_id is null or has_company_access(client_company_id));

drop policy knowledge_sources_insert on knowledge_sources;
create policy knowledge_sources_insert on knowledge_sources for insert
  with check (
    (client_company_id is null and is_platform_admin())
    or (client_company_id is not null and has_company_role(client_company_id, array['admin', 'editor']))
  );

-- Permite al admin de una empresa editar sus propios datos (hoy solo hacía falta para
-- poder guardar el campo "system"). No existía ninguna política de update/delete para
-- client_companies todavía.
create policy client_companies_update on client_companies for update
  using (has_company_role(id, array['admin']));
