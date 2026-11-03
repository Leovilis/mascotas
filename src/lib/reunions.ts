/**
 * Reencuentros: mascotas que volvieron a casa (estado REUNITED) en los últimos N días.
 * Solo servidor. No devuelve datos de contacto.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { PetSpecies } from '@/types';

export const REUNION_WINDOW_DAYS = 90;

export interface Reunion {
  id: string;
  type: 'lost' | 'found';
  name: string;
  species: PetSpecies;
  photo: string | null;
  address: string | null;
  region_slug: string;
  since: string | null; // fecha en que se perdió / se encontró
  reunited_at: string;
  days: number | null; // días hasta el reencuentro
}

type Row = {
  id: string;
  region_slug: string;
  approximate_address: string | null;
  reunited_at: string;
  last_seen_date?: string | null;
  found_date?: string | null;
  pet: { name: string | null; species: PetSpecies; photos: string[] | null } | null;
};

function daysBetween(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

export async function getRecentReunions(opts: { region?: string; days?: number; limit?: number } = {}): Promise<Reunion[]> {
  const days = opts.days ?? REUNION_WINDOW_DAYS;
  const limit = opts.limit ?? 60;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const supabase = createAdminClient();

  let lostQ = supabase
    .from('lost_reports')
    .select('id, region_slug, approximate_address, reunited_at, last_seen_date, pet:pets(name, species, photos)')
    .eq('status', 'REUNITED')
    .gte('reunited_at', since)
    .order('reunited_at', { ascending: false })
    .limit(limit);
  let foundQ = supabase
    .from('found_reports')
    .select('id, region_slug, approximate_address, reunited_at, found_date, pet:pets(name, species, photos)')
    .eq('status', 'REUNITED')
    .gte('reunited_at', since)
    .order('reunited_at', { ascending: false })
    .limit(limit);
  if (opts.region) {
    lostQ = lostQ.eq('region_slug', opts.region);
    foundQ = foundQ.eq('region_slug', opts.region);
  }

  const [lost, found] = await Promise.all([lostQ, foundQ]);
  if (lost.error) console.warn('[reencuentros] lost_reports:', lost.error.message);
  if (found.error) console.warn('[reencuentros] found_reports:', found.error.message);

  const map = (type: 'lost' | 'found') => (r: Row): Reunion => {
    const start = type === 'lost' ? r.last_seen_date : r.found_date;
    return {
      id: r.id,
      type,
      name: r.pet?.name && r.pet.name !== 'Encontrado' ? r.pet.name : type === 'found' ? 'Encontrada' : 'Mascota',
      species: r.pet?.species || 'dog',
      photo: r.pet?.photos?.[0] || null,
      address: r.approximate_address,
      region_slug: r.region_slug,
      since: start || null,
      reunited_at: r.reunited_at,
      days: daysBetween(start, r.reunited_at),
    };
  };

  return [
    ...((lost.data as unknown as Row[]) || []).map(map('lost')),
    ...((found.data as unknown as Row[]) || []).map(map('found')),
  ]
    .sort((a, b) => b.reunited_at.localeCompare(a.reunited_at))
    .slice(0, limit);
}
