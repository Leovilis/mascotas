import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { LostReport, FoundReport, Sighting, MapMarkerItem, AdminDashboardStats, PetSpecies } from '@/types';
import { LostReportInput } from '@/lib/validations/lost-report.schema';
import { FoundReportInput } from '@/lib/validations/found-report.schema';
import { SightingInput } from '@/lib/validations/sighting.schema';
import { calculateDistanceMeters } from '@/lib/utils';
import { getEditToken, saveEditToken } from '@/lib/device-storage';
import { DEFAULT_REGION, REGION_LIST } from '@/config/regions';

const DEFAULT_LAT = DEFAULT_REGION.center.lat;
const DEFAULT_LNG = DEFAULT_REGION.center.lng;

/**
 * Filtra una consulta de Supabase por provincia (columna region_slug).
 * Si no se pasa región, la consulta queda igual (ej: panel admin global).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function byRegion<Q extends { eq: (column: string, value: any) => Q }>(query: Q, region?: string | null): Q {
  return region ? query.eq('region_slug', region) : query;
}

/**
 * SERVICIO DIRECTO DE BASE DE DATOS SUPABASE + POSTGIS (SIN MOCKS)
 */

/**
 * Decodifica cualquier formato de coordenadas de PostGIS (EWKB, WKT, GeoJSON, objeto lat/lng)
 */
export function parseCoordinates(loc: any): { latitude: number; longitude: number } {
  if (!loc) return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };

  // Si ya es un objeto { latitude, longitude } o { lat, lng }
  if (typeof loc === 'object' && loc !== null) {
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return { latitude: loc.latitude, longitude: loc.longitude };
    }
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return { latitude: loc.lat, longitude: loc.lng };
    }
    // GeoJSON { type: 'Point', coordinates: [lng, lat] }
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      return { latitude: Number(loc.coordinates[1]), longitude: Number(loc.coordinates[0]) };
    }
  }

  // Si es un string
  if (typeof loc === 'string') {
    // 1. WKT: "POINT(lng lat)" o "SRID=4326;POINT(lng lat)"
    const pointMatch = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (pointMatch) {
      return {
        latitude: parseFloat(pointMatch[2]),
        longitude: parseFloat(pointMatch[1]),
      };
    }

    // 2. EWKB Hexadecimal (PostGIS default en PostgREST: ej "0101000020E6100000...")
    try {
      const cleanHex = loc.trim().replace(/^\\x/i, '');
      if (cleanHex.length >= 32 && /^[0-9a-fA-F]+$/.test(cleanHex)) {
        const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
        const view = new DataView(bytes.buffer);
        const isLittleEndian = bytes[0] === 1;
        let offset = 1;
        const geomType = view.getUint32(offset, isLittleEndian);
        offset += 4;
        if ((geomType & 0x20000000) !== 0) {
          offset += 4; // saltar SRID
        }
        const lng = view.getFloat64(offset, isLittleEndian);
        offset += 8;
        const lat = view.getFloat64(offset, isLittleEndian);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { latitude: lat, longitude: lng };
        }
      }
    } catch {
      // Ignorar error de parsing hex
    }

    // 3. JSON stringificado
    try {
      const parsed = JSON.parse(loc);
      return parseCoordinates(parsed);
    } catch {
      // Ignorar error
    }
  }

  // Fallback por defecto: centro de la región por defecto
  return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
}

// 1. Subir imagen a Supabase Storage (Bucket: pet-photos)
export async function uploadPetPhoto(file: File): Promise<string> {
  // Intentar primero a través de la API Route segura
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    } else if (res.status >= 400 && res.status < 500) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo subir la imagen.');
    }
  } catch (err) {
    if (err instanceof Error && err.message && !/fetch/i.test(err.message)) throw err;
    // Si fetch falla en SSR o entorno sin /api/upload, intentar cliente directo
  }

  const supabase = createBrowserClient();
  const bucketName = 'pet-photos';

  // Sanitizar el nombre del archivo y generar ruta única
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `reports/${fileName}`;

  // Intentar subir directamente a Supabase Storage
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    // Antes se guardaba la imagen como texto (data URL) en la base: se quitó porque
    // permitía cargar archivos enormes en la base de datos.
    console.warn(`Aviso en Storage Supabase: ${error.message}.`);
    throw new Error('No se pudo subir la imagen. Probá de nuevo en unos minutos.');
  }

  // Obtener la URL pública del archivo subido
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

// Estructura de datos unificada para carga ultra rápida del mapa (1 sola llamada a Supabase)
export interface UnifiedMapData {
  markers: MapMarkerItem[];
  lostReports: LostReport[];
  reunitedCount: number;
}

/**
 * Carga optimizada para el mapa:
 * Ejecuta una sola consulta a lost_reports, found_reports, sightings y contador,
 * evitando saturar el connection pooler de Supabase y evitando timeouts de PostgreSQL.
 */
export async function getUnifiedMapData(
  centerLat: number = DEFAULT_LAT,
  centerLng: number = DEFAULT_LNG,
  radiusMeters: number = 10000,
  species?: PetSpecies | 'all',
  region?: string
): Promise<UnifiedMapData> {
  const supabase = createBrowserClient();

  try {
    const [lostRes, foundRes, sightingRes, reunitedRes] = await Promise.all([
      byRegion(
        supabase
          .from('lost_reports')
          .select('id, user_id, pet_id, status, last_seen_date, last_seen_location, approximate_address, description, contact_phone, contact_name, contact_phone_public, created_at, pet:pets(*)')
          .eq('status', 'ACTIVE'),
        region
      )
        .order('created_at', { ascending: false })
        .limit(50),
      byRegion(
        supabase
          .from('found_reports')
          .select('id, found_date, found_location, approximate_address, status, created_at, pet:pets(name, species, photos)')
          .eq('status', 'ACTIVE'),
        region
      )
        .order('created_at', { ascending: false })
        .limit(50),
      byRegion(
        supabase
          .from('sightings')
          .select('id, sighting_date, location, approximate_address, photo_url, status, description, created_at, lost_report_id, lost_report:lost_reports(id, pet:pets(name, species, photos))')
          .neq('status', 'DISMISSED'),
        region
      )
        .order('created_at', { ascending: false })
        .limit(50),
      byRegion(
        supabase
          .from('lost_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'REUNITED'),
        region
      ),
    ]);

    const rawLost = lostRes.data || [];
    const rawFound = foundRes.data || [];
    const rawSightings = sightingRes.data || [];

    // 1. Construir conteo de avistamientos por reporte de mascota perdida
    const sightingsCountByLostId: Record<string, number> = {};
    rawSightings.forEach((s: any) => {
      if (s.lost_report_id) {
        sightingsCountByLostId[s.lost_report_id] = (sightingsCountByLostId[s.lost_report_id] || 0) + 1;
      }
    });

    // 2. Construir marcadores para el mapa
    const markers: MapMarkerItem[] = [];

    rawLost.forEach((row: any) => {
      if (species && species !== 'all' && row.pet?.species !== species) return;
      const coords = parseCoordinates(row.last_seen_location);
      const sCount = sightingsCountByLostId[row.id] || 0;
      markers.push({
        marker_id: row.id,
        marker_type: 'lost',
        title: `${row.pet?.name || 'Mascota'}`,
        species: row.pet?.species || 'dog',
        photo_url: row.pet?.photos?.[0] || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        report_date: row.last_seen_date,
        approximate_address: row.approximate_address,
        created_at: row.created_at,
        detail_url: `/mascotas-perdidas/${row.id}`,
        sightings_count: sCount,
      });
    });

    rawFound.forEach((row: any) => {
      if (species && species !== 'all' && row.pet?.species !== species) return;
      const coords = parseCoordinates(row.found_location);
      markers.push({
        marker_id: row.id,
        marker_type: 'found',
        title: 'Mascota Encontrada',
        species: row.pet?.species || 'dog',
        photo_url: row.pet?.photos?.[0] || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        report_date: row.found_date,
        approximate_address: row.approximate_address,
        created_at: row.created_at,
        is_holding: true,
        detail_url: `/mascotas-encontradas/${row.id}`,
      });
    });

    rawSightings.forEach((row: any) => {
      const sSpecies = row.lost_report?.pet?.species;
      if (species && species !== 'all' && sSpecies && sSpecies !== species) return;
      const coords = parseCoordinates(row.location);
      const petName = row.lost_report?.pet?.name;
      const isHolding = row.is_holding === true || (typeof row.description === 'string' && (row.description.includes('EN TRÁNSITO') || row.description.includes('🏠')));
      markers.push({
        marker_id: row.id,
        marker_type: isHolding ? 'found' : 'sighting',
        title: isHolding 
          ? (petName ? `En Tránsito: ${petName}` : 'Mascota en Tránsito 🏠') 
          : (petName ? `Avistamiento de ${petName}` : 'Mascota Avistada 🐾'),
        species: sSpecies || 'dog',
        photo_url: row.photo_url || row.lost_report?.pet?.photos?.[0] || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        report_date: row.sighting_date,
        approximate_address: row.approximate_address,
        created_at: row.created_at,
        is_holding: isHolding,
        detail_url: `/mascota-avistada/${row.id}`,
      });
    });

    // 3. Construir publicaciones con distancia calculada para el panel lateral
    let lostReports = rawLost.map((row: any) => {
      const coords = parseCoordinates(row.last_seen_location);
      const dist = calculateDistanceMeters(centerLat, centerLng, coords.latitude, coords.longitude);
      const sCount = sightingsCountByLostId[row.id] || 0;
      return {
        ...row,
        last_seen_location: coords,
        distance_meters: dist,
        sightings_count: sCount,
      };
    }) as LostReport[];

    // Filtrar por especie
    if (species && species !== 'all') {
      lostReports = lostReports.filter((r) => r.pet?.species === species);
    }

    // Filtrar por radio de búsqueda
    if (radiusMeters > 0) {
      lostReports = lostReports.filter((r) => (r.distance_meters || 0) <= radiusMeters);
    }

    // Ordenar de la más cercana a la más lejana
    lostReports.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));

    return {
      markers,
      lostReports,
      reunitedCount: reunitedRes.count || 0,
    };
  } catch (err) {
    console.warn('Error en getUnifiedMapData:', err);
    return {
      markers: [],
      lostReports: [],
      reunitedCount: 0,
    };
  }
}

// 2. Obtener Mascotas Perdidas por proximidad (optimizado, sin timeouts, paginado)
export async function getNearbyLostReports(
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG,
  radiusMeters: number = 10000,
  species?: PetSpecies | 'all',
  limit: number = 6,
  offset: number = 0,
  region?: string
): Promise<LostReport[]> {
  const supabase = createBrowserClient();
  try {
    const { data, error } = await byRegion(
      supabase
        .from('lost_reports')
        .select('id, user_id, pet_id, status, last_seen_date, last_seen_location, approximate_address, description, contact_phone, contact_name, contact_phone_public, created_at, pet:pets(*)')
        .eq('status', 'ACTIVE'),
      region
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('Aviso al consultar lost_reports:', error?.message || error);
      return [];
    }

    let results = (data || []).map((row: any) => {
      const coords = parseCoordinates(row.last_seen_location);
      const dist = calculateDistanceMeters(lat, lng, coords.latitude, coords.longitude);
      return {
        ...row,
        last_seen_location: coords,
        distance_meters: dist,
      };
    }) as LostReport[];

    if (radiusMeters > 0) {
      results = results.filter((r) => (r.distance_meters || 0) <= radiusMeters);
    }

    if (species && species !== 'all') {
      results = results.filter((r: any) => r.pet?.species === species);
    }

    results.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
    return results;
  } catch (err) {
    console.warn('Error en getNearbyLostReports:', err);
    return [];
  }
}

// 3. Obtener Mascotas Encontradas (optimizado, paginado)
export async function getNearbyFoundReports(
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG,
  radiusMeters: number = 10000,
  species?: PetSpecies | 'all',
  limit: number = 6,
  offset: number = 0,
  region?: string
): Promise<FoundReport[]> {
  const supabase = createBrowserClient();
  try {
    const { data, error } = await byRegion(
      supabase
        .from('found_reports')
        .select('id, finder_id, pet_id, status, found_date, found_location, approximate_address, is_holding, description, created_at, pet:pets(*)')
        .eq('status', 'ACTIVE'),
      region
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('Aviso al consultar found_reports:', error?.message || error);
      return [];
    }

    let results = (data || []).map((row: any) => {
      const coords = parseCoordinates(row.found_location);
      const dist = calculateDistanceMeters(lat, lng, coords.latitude, coords.longitude);
      return {
        ...row,
        found_location: coords,
        distance_meters: dist,
      };
    }) as FoundReport[];

    if (radiusMeters > 0) {
      results = results.filter((r) => (r.distance_meters || 0) <= radiusMeters);
    }

    if (species && species !== 'all') {
      results = results.filter((r: any) => r.pet?.species === species);
    }

    results.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
    return results;
  } catch (err) {
    console.warn('Error en getNearbyFoundReports:', err);
    return [];
  }
}

export type UnifiedReport = 
  | (LostReport & { report_type: 'lost' })
  | (FoundReport & { report_type: 'found' });

// 3b. Obtener Todos los Reportes Publicados (Perdidas y Encontradas unificadas, paginado de 6 en 6)
export async function getAllPublishedReports(
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG,
  radiusMeters: number = 10000,
  filterType: 'all' | 'lost' | 'found' = 'all',
  species?: PetSpecies | 'all',
  limit: number = 6,
  offset: number = 0,
  region?: string
): Promise<UnifiedReport[]> {
  const supabase = createBrowserClient();
  try {
    if (filterType === 'lost') {
      const lost = await getNearbyLostReports(lat, lng, radiusMeters, species, limit, offset, region);
      return lost.map((r) => ({ ...r, report_type: 'lost' as const }));
    }

    if (filterType === 'found') {
      const found = await getNearbyFoundReports(lat, lng, radiusMeters, species, limit, offset, region);
      return found.map((r) => ({ ...r, report_type: 'found' as const }));
    }

    // Si es 'all': traer el lote combinado ordenado por fecha de creación
    const [lostRes, foundRes] = await Promise.all([
      byRegion(
        supabase
          .from('lost_reports')
          .select('id, user_id, pet_id, status, last_seen_date, last_seen_location, approximate_address, description, contact_phone, contact_name, contact_phone_public, created_at, pet:pets(*)')
          .eq('status', 'ACTIVE'),
        region
      )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      byRegion(
        supabase
          .from('found_reports')
          .select('id, finder_id, pet_id, status, found_date, found_location, approximate_address, is_holding, description, created_at, pet:pets(*)')
          .eq('status', 'ACTIVE'),
        region
      )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ]);

    const rawLost = (lostRes.data || []).map((row: any) => {
      const coords = parseCoordinates(row.last_seen_location);
      const dist = calculateDistanceMeters(lat, lng, coords.latitude, coords.longitude);
      return {
        ...row,
        report_type: 'lost' as const,
        last_seen_location: coords,
        distance_meters: dist,
      };
    });

    const rawFound = (foundRes.data || []).map((row: any) => {
      const coords = parseCoordinates(row.found_location);
      const dist = calculateDistanceMeters(lat, lng, coords.latitude, coords.longitude);
      return {
        ...row,
        report_type: 'found' as const,
        found_location: coords,
        distance_meters: dist,
      };
    });

    let combined: UnifiedReport[] = [...rawLost, ...rawFound];

    if (species && species !== 'all') {
      combined = combined.filter((r) => r.pet?.species === species);
    }

    if (radiusMeters > 0) {
      combined = combined.filter((r) => (r.distance_meters || 0) <= radiusMeters);
    }

    // Ordenar por fecha más reciente de publicación y tomar exactamente el límite
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined.slice(0, limit);
  } catch (err) {
    console.warn('Error en getAllPublishedReports:', err);
    return [];
  }
}

// 4. Obtener Ficha de Mascota Perdida por ID
export async function getLostReportById(id: string): Promise<LostReport | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('lost_reports')
    .select('*, pet:pets(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }
  return {
    ...data,
    last_seen_location: parseCoordinates(data.last_seen_location),
  } as LostReport;
}

// 4b. Obtener Ficha de Mascota Encontrada por ID
export async function getFoundReportById(id: string): Promise<FoundReport | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('found_reports')
    .select('*, pet:pets(*), profile:profiles(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }
  return {
    ...data,
    found_location: parseCoordinates(data.found_location),
  } as FoundReport;
}

// 4c. Obtener Ficha Unificada (sea Perdida, Encontrada o Avistamiento)
export async function getUnifiedReportById(id: string): Promise<UnifiedReport | null> {
  const lost = await getLostReportById(id);
  if (lost) {
    return { ...lost, report_type: 'lost' };
  }
  const found = await getFoundReportById(id);
  if (found) {
    return { ...found, report_type: 'found' };
  }

  // 4d. Buscar en tabla sightings si el ID corresponde a un avistamiento
  const supabase = createBrowserClient();
  const { data: sighting, error: sError } = await supabase
    .from('sightings')
    .select('*, lost_report:lost_reports(*, pet:pets(*), profile:profiles(*)), profile:profiles(*)')
    .eq('id', id)
    .single();

  if (!sError && sighting) {
    if (sighting.lost_report) {
      return { 
        ...sighting.lost_report, 
        last_seen_location: parseCoordinates(sighting.lost_report.last_seen_location),
        report_type: 'lost' 
      };
    }

    // Avistamiento general no vinculado a un reporte específico
    const loc = parseCoordinates(sighting.location);
    const reporterPhoneMatch = typeof sighting.description === 'string' 
      ? (
          sighting.description.match(/(?:Contacto \/ WhatsApp:|WhatsApp:|Teléfono:|Tel:|Celular:|Cel:|📞)\s*([0-9+\s\-()]{6,25})/i) ||
          sighting.description.match(/(?:(?:280|549280|\+549280)\s*[\d\s\-]{6,12})/i)
        )
      : null;
    const phone = sighting.contact_phone || (reporterPhoneMatch ? (reporterPhoneMatch[1] || reporterPhoneMatch[0]).trim() : '') || sighting.profile?.phone || '';
    const reporterNameMatch = typeof sighting.description === 'string'
      ? sighting.description.match(/(?:Reportado por:|👤)\s*([^\n\r]+)/i)
      : null;
    const repName = sighting.reporter_name || (reporterNameMatch ? reporterNameMatch[1].trim() : '') || 'Vecino solidario';

    return {
      id: sighting.id,
      user_id: sighting.user_id || '',
      pet_id: sighting.id,
      status: 'ACTIVE',
      last_seen_date: sighting.sighting_date,
      last_seen_location: loc,
      approximate_address: sighting.approximate_address,
      description: sighting.description || 'Avistamiento reportado en la vía pública',
      contact_phone: phone,
      contact_name: repName,
      contact_phone_public: Boolean(phone),
      views_count: 0,
      created_at: sighting.created_at || sighting.sighting_date,
      updated_at: sighting.created_at || sighting.sighting_date,
      report_type: 'lost',
      pet: {
        id: sighting.id,
        name: 'Mascota Avistada',
        species: 'dog',
        breed: 'Vista en la calle',
        gender: 'unknown',
        size: 'medium',
        primary_color: 'A verificar',
        photos: sighting.photo_url ? [sighting.photo_url] : [],
        created_at: sighting.created_at || sighting.sighting_date,
      }
    };
  }

  return null;
}

// 5. Obtener Avistamientos de una Mascota Perdida
export async function getSightingsForReport(lostReportId: string): Promise<Sighting[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('sightings')
    .select('*')
    .eq('lost_report_id', lostReportId)
    .neq('status', 'DISMISSED') // los descartados por la familia o el moderador no se muestran
    .order('sighting_date', { ascending: false });

  if (error) {
    console.error('Error al consultar sightings en Supabase:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    ...row,
    location: parseCoordinates(row.location),
  })) as Sighting[];
}

// 6. Obtener Marcadores Unificados para el Mapa (Pines 🔴 🟢 🟡)
export async function getMapMarkers(
  minLat: number = DEFAULT_LAT - 0.25,
  minLng: number = DEFAULT_LNG - 0.3,
  maxLat: number = DEFAULT_LAT + 0.25,
  maxLng: number = DEFAULT_LNG + 0.3
): Promise<MapMarkerItem[]> {
  const supabase = createBrowserClient();

  // Recopilar directamente de las 3 tablas en Supabase con selección completa (incluyendo calles y fechas exactas)
  const [lostRes, foundRes, sightingRes] = await Promise.all([
    supabase
      .from('lost_reports')
      .select('id, last_seen_date, last_seen_location, approximate_address, status, created_at, pet:pets(name, species, photos)')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false }),
    supabase
      .from('found_reports')
      .select('id, found_date, found_location, approximate_address, status, created_at, pet:pets(name, species, photos)')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false }),
    supabase
      .from('sightings')
      .select('id, sighting_date, location, approximate_address, photo_url, status, created_at, lost_report_id, lost_report:lost_reports(id, pet:pets(name, species, photos))')
      .order('created_at', { ascending: false }),
  ]);

  const markers: MapMarkerItem[] = [];

  (lostRes.data || []).forEach((row: any) => {
    const coords = parseCoordinates(row.last_seen_location);
    markers.push({
      marker_id: row.id,
      marker_type: 'lost',
      title: `${row.pet?.name || 'Mascota'}`,
      species: row.pet?.species || 'dog',
      photo_url: row.pet?.photos?.[0] || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      report_date: row.last_seen_date,
      approximate_address: row.approximate_address,
      created_at: row.created_at,
    });
  });

  (foundRes.data || []).forEach((row: any) => {
    const coords = parseCoordinates(row.found_location);
    markers.push({
      marker_id: row.id,
      marker_type: 'found',
      title: 'Mascota Encontrada',
      species: row.pet?.species || 'dog',
      photo_url: row.pet?.photos?.[0] || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      report_date: row.found_date,
      approximate_address: row.approximate_address,
      created_at: row.created_at,
    });
  });

  (sightingRes.data || []).forEach((row: any) => {
    const coords = parseCoordinates(row.location);
    const petName = row.lost_report?.pet?.name;
    markers.push({
      marker_id: row.id,
      marker_type: 'sighting',
      title: petName ? `Avistamiento de ${petName}` : 'Mascota Avistada',
      species: row.lost_report?.pet?.species || 'dog',
      photo_url: row.photo_url || row.lost_report?.pet?.photos?.[0] || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      report_date: row.sighting_date,
      approximate_address: row.approximate_address,
      created_at: row.created_at,
    });
  });

  return markers;
}

// 7-9. Altas de publicaciones: se hacen en el servidor (/api/reports/create),
// que verifica el captcha (Turnstile), limita publicaciones por persona y guarda el hash del código de gestión.
async function createReportOnServer(
  type: 'lost' | 'found' | 'sighting',
  data: LostReportInput | FoundReportInput | SightingInput,
  turnstileToken: string | null
): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/reports/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, turnstileToken }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisá tu conexión.');
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string; token?: string; error?: string };
  if (!res.ok || !json.id || !json.token) {
    throw new Error(json.error || 'No se pudo publicar. Probá de nuevo.');
  }
  saveEditToken(json.id, json.token);
  return json.id;
}

export function createLostReportInDb(input: LostReportInput, turnstileToken: string | null): Promise<string> {
  return createReportOnServer('lost', input, turnstileToken);
}

export function createFoundReportInDb(input: FoundReportInput, turnstileToken: string | null): Promise<string> {
  return createReportOnServer('found', input, turnstileToken);
}

export function createSightingInDb(input: SightingInput, turnstileToken: string | null): Promise<string> {
  return createReportOnServer('sighting', input, turnstileToken);
}

// 9.1 Obtener Ficha de Avistamiento por ID con datos completos
export async function getSightingById(id: string) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('sightings')
    .select('*, lost_report:lost_reports(*, pet:pets(*))')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

// 9b. Incrementar Contador de Vistas de una Publicación
export async function incrementReportViews(reportId: string): Promise<number> {
  const supabase = createBrowserClient();
  try {
    const { data, error } = await supabase.rpc('increment_report_views', { p_report_id: reportId });
    if (!error && typeof data === 'number') {
      return data;
    }
  } catch (e) {
    console.warn('RPC increment_report_views no disponible, usando fallback.');
  }

  try {
    const { data: current } = await supabase
      .from('lost_reports')
      .select('views_count')
      .eq('id', reportId)
      .single();

    if (current) {
      const newCount = (current.views_count || 0) + 1;
      await supabase
        .from('lost_reports')
        .update({ views_count: newCount })
        .eq('id', reportId);
      return newCount;
    }
  } catch (err) {
    console.error('Error al actualizar contador de vistas:', err);
  }
  return 0;
}

// 9c. Obtener lista de mascotas perdidas activas (para seleccionar en formulario de avistamiento)
export async function getActiveLostPetsList(region?: string): Promise<{ id: string; name: string; photo_url: string | null; address: string; phone?: string; owner_name?: string }[]> {
  const supabase = createBrowserClient();
  const { data, error } = await byRegion(
    supabase
      .from('lost_reports')
      .select('id, approximate_address, contact_phone, contact_name, pet:pets(name, photos)')
      .eq('status', 'ACTIVE'),
    region
  )
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    name: row.pet?.name || 'Mascota perdida',
    photo_url: row.pet?.photos?.[0] || null,
    address: row.approximate_address,
    phone: row.contact_phone || '',
    owner_name: row.contact_name || '',
  }));
}

// 9d. Obtener reportes por IDs guardados en el dispositivo
export async function getReportsByIdsList(type: 'lost' | 'found' | 'sighting', ids: string[]): Promise<any[]> {
  if (!ids || ids.length === 0) return [];
  const supabase = createBrowserClient();

  if (type === 'lost') {
    const { data, error } = await supabase
      .from('lost_reports')
      .select('*, pet:pets(*)')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  if (type === 'found') {
    const { data, error } = await supabase
      .from('found_reports')
      .select('*, pet:pets(*)')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  if (type === 'sighting') {
    const { data, error } = await supabase
      .from('sightings')
      .select('*, lost_report:lost_reports(id, approximate_address, pet:pets(name, species, photos))')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  return [];
}

// 10. Confirmar Reunificación de Mascota (Cambiar estado a REUNITED)
/**
 * El dueño marca su publicación como reunida (o la reactiva).
 * Requiere el token de edición guardado en este dispositivo.
 */
export async function markReportAsReunitedInDb(
  reportId: string,
  type: 'lost' | 'found' | 'sighting' = 'lost',
  status?: string
): Promise<{ ok: boolean; error?: string }> {
  const editToken = getEditToken(reportId);
  if (!editToken) {
    return {
      ok: false,
      error: 'Este dispositivo no tiene el código de gestión de la publicación. Ingresá el código completo en Mis Reportes.',
    };
  }
  const nextStatus = status ?? (type === 'sighting' ? 'VERIFIED' : 'REUNITED');
  try {
    const res = await fetch('/api/reports/reunited', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, type, status: nextStatus, editToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: data.error || 'No se pudo actualizar la publicación.' };
  } catch (err) {
    console.error('Error en markReportAsReunitedInDb:', err);
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}

// 11. Obtener Estadísticas Globales para Super Admin
/**
 * @param region Si se pasa, las estadísticas son solo de esa provincia (ej: contadores de la home).
 *               Sin región devuelve las globales (panel de administración).
 */
export async function getAdminStats(region?: string): Promise<AdminDashboardStats> {
  const supabase = createBrowserClient();

  const { data: rpcData, error: rpcError } = region
    ? { data: null, error: null }
    : await supabase.rpc('get_admin_dashboard_stats');
  if (!rpcError && rpcData) {
    const rpcStats = rpcData as AdminDashboardStats;
    // Asegurar que total_sightings compute tanto sightings como found_reports
    const combinedSightings = (rpcStats.total_sightings || 0) + (rpcStats.total_found_reports || 0);
    const combinedSightingsRecent = (rpcStats.recent_activity_last_7_days?.sightings_created || 0) + (rpcStats.recent_activity_last_7_days?.found_created || 0);
    return {
      ...rpcStats,
      total_sightings: combinedSightings,
      recent_activity_last_7_days: {
        ...rpcStats.recent_activity_last_7_days,
        sightings_created: combinedSightingsRecent,
      }
    };
  }

  // Cálculo directo en Supabase si aún no ejecutaste la función RPC
  const [lostCount, lostActive, foundCount, foundActive, sightingsCount, reunitedCount, profilesCount, moderationCount] = await Promise.all([
    byRegion(supabase.from('lost_reports').select('*', { count: 'exact', head: true }), region),
    byRegion(supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'), region),
    byRegion(supabase.from('found_reports').select('*', { count: 'exact', head: true }), region),
    byRegion(supabase.from('found_reports').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'), region),
    byRegion(supabase.from('sightings').select('*', { count: 'exact', head: true }), region),
    byRegion(supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('status', 'REUNITED'), region),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('moderation_reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
  ]);

  // Desglose de publicaciones de mascotas perdidas por provincia
  const regionsToCount = region ? REGION_LIST.filter((r) => r.slug === region) : REGION_LIST;
  const perRegion = await Promise.all(
    regionsToCount.map((r) =>
      supabase.from('lost_reports').select('*', { count: 'exact', head: true }).eq('region_slug', r.slug)
    )
  );

  const combinedSightingsFallback = (sightingsCount.count || 0) + (foundCount.count || 0);

  return {
    total_lost_reports: lostCount.count || 0,
    active_lost_reports: lostActive.count || 0,
    total_found_reports: foundCount.count || 0,
    active_found_reports: foundActive.count || 0,
    total_sightings: combinedSightingsFallback,
    total_reunited_pets: reunitedCount.count || 0,
    total_users: profilesCount.count || 0,
    total_pending_moderations: moderationCount.count || 0,
    reports_by_city: regionsToCount.map((r, i) => ({
      city_name: r.provinceName,
      lost_count: perRegion[i]?.count || 0,
    })),
    recent_activity_last_7_days: {
      lost_created: lostCount.count || 0,
      found_created: foundCount.count || 0,
      sightings_created: combinedSightingsFallback,
      reunited_count: reunitedCount.count || 0,
    },
  };
}

// 12. Eliminar todas las publicaciones (Función Super Admin para vaciar la base de datos)
export async function deleteAllReportsFromDb(adminKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/reports/delete-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ confirm: 'BORRAR TODO' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data.error || `Error ${res.status}` };
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mascotas_my_lost_reports');
      localStorage.removeItem('mascotas_my_found_reports');
      localStorage.removeItem('mascotas_my_sightings');
    }
    return { success: true, message: data.message || 'Todas las publicaciones fueron eliminadas.' };
  } catch (error) {
    console.error('Error general al eliminar todas las publicaciones:', error);
    return { success: false, message: (error as Error)?.message || 'Error al conectar con el servidor.' };
  }
}

// 13. Obtener todas las mascotas publicadas para el Super Admin (Perdidas, Encontradas y Avistamientos)
export async function getAllReportsForAdmin(): Promise<any[]> {
  const supabase = createBrowserClient();
  try {
    const [lostRes, foundRes, sightingRes] = await Promise.all([
      supabase
        .from('lost_reports')
        .select('id, pet_id, user_id, status, approximate_address, last_seen_date, last_seen_location, created_at, contact_phone, contact_name, description, pet:pets(name, species, breed, photos)')
        .order('created_at', { ascending: false }),
      supabase
        .from('found_reports')
        .select('id, pet_id, finder_id, status, approximate_address, found_date, found_location, created_at, is_holding, contact_phone, contact_name, description, pet:pets(name, species, breed, photos)')
        .order('created_at', { ascending: false }),
      supabase
        .from('sightings')
        .select('id, lost_report_id, user_id, status, approximate_address, sighting_date, location, created_at, description, photo_url, lost_report:lost_reports(id, contact_phone, contact_name, pet:pets(name, species, photos))')
        .order('created_at', { ascending: false }),
    ]);

    const lostItems = (lostRes.data || []).map((row: any) => ({
      ...row,
      publication_type: 'lost',
      last_seen_location: parseCoordinates(row.last_seen_location),
    }));

    const foundItems = (foundRes.data || []).map((row: any) => ({
      ...row,
      publication_type: 'found',
      found_location: parseCoordinates(row.found_location),
      last_seen_location: parseCoordinates(row.found_location),
    }));

    const sightingItems = (sightingRes.data || []).map((row: any) => {
      const reporterPhoneMatch = typeof row.description === 'string'
        ? (
            row.description.match(/(?:Contacto \/ WhatsApp:|WhatsApp:|Teléfono:|Tel:|Celular:|Cel:|📞)\s*([0-9+\s\-()]{6,25})/i) ||
            row.description.match(/(?:(?:280|549280|\+549280)\s*[\d\s\-]{6,12})/i)
          )
        : null;
      const phone = row.contact_phone || (reporterPhoneMatch ? (reporterPhoneMatch[1] || reporterPhoneMatch[0]).trim() : '') || row.lost_report?.contact_phone || '';
      const reporterNameMatch = typeof row.description === 'string'
        ? row.description.match(/(?:Reportado por:|👤)\s*([^\n\r]+)/i)
        : null;
      const repName = row.reporter_name || (reporterNameMatch ? reporterNameMatch[1].trim() : '') || row.lost_report?.contact_name || 'Vecino solidario';

      return {
        ...row,
        publication_type: 'sighting',
        contact_phone: phone,
        contact_name: repName,
        last_seen_location: parseCoordinates(row.location),
        pet: row.lost_report?.pet || {
          name: 'Mascota Avistada',
          species: 'dog',
          photos: row.photo_url ? [row.photo_url] : [],
        },
      };
    });

    const all = [...lostItems, ...foundItems, ...sightingItems];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all;
  } catch (err) {
    console.error('Error en getAllReportsForAdmin:', err);
    return [];
  }
}

// Retrocompatibilidad
export async function getAllLostReportsForAdmin(): Promise<any[]> {
  return getAllReportsForAdmin();
}

// 14. Alternar estado de la publicación desde Super Admin (Lost, Found o Sighting)
export async function toggleReportStatusInDb(
  reportId: string,
  currentStatus: string,
  type: 'lost' | 'found' | 'sighting' = 'lost',
  adminKey?: string
): Promise<boolean> {
  const isCurrentlyReunited = currentStatus === 'REUNITED' || currentStatus === 'VERIFIED';
  const nextStatus = isCurrentlyReunited
    ? (type === 'sighting' ? 'PENDING' : 'ACTIVE')
    : (type === 'sighting' ? 'VERIFIED' : 'REUNITED');

  try {
    const res = await fetch('/api/reports/reunited', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'x-admin-key': adminKey } : {}) },
      body: JSON.stringify({ reportId, type, status: nextStatus, editToken: adminKey ? undefined : getEditToken(reportId) }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && !!data.success;
  } catch (errApi) {
    console.warn('Error al llamar a /api/reports/reunited:', errApi);
    return false;
  }
}

// 15. Eliminar reporte individual desde Super Admin (Lost, Found o Sighting)
/**
 * Borra una publicación. Lo puede hacer el administrador (adminKey)
 * o el dueño (token de edición guardado en este dispositivo).
 */
export async function deleteSingleReportFromDb(
  reportId: string,
  _petId?: string,
  type: 'lost' | 'found' | 'sighting' = 'lost',
  adminKey?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/reports/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'x-admin-key': adminKey } : {}) },
      body: JSON.stringify({ reportId, type, editToken: adminKey ? undefined : getEditToken(reportId) }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && !!data.success;
  } catch (errApi) {
    console.warn('Error al llamar a /api/reports/delete:', errApi);
    return false;
  }
}

// 16. Contador de mascotas encontradas / reunidas
export async function getReunitedCount(): Promise<number> {
  const supabase = createBrowserClient();
  try {
    const { count, error } = await supabase
      .from('lost_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'REUNITED');
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}



// ---------------------------------------------------------------------------
// Confirmación de avistamientos por la familia y denuncias
// ---------------------------------------------------------------------------

/** La familia confirma / descarta un avistamiento (con el código de gestión de su publicación) */
export async function reviewSightingAsOwner(
  sightingId: string,
  lostReportId: string,
  decision: 'confirm' | 'dismiss' | 'pending'
): Promise<{ ok: boolean; status?: string; error?: string }> {
  try {
    const res = await fetch('/api/reports/sighting-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sightingId, decision, editToken: getEditToken(lostReportId) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true, status: data.status };
    return { ok: false, error: data.error || 'No se pudo actualizar el avistamiento.' };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}

export type FlagReason = 'false_information' | 'spam' | 'inappropriate_content' | 'scam' | 'duplicate' | 'other';

export async function flagPublication(input: {
  entityType: 'lost_report' | 'found_report' | 'sighting';
  entityId: string;
  reason: FlagReason;
  details?: string;
  turnstileToken?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/reports/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: data.error || 'No se pudo enviar la denuncia.' };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}

// ---------------------------------------------------------------------------
// Email privado de contacto (código de gestión, recuperación y avisos)
// ---------------------------------------------------------------------------

/** Guarda el email de quien publicó y le envía su código de gestión */
export async function registerContactEmail(
  reportId: string,
  type: 'lost' | 'found' | 'sighting',
  email: string
): Promise<{ ok: boolean; sent: boolean; error?: string }> {
  try {
    const res = await fetch('/api/reports/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, type, email, editToken: getEditToken(reportId) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true, sent: !!data.sent };
    return { ok: false, sent: false, error: data.error || 'No se pudo registrar el email.' };
  } catch {
    return { ok: false, sent: false, error: 'No se pudo conectar con el servidor.' };
  }
}

/** "Perdí mi código": pide que se envíen códigos nuevos al email */
export async function requestCodeRecovery(email: string, turnstileToken: string | null = null): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/reports/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstileToken }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: data.message || data.error || 'No se pudo procesar el pedido.' };
  } catch {
    return { ok: false, message: 'No se pudo conectar con el servidor.' };
  }
}

/** Avisa por mail a la familia de un avistamiento nuevo (si dejó su email). No bloquea. */
export function notifyOwnerOfSighting(sightingId: string): void {
  fetch('/api/reports/notify-sighting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sightingId }),
    keepalive: true,
  }).catch(() => {});
}
