import { cookies } from 'next/headers';
import { getRegion, REGION_COOKIE, REGION_SOURCE_COOKIE, RegionConfig, RegionSource } from '@/config/regions';

/**
 * Región actual del visitante en componentes de servidor.
 * El middleware garantiza que la cookie exista desde el primer request
 * (la setea según ?region=, la IP o el valor por defecto).
 */
export async function getServerRegion(): Promise<{ region: RegionConfig; source: RegionSource }> {
  const store = await cookies();
  const region = getRegion(store.get(REGION_COOKIE)?.value);
  const rawSource = store.get(REGION_SOURCE_COOKIE)?.value;
  const source: RegionSource =
    rawSource === 'manual' || rawSource === 'gps' || rawSource === 'ip' ? rawSource : 'default';
  return { region, source };
}
