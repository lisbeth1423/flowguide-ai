-- Nunca existió una política UPDATE para guide_versions ni quizzes. Sin eso, Postgres
-- bloquea el UPDATE para TODOS en silencio (no tira error, simplemente no cambia
-- ninguna fila) — así que editar el CONTENIDO de una guía (objetivo, precondiciones,
-- pasos, advertencias, resultado esperado, quick guide, FAQ, preguntas de examen)
-- nunca se guardaba de verdad, ni en guías de empresa ni en guías genéricas. Solo
-- título/módulo/sistema se guardaban, porque esos viven en la tabla "guides", que sí
-- tenía su política UPDATE (ver 0002_rls.sql y 0004_generic_content.sql).
--
-- Misma lógica que ya usan guide_versions_insert / quizzes_insert: puede editar
-- quien sea platform admin (si la guía es genérica) o admin/editor de la empresa
-- dueña (si no lo es).
create policy guide_versions_update on guide_versions for update
  using (
    exists (
      select 1 from guides g
      where g.id = guide_versions.guide_id
        and (
          (g.is_generic = true and is_platform_admin())
          or (g.is_generic = false and has_company_role(g.client_company_id, array['admin', 'editor']))
        )
    )
  );

create policy quizzes_update on quizzes for update
  using (
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
