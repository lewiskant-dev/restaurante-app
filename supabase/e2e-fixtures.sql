-- Datos exclusivos para el proyecto Supabase E2E. No ejecutar en produccion.
-- Las cuentas deben existir previamente en auth.users.

do $$
begin
  if (select count(*) from auth.users where email in (
    'e2e-empleado@nexo.test',
    'e2e-encargado@nexo.test',
    'e2e-admin@nexo.test',
    'e2e-master@nexo.test',
    'e2e-restaurante-a@nexo.test',
    'e2e-restaurante-b@nexo.test'
  )) <> 6 then
    raise exception 'Faltan cuentas E2E en auth.users';
  end if;
end $$;

insert into public.restaurantes (nombre, slug, activo)
values
  ('E2E Restaurante A', 'e2e-restaurante-a', true),
  ('E2E Restaurante B', 'e2e-restaurante-b', true)
on conflict (slug) do update
set nombre = excluded.nombre, activo = excluded.activo;

with scopes as (
  select
    u.id as user_id,
    u.email,
    case
      when u.email = 'e2e-empleado@nexo.test' then 'empleado'
      when u.email = 'e2e-encargado@nexo.test' then 'encargado'
      when u.email in (
        'e2e-admin@nexo.test',
        'e2e-restaurante-a@nexo.test',
        'e2e-restaurante-b@nexo.test'
      ) then 'administrador'
      else 'master'
    end as app_role,
    case
      when u.email = 'e2e-restaurante-b@nexo.test' then restaurant_b.id
      else restaurant_a.id
    end as current_restaurant_id,
    case
      when u.email = 'e2e-master@nexo.test' then array[restaurant_a.id, restaurant_b.id]
      when u.email = 'e2e-restaurante-b@nexo.test' then array[restaurant_b.id]
      else array[restaurant_a.id]
    end as restaurant_ids
  from auth.users u
  cross join lateral (
    select id from public.restaurantes where slug = 'e2e-restaurante-a'
  ) restaurant_a
  cross join lateral (
    select id from public.restaurantes where slug = 'e2e-restaurante-b'
  ) restaurant_b
  where u.email like 'e2e-%@nexo.test'
)
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', scopes.app_role,
  'current_restaurant_id', scopes.current_restaurant_id::text,
  'restaurant_ids', to_jsonb(scopes.restaurant_ids)
)
from scopes
where u.id = scopes.user_id;

delete from public.usuario_restaurantes
where user_id in (
  select id from auth.users where email like 'e2e-%@nexo.test'
);

with restaurant_a as (
  select id from public.restaurantes where slug = 'e2e-restaurante-a'
),
restaurant_b as (
  select id from public.restaurantes where slug = 'e2e-restaurante-b'
),
assignments(email, restaurant_id, role, is_default) as (
  select 'e2e-empleado@nexo.test', restaurant_a.id, 'empleado', true from restaurant_a
  union all select 'e2e-encargado@nexo.test', restaurant_a.id, 'encargado', true from restaurant_a
  union all select 'e2e-admin@nexo.test', restaurant_a.id, 'administrador', true from restaurant_a
  union all select 'e2e-master@nexo.test', restaurant_a.id, 'master', true from restaurant_a
  union all select 'e2e-master@nexo.test', restaurant_b.id, 'master', false from restaurant_b
  union all select 'e2e-restaurante-a@nexo.test', restaurant_a.id, 'administrador', true from restaurant_a
  union all select 'e2e-restaurante-b@nexo.test', restaurant_b.id, 'administrador', true from restaurant_b
)
insert into public.usuario_restaurantes (user_id, restaurant_id, role, is_default)
select u.id, assignments.restaurant_id, assignments.role, assignments.is_default
from assignments
join auth.users u on u.email = assignments.email;

insert into public.productos (
  restaurant_id, nombre, categoria, unidad, stock_actual, stock_minimo,
  coste_unitario, referencia, activo, archivado
)
select
  r.id, 'E2E SENTINEL RESTAURANTE A', 'E2E', 'uds', 10, 1,
  1, 'E2E-SENTINEL-A', true, false
from public.restaurantes r
where r.slug = 'e2e-restaurante-a'
  and not exists (
    select 1 from public.productos p
    where p.restaurant_id = r.id and p.referencia = 'E2E-SENTINEL-A'
  );

insert into public.productos (
  restaurant_id, nombre, categoria, unidad, stock_actual, stock_minimo,
  coste_unitario, referencia, activo, archivado
)
select
  r.id, 'E2E SENTINEL RESTAURANTE B', 'E2E', 'uds', 20, 2,
  2, 'E2E-SENTINEL-B', true, false
from public.restaurantes r
where r.slug = 'e2e-restaurante-b'
  and not exists (
    select 1 from public.productos p
    where p.restaurant_id = r.id and p.referencia = 'E2E-SENTINEL-B'
  );

select
  u.email,
  u.raw_app_meta_data ->> 'role' as role,
  u.raw_app_meta_data ->> 'current_restaurant_id' as current_restaurant_id,
  u.raw_app_meta_data -> 'restaurant_ids' as restaurant_ids
from auth.users u
where u.email like 'e2e-%@nexo.test'
order by u.email;
