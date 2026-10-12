-- Esquema base de Nexo para proyectos Supabase nuevos.
-- Ejecutar antes de auth-setup.sql. Las migraciones posteriores completan RLS,
-- aislamiento multi-restaurante, columnas financieras y operaciones atomicas.

create extension if not exists pgcrypto;

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null default 'Otros',
  unidad text not null default 'uds',
  stock_actual numeric(12,4) not null default 0,
  stock_minimo numeric(12,4) not null default 0,
  referencia text not null default '',
  activo boolean not null default true,
  archivado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cif text not null default '',
  telefono text not null default '',
  email text not null default '',
  notas text not null default '',
  activo boolean not null default true,
  archivado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'consumo', 'ajuste')),
  cantidad numeric(12,4) not null default 0,
  motivo text not null default '',
  origen_tipo text not null default '',
  origen_id uuid,
  stock_antes numeric(12,4) not null default 0,
  stock_despues numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.albaranes (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  proveedor_nombre text not null default '',
  fecha date not null default current_date,
  notas text not null default '',
  total numeric(14,4) not null default 0,
  foto_url text not null default '',
  ocr_texto text not null default '',
  anulado boolean not null default false,
  anulado_motivo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.albaran_lineas (
  id uuid primary key default gen_random_uuid(),
  albaran_id uuid not null references public.albaranes(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre_producto text not null default '',
  cantidad numeric(12,4) not null default 0,
  precio_unitario numeric(14,6) not null default 0,
  subtotal numeric(14,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  entidad text not null,
  entidad_id uuid,
  accion text not null,
  actor_nombre text not null default '',
  actor_id uuid,
  detalle text not null default '',
  payload_antes jsonb,
  payload_despues jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_tpv text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recetas_lineas (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mapeos_productos (
  id uuid primary key default gen_random_uuid(),
  nombre_externo text not null,
  producto_id uuid references public.productos(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tpv_importaciones (
  id uuid primary key default gen_random_uuid(),
  nombre_archivo text not null,
  procesado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tpv_ventas_crudas (
  id uuid primary key default gen_random_uuid(),
  importacion_id uuid not null references public.tpv_importaciones(id) on delete cascade,
  producto_externo text not null,
  cantidad numeric(12,4) not null default 0,
  fecha timestamptz not null,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists movimientos_stock_producto_idx
  on public.movimientos_stock(producto_id, created_at desc);
create index if not exists albaran_lineas_albaran_idx
  on public.albaran_lineas(albaran_id);
create index if not exists recetas_lineas_receta_idx
  on public.recetas_lineas(receta_id);
create index if not exists tpv_ventas_crudas_importacion_idx
  on public.tpv_ventas_crudas(importacion_id);

insert into storage.buckets (id, name, public)
values ('albaranes', 'albaranes', false)
on conflict (id) do update set public = excluded.public;
