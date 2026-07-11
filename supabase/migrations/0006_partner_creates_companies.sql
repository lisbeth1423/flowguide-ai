-- FlowGuide — deja que un partner admin cree empresas cliente nuevas bajo su propio
-- partner, sin necesitar el service role / SQL Editor.
--
-- Hasta ahora client_companies no tenía NINGUNA política de INSERT (solo select y
-- update), así que ni siquiera un partner_admin podía crear una empresa nueva desde
-- la app — por eso se venía haciendo a mano en el SQL Editor. Esto lo destraba: un
-- usuario que figure en partner_admins para ese partner puede insertar una empresa
-- nueva bajo ese mismo partner. No hace falta agregarle además una fila en
-- user_client_access para esa empresa nueva: un partner_admin ya tiene acceso
-- "admin" implícito a TODAS las empresas de su partner (ver has_company_access /
-- has_company_role en supabase/migrations/0002_rls.sql).

create policy client_companies_insert on client_companies for insert
  with check (
    exists (
      select 1 from partner_admins pa
      where pa.partner_id = client_companies.partner_id
        and pa.user_id = auth.uid()
    )
  );
