/**
 * DETECCIÓN DE PROVINCIA POR COORDENADAS
 * Separado de regions.ts porque incluye los polígonos de límites (~50 KB);
 * así solo lo cargan las pantallas que lo necesitan (GPS, fichas, mapa, alta de avisos).
 */
import { DEFAULT_REGION, REGION_LIST, RegionConfig, RegionSlug } from './regions';
import { REGION_BOUNDARIES } from './region-boundaries';

/** Si el punto está a menos de esta distancia de una ciudad configurada, gana esa ciudad (corrige bordes en ríos/costas) */
const CITY_SNAP_KM = 3;
/** Tolerancia para puntos que caen apenas fuera de todo polígono (costa, bordes simplificados) */
const MAX_OUTSIDE_KM = 10;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Ray casting sobre un anillo plano [lng, lat, lng, lat, ...] */
function inRing(lat: number, lng: number, ring: number[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRegionPolygon(lat: number, lng: number, slug: RegionSlug): boolean {
  return REGION_BOUNDARIES[slug].some(
    (rings) => inRing(lat, lng, rings[0]) && !rings.slice(1).some((hole) => inRing(lat, lng, hole))
  );
}

/** Distancia aproximada (km) del punto al borde más cercano de la provincia */
function distanceToRegionKm(lat: number, lng: number, slug: RegionSlug): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (const rings of REGION_BOUNDARIES[slug]) {
    const ring = rings[0];
    for (let i = 0; i < ring.length - 2; i += 2) {
      const ax = (ring[i] - lng) * kx, ay = (ring[i + 1] - lat) * ky;
      const bx = (ring[i + 2] - lng) * kx, by = (ring[i + 3] - lat) * ky;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
      const px = ax + t * dx, py = ay + t * dy;
      best = Math.min(best, Math.sqrt(px * px + py * py));
    }
  }
  return best;
}

const REGIONS_BY_AREA = [...REGION_LIST].sort(
  (a, b) =>
    (a.bounds.maxLat - a.bounds.minLat) * (a.bounds.maxLng - a.bounds.minLng) -
    (b.bounds.maxLat - b.bounds.minLat) * (b.bounds.maxLng - b.bounds.minLng)
);

/** Devuelve la provincia que contiene el punto (lat, lng), o null si está fuera de Argentina */
export function findRegionByCoords(lat: number, lng: number): RegionConfig | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // 1. Muy cerca de una ciudad configurada (ej: Viedma, a orillas del río que limita con Buenos Aires)
  let nearestCity: { region: RegionConfig; km: number } | null = null;
  for (const r of REGION_LIST) {
    for (const c of r.cities) {
      const km = distanceKm(lat, lng, c.lat, c.lng);
      if (km <= CITY_SNAP_KM && (!nearestCity || km < nearestCity.km)) nearestCity = { region: r, km };
    }
  }
  if (nearestCity) return nearestCity.region;

  // 2. Dentro del polígono (primero las más chicas, así CABA gana sobre Buenos Aires)
  for (const r of REGIONS_BY_AREA) {
    const b = r.bounds;
    if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) continue;
    if (inRegionPolygon(lat, lng, r.slug)) return r;
  }

  // 3. Apenas afuera de todos (costa, islas): la provincia más cercana, si está a menos de MAX_OUTSIDE_KM
  let nearest: { region: RegionConfig; km: number } | null = null;
  for (const r of REGION_LIST) {
    const b = r.bounds;
    const margin = MAX_OUTSIDE_KM / 80; // ~grados de margen
    if (lat < b.minLat - margin || lat > b.maxLat + margin || lng < b.minLng - margin || lng > b.maxLng + margin) continue;
    const km = distanceToRegionKm(lat, lng, r.slug);
    if (km <= MAX_OUTSIDE_KM && (!nearest || km < nearest.km)) nearest = { region: r, km };
  }
  return nearest?.region ?? null;
}

/** Región a la que pertenece una publicación según sus coordenadas (con respaldo) */
export function regionForPoint(
  lat: number | null | undefined,
  lng: number | null | undefined,
  fallback?: RegionConfig
): RegionConfig {
  if (typeof lat === 'number' && typeof lng === 'number') {
    const found = findRegionByCoords(lat, lng);
    if (found) return found;
  }
  return fallback ?? DEFAULT_REGION;
}

