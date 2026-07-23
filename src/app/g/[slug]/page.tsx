import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { GuestExperience } from '@/components/guest/GuestExperience'
import type { GuestMenuItem } from '@/lib/guestExperience'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type GuestMenuRow = {
  id: string
  restaurant_id: string
  producto_id: string | null
  nombre_publico: string
  categoria_publica: string
  tipo: GuestMenuItem['tipo']
  descripcion: string | null
  foto_url: string | null
  precio: number | null
  disponible_copa: boolean | null
  precio_copa: number | null
  bodega: string | null
  anada: string | null
  origen: string | null
  uva: string | null
  cuerpo: string | null
  tanino: string | null
  temperatura: string | null
  maridajes: string[] | null
  etiquetas: string[] | null
  perfil_vino: GuestMenuItem['perfil_vino'] | null
  notas_cata: string[] | null
  destacado: boolean
  orden: number
}

function mapGuestMenuRow(row: GuestMenuRow): GuestMenuItem {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    producto_id: row.producto_id,
    nombre: row.nombre_publico,
    categoria: row.categoria_publica,
    tipo: row.tipo,
    descripcion: row.descripcion,
    foto_url: row.foto_url,
    precio: row.precio === null ? null : Number(row.precio),
    disponible_copa: Boolean(row.disponible_copa),
    precio_copa: row.precio_copa === null ? null : Number(row.precio_copa),
    bodega: row.bodega,
    anada: row.anada,
    origen: row.origen,
    uva: row.uva,
    cuerpo: row.cuerpo,
    tanino: row.tanino,
    temperatura: row.temperatura,
    maridajes: row.maridajes ?? [],
    etiquetas: row.etiquetas ?? [],
    perfil_vino: row.perfil_vino ?? null,
    notas_cata: row.notas_cata ?? [],
    destacado: row.destacado,
    orden: row.orden,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data: restaurant } = await supabase
    .from('restaurantes')
    .select('nombre,activo')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (!restaurant) {
    return {
      title: 'Carta no disponible | Nexo',
      robots: { index: false, follow: false },
    }
  }

  const title = `${restaurant.nombre} | Nexo Guest Experience`
  const description = `Carta interactiva de ${restaurant.nombre}: vinos, copas y recomendaciones del sommelier.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default async function GuestRestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurantes')
    .select('id,nombre,slug,activo')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (restaurantError || !restaurant) {
    notFound()
  }

  const { data: rows, error: menuError } = await supabase
    .from('guest_menu_items')
    .select(
      'id,restaurant_id,producto_id,nombre_publico,categoria_publica,tipo,descripcion,foto_url,precio,disponible_copa,precio_copa,bodega,anada,origen,uva,cuerpo,tanino,temperatura,maridajes,etiquetas,perfil_vino,notas_cata,destacado,orden'
    )
    .eq('restaurant_id', restaurant.id)
    .eq('publicado', true)
    .order('destacado', { ascending: false })
    .order('orden', { ascending: true })
    .order('nombre_publico', { ascending: true })

  if (menuError) {
    throw new Error(menuError.message)
  }

  return <GuestExperience restaurantName={restaurant.nombre} items={(rows ?? []).map(mapGuestMenuRow)} />
}
