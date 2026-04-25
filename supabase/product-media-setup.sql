alter table if exists public.productos
add column if not exists imagen_url text;

alter table if exists public.productos
add column if not exists icono text;
