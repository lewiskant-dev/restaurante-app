-- Evita aplicar dos veces el mismo CSV TPV dentro de un restaurante.
-- Los registros antiguos permanecen válidos con archivo_hash nulo.

alter table if exists public.tpv_importaciones
  add column if not exists archivo_hash text;

create unique index if not exists tpv_importaciones_restaurant_hash_idx
  on public.tpv_importaciones (restaurant_id, archivo_hash)
  where archivo_hash is not null;

comment on column public.tpv_importaciones.archivo_hash is
  'Huella SHA-256 del CSV usada para evitar importaciones TPV duplicadas por restaurante.';
