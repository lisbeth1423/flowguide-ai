-- Ejemplo de bootstrap manual para el primer partner + empresa + usuario admin.
-- Sprint 1 no tiene self-signup: crea el usuario en Supabase Auth (Authentication > Users
-- > Add user) primero, copia su UUID, y pégalo abajo antes de correr este script en el
-- SQL Editor de Supabase.

insert into partners (id, name) values
  (gen_random_uuid(), 'Partner de prueba')
returning id; -- copia este id para el insert de abajo

-- Reemplaza <PARTNER_ID> por el id que devolvió el insert anterior.
insert into client_companies (id, partner_id, name) values
  (gen_random_uuid(), '<PARTNER_ID>', 'Empresa cliente de prueba')
returning id; -- copia este id también

-- Reemplaza <CLIENT_COMPANY_ID> y <USER_UUID> (el UUID del usuario creado en Auth).
insert into user_client_access (user_id, client_company_id, role) values
  ('<USER_UUID>', '<CLIENT_COMPANY_ID>', 'admin');

-- Alternativa: si prefieres que el usuario sea admin de TODAS las empresas del partner
-- (rol de partner_admin), usa esto en vez del insert anterior:
-- insert into partner_admins (partner_id, user_id) values ('<PARTNER_ID>', '<USER_UUID>');
