import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PetSpecies, PetSize, PetGender, ReportStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeFirst(text?: string | null): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function capitalizeWords(text?: string | null): string {
  if (!text) return '';
  const smallWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'b°', 'bº']);
  const words = text.trim().split(/\s+/);
  return words
    .map((w, idx) => {
      const lower = w.toLowerCase();
      if (idx > 0 && smallWords.has(lower)) {
        return lower;
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  
  // Quitar 0 inicial si existe
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  // Si tiene 10 dígitos (ej: 2804123456 en Trelew o 3884123456 en Jujuy), anteponer 549 para Argentina
  if (clean.length === 10) {
    clean = `549${clean}`;
  } else if (clean.startsWith('54') && !clean.startsWith('549') && clean.length === 12) {
    // Si tiene 542804xxxxxx convertir a 5492804xxxxxx
    clean = `549${clean.substring(2)}`;
  }
  return clean;
}

export function getLocalDatetimeInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseLocalInputToIso(datetimeLocalStr?: string | null): string {
  if (!datetimeLocalStr) return new Date().toISOString();
  if (datetimeLocalStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(datetimeLocalStr)) {
    return new Date(datetimeLocalStr).toISOString();
  }
  const parts = datetimeLocalStr.split('T');
  if (parts.length === 2) {
    const dateParts = parts[0].split('-').map(Number);
    const timeParts = parts[1].split(':').map(Number);
    if (dateParts.length === 3 && timeParts.length >= 2) {
      const [y, m, d] = dateParts;
      const [h, min] = timeParts;
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(h) && !isNaN(min)) {
        const localDate = new Date(y, m - 1, d, h, min, 0);
        return localDate.toISOString();
      }
    }
  }
  const d = new Date(datetimeLocalStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas (fórmula de Haversine)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistance(meters?: number | null): string {
  if (meters === undefined || meters === null) return '';
  if (meters < 1000) {
    return `a ${Math.round(meters)} m`;
  }
  return `a ${(meters / 1000).toFixed(1)} km`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace unos instantes';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  return `hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getSpeciesLabel(species: PetSpecies): string {
  const labels: Record<PetSpecies, string> = {
    dog: 'Perro',
    cat: 'Gato',
    bird: 'Ave',
    rabbit: 'Conejo',
    other: 'Otro animal',
  };
  return labels[species] || 'Animal';
}

export function getSpeciesEmoji(species: PetSpecies): string {
  const emojis: Record<PetSpecies, string> = {
    dog: '🐕',
    cat: '🐈',
    bird: '🦜',
    rabbit: '🐇',
    other: '🐾',
  };
  return emojis[species] || '🐾';
}

export function getSizeLabel(size: PetSize): string {
  const labels: Record<PetSize, string> = {
    small: 'Pequeño (hasta 10kg)',
    medium: 'Mediano (10 a 25kg)',
    large: 'Grande (25 a 40kg)',
    giant: 'Gigante (+40kg)',
  };
  return labels[size] || size;
}

export function getGenderLabel(gender: PetGender): string {
  const labels: Record<PetGender, string> = {
    male: 'Macho',
    female: 'Hembra',
    unknown: 'No estoy seguro / Desconocido',
  };
  return labels[gender] || gender;
}

export function getStatusBadge(status: ReportStatus): { label: string; colorClass: string } {
  switch (status) {
    case 'ACTIVE':
      return { 
        label: 'BÚSQUEDA ACTIVA', 
        colorClass: 'bg-rose-600/85 backdrop-blur-md text-white border border-rose-400/50 font-black shadow-md' 
      };
    case 'REUNITED':
      return { 
        label: '¡REUNIDO EN CASA! ❤️', 
        colorClass: 'bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400/50 font-black shadow-md' 
      };
    case 'FOUND':
      return { 
        label: 'EN TRÁNSITO 🏠', 
        colorClass: 'bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400/50 font-black shadow-md' 
      };
    case 'UNDER_REVIEW':
      return { 
        label: 'EN REVISIÓN', 
        colorClass: 'bg-slate-600/90 backdrop-blur-md text-white border border-slate-400/50 font-bold shadow-md' 
      };
    case 'CLOSED':
      return { 
        label: 'CERRADO', 
        colorClass: 'bg-zinc-600/90 backdrop-blur-md text-white border border-zinc-400/50 font-bold shadow-md' 
      };
    case 'REMOVED':
      return { 
        label: 'ELIMINADO', 
        colorClass: 'bg-zinc-600/90 backdrop-blur-md text-white border border-zinc-400/50 font-bold shadow-md' 
      };
    default:
      return { 
        label: status, 
        colorClass: 'bg-slate-600/90 backdrop-blur-md text-white border border-slate-400/50 font-bold shadow-md' 
      };
  }
}

export function parseGeoLocation(loc: any): { latitude: number; longitude: number } | null {
  if (!loc) return null;

  // Si ya es un objeto { latitude, longitude } o { lat, lng }
  if (typeof loc === 'object' && loc !== null) {
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && !isNaN(loc.latitude) && !isNaN(loc.longitude)) {
      return { latitude: loc.latitude, longitude: loc.longitude };
    }
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number' && !isNaN(loc.lat) && !isNaN(loc.lng)) {
      return { latitude: loc.lat, longitude: loc.lng };
    }
    // GeoJSON { type: 'Point', coordinates: [lng, lat] }
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      const lat = Number(loc.coordinates[1]);
      const lng = Number(loc.coordinates[0]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  // Si es un string
  if (typeof loc === 'string') {
    // 1. WKT: "POINT(lng lat)" o "SRID=4326;POINT(lng lat)"
    const pointMatch = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (pointMatch) {
      const lat = parseFloat(pointMatch[2]);
      const lng = parseFloat(pointMatch[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    // 2. EWKB Hexadecimal (formato devuelto por defecto por PostGIS en Supabase / PostgREST)
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
          offset += 4; // saltar SRID de 4 bytes
        }
        const lng = view.getFloat64(offset, isLittleEndian);
        offset += 8;
        const lat = view.getFloat64(offset, isLittleEndian);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { latitude: lat, longitude: lng };
        }
      }
    } catch {
      // Ignorar error de parsing EWKB y continuar
    }
  }

  return null;
}

