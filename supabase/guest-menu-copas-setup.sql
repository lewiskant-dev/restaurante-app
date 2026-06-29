-- Nexo Guest Experience - vinos por copa
-- Ejecutar si la tabla guest_menu_items ya existe.

alter table public.guest_menu_items
add column if not exists disponible_copa boolean not null default false;

alter table public.guest_menu_items
add column if not exists precio_copa numeric(12,2);

alter table public.guest_menu_items
drop constraint if exists guest_menu_items_precio_copa_check;

alter table public.guest_menu_items
add constraint guest_menu_items_precio_copa_check
check (precio_copa is null or precio_copa >= 0);

create index if not exists guest_menu_items_copa_idx
on public.guest_menu_items(restaurant_id, disponible_copa, precio_copa)
where publicado = true and disponible_copa = true;
