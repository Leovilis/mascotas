import type { RegionSlug } from '@/config/regions';

export type PartnerCategory = 'veterinaria' | 'petshop' | 'guarderia' | 'peluqueria' | 'refugio' | 'otro';
export type PartnerPlan = 'basico' | 'destacado';

export const PARTNER_CATEGORIES: { value: PartnerCategory; label: string; singular: string; emoji: string }[] = [
  { value: 'veterinaria', label: 'Veterinarias', singular: 'Veterinaria', emoji: '🩺' },
  { value: 'petshop', label: 'Pet shops', singular: 'Pet shop', emoji: '🦴' },
  { value: 'guarderia', label: 'Guarderías y paseadores', singular: 'Guardería / paseador', emoji: '🏡' },
  { value: 'peluqueria', label: 'Peluquerías caninas', singular: 'Peluquería canina', emoji: '✂️' },
  { value: 'refugio', label: 'Refugios y rescatistas', singular: 'Refugio / rescatista', emoji: '❤️' },
  { value: 'otro', label: 'Otros', singular: 'Otro', emoji: '🐾' },
];

export function getPartnerCategory(value: string) {
  return PARTNER_CATEGORIES.find((c) => c.value === value) ?? PARTNER_CATEGORIES[PARTNER_CATEGORIES.length - 1];
}

/** Lo que ve el público (sale de la función get_partner_businesses) */
export interface PartnerBusiness {
  id: string;
  region_slug: RegionSlug;
  name: string;
  category: PartnerCategory;
  description: string | null;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  logo_url: string | null;
  is_24h: boolean;
  plan: PartnerPlan;
  distance_meters: number | null;
}

/** Registro completo que maneja el panel de administración */
export interface PartnerBusinessAdmin extends Omit<PartnerBusiness, 'distance_meters'> {
  active: boolean;
  valid_until: string | null;
  owner_contact: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}
