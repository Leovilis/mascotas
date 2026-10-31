/**
 * CONFIGURACIÓN DE REGIONES (PROVINCIAS)
 * ------------------------------------------------------------------
 * Único lugar donde viven los datos "fijos" de cada provincia:
 * nombre de la marca, centro del mapa, ciudades, radios, textos, etc.
 *
 * Están cargadas las 24 jurisdicciones (23 provincias + CABA) en
 * regions.generated.ts. Para cambiar textos, ciudades o radios, editá ese archivo.
 * La detección por coordenadas (GPS) está en region-geo.ts.
 *
 * Este archivo no importa nada del servidor ni del navegador,
 * así que se puede usar desde componentes cliente, servidor y middleware.
 * (No incluye los polígonos de límites, para que sea liviano.)
 */

import { REGIONS as GENERATED_REGIONS, RegionSlug } from './regions.generated';

export type { RegionSlug };

export interface RegionCity {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface RegionConfig {
  slug: RegionSlug;
  /** Nombre visible completo, ej: "Mascotas Trelew" */
  brandName: string;
  /** Parte resaltada del logo: Mascotas<span>Trelew</span> */
  brandSuffix: string;
  provinceName: string;
  /** Código ISO 3166-2 de la provincia SIN el prefijo "AR-" (Chubut = U, Jujuy = Y). Lo usa Vercel en x-vercel-ip-country-region */
  isoCode: string;
  /** Ciudad principal (se usa en textos cortos: "en Trelew") */
  mainCity: string;
  /** Texto largo de cobertura, ej: "Trelew y el Valle Inferior del Río Chubut" */
  coverageText: string;
  /** Centro por defecto del mapa y referencia de distancias */
  center: { lat: number; lng: number };
  /** Rectángulo aproximado que contiene a la provincia (para detectar región por GPS) */
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  mapDefaultRadiusM: number;
  mapRadiusOptions: { value: number; label: string }[];
  cities: RegionCity[];
  phoneExample: string;
  phoneExampleCompact: string;
  sampleAddress: string;
  qrCampaignDefault: string;
  qrPlacePlaceholder: string;
  seoKeywords: string[];
}

/** Las 24 jurisdicciones (datos en regions.generated.ts) */
export const REGIONS: Record<RegionSlug, RegionConfig> = GENERATED_REGIONS;

/** Ordenadas alfabéticamente (para el selector) */
export const REGION_LIST: RegionConfig[] = Object.values(REGIONS).sort((a, b) =>
  a.provinceName.localeCompare(b.provinceName, 'es')
);

/** Cookie donde se guarda la provincia elegida/detectada */
export const REGION_COOKIE = 'mascotas_region';
/** Cómo se eligió: 'manual' (el usuario la eligió), 'gps', 'ip' o 'default' */
export const REGION_SOURCE_COOKIE = 'mascotas_region_src';
export type RegionSource = 'manual' | 'gps' | 'ip' | 'default';
/** Un año */
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isRegionSlug(value: unknown): value is RegionSlug {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REGIONS, value);
}

/** Provincia por defecto del despliegue (variable NEXT_PUBLIC_DEFAULT_REGION, si no "chubut") */
export const DEFAULT_REGION_SLUG: RegionSlug = isRegionSlug(process.env.NEXT_PUBLIC_DEFAULT_REGION)
  ? process.env.NEXT_PUBLIC_DEFAULT_REGION
  : 'chubut';

export const DEFAULT_REGION: RegionConfig = REGIONS[DEFAULT_REGION_SLUG];

/** URL pública del sitio (para QR y links compartidos) */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mascotastrelew.vercel.app').replace(/\/$/, '');

/** Nombre genérico de la plataforma cuando no corresponde una provincia en particular */
export const PLATFORM_NAME = 'Mascotas Perdidas — Red Comunitaria';

export function getRegion(slug?: string | null): RegionConfig {
  return isRegionSlug(slug) ? REGIONS[slug] : DEFAULT_REGION;
}

/** Provincia según el código ISO 3166-2 que manda Vercel (ej: "Y" → Jujuy) */
export function findRegionByIsoCode(code?: string | null): RegionConfig | null {
  if (!code) return null;
  const clean = code.toUpperCase().replace(/^AR-/, '');
  return REGION_LIST.find((r) => r.isoCode === clean) ?? null;
}

/** Lee la región desde document.cookie (solo navegador). */
export function getClientRegionSlug(): RegionSlug {
  if (typeof document === 'undefined') return DEFAULT_REGION_SLUG;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REGION_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isRegionSlug(value) ? value : DEFAULT_REGION_SLUG;
}
