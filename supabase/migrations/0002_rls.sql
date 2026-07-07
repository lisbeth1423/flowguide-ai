-- FlowGuide AI — Row Level Security
-- Helper functions centralize the "does auth.uid() have access / role in this company" check
-- so every table policy stays a one-liner instead of repeating the join logic.

create or replace function has_company_access(target_company_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from user_client_access uca
    where uca.client_company_id = target_company_id
      and uca.user_id = auth.uid()
  )
  or exists (
    select 1 from partner_admins pa
    join client_companies cc on cc.partner_id = pa.partner_id
    where cc.id = target_company_id
      and pa.user_id = auth.uid()
  );
$$;

create or replace function has_company_role(target_company_id uuid, roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from user_client_access uca
    where uca.client_company_id = target_company_id
      and uca.user_id = auth.uid()
      and uca.role = any(roles)
  )
  or exists (
    -- partner admins act as 'admin' in every company under their partner
    select 1 from partner_admins pa
    join client_companies cc on cc.partner_id = pa.partner_id
    where cc.id = target_company_id
      and pa.user_id = auth.uid()
  );
$$;

alter table partners enable row level security;
alter table client_companies enable row level security;
alter table partner_admins enable row level security;
alter table user_client_access enable row level security;
alter table knowledge_sources enable row level security;
alter table guides enable row level security;
alter table guide_versions enable row level security;
alter table quizzes enable row level security;
alter table quiz_attempts enable row level security;
alter table guide_reads enable row level security;

-- partners: visible if the user administers it or has access to any company under it
create policy partners_select on partners for select
  using (
    exists (select 1 from partner_admins pa where pa.partner_id = partners.id and pa.user_id = auth.uid())
    or exists (
      select 1 from client_companies cc
      where cc.partner_id = partners.id and has_company_access(cc.id)
    )
  );

-- client_companies
create policy client_companies_select on client_companies for select
  using (has_company_access(id));

-- partner_admins: a user can see their own admin grants (used to check status / list partner's companies)
create policy partner_admins_select on partner_admins for select
  using (user_id = auth.uid());

-- user_client_access: see your own row, or all rows for companies you admin/edit (for the "who has read this" report)
create policy user_client_access_select on user_client_access for select
  using (user_id = auth.uid() or has_company_role(client_company_id, array['admin', 'editor']));

create policy user_client_access_insert on user_client_access for insert
  with check (has_company_role(client_company_id, array['admin']));

create policy user_client_access_update on user_client_access for update
  using (has_company_role(client_company_id, array['admin']));

create policy user_client_access_delete on user_client_access for delete
  using (has_company_role(client_company_id, array['admin']));

-- knowledge_sources
create policy knowledge_sources_select on knowledge_sources for select
  using (has_company_access(client_company_id));

create policy knowledge_sources_insert on knowledge_sources for insert
  with check (has_company_role(client_company_id, array['admin', 'editor']));

-- guides
create policy guides_select on guides for select
  using (has_company_access(client_company_id));

create policy guides_insert on guides for insert
  with check (has_company_role(client_company_id, array['admin', 'editor']));

create policy guides_update on guides for update
  using (has_company_role(client_company_id, array['admin', 'editor']));

create policy guides_delete on guides for delete
  using (has_company_role(client_company_id, array['admin', 'editor']));

-- guide_versions: access derives from the parent guide's company
create policy guide_versions_select on guide_versions for select
  using (
    exists (
      select 1 from guides g
      where g.id = guide_versions.guide_id and has_company_access(g.client_company_id)
    )
  );

create policy guide_versions_insert on guide_versions for insert
  with check (
    exists (
      select 1 from guides g
      where g.id = guide_versions.guide_id and has_company_role(g.client_company_id, array['admin', 'editor'])
    )
  );

-- quizzes: access derives from the guide_version -> guide -> company chain
create policy quizzes_select on quizzes for select
  using (
    exists (
      select 1 from guide_versions gv
      join guides g on g.id = gv.guide_id
      where gv.id = quizzes.guide_version_id and has_company_access(g.client_company_id)
    )
  );

create policy quizzes_insert on quizzes for insert
  with check (
    exists (
      select 1 from guide_versions gv
      join guides g on g.id = gv.guide_id
      where gv.id = quizzes.guide_version_id and has_company_role(g.client_company_id, array['admin', 'editor'])
    )
  );

-- quiz_attempts: a learner sees/creates their own attempts; admins/editors see all attempts for reporting
create policy quiz_attempts_select on quiz_attempts for select
  using (user_id = auth.uid() or has_company_role(client_company_id, array['admin', 'editor']));

create policy quiz_attempts_insert on quiz_attempts for insert
  with check (user_id = auth.uid() and has_company_access(client_company_id));

-- guide_reads: same pattern as quiz_attempts
create policy guide_reads_select on guide_reads for select
  using (user_id = auth.uid() or has_company_role(client_company_id, array['admin', 'editor']));

create policy guide_reads_insert on guide_reads for insert
  with check (user_id = auth.uid() and has_company_access(client_company_id));
