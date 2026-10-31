/**
 * Manejador de Autoría y Publicaciones por Dispositivo (localStorage)
 * Permite que el navegador/celular recuerde las publicaciones que creó
 * sin obligar a registrar una cuenta previa.
 */

const STORAGE_KEY_LOST = 'mascotas_my_lost_reports';
const STORAGE_KEY_FOUND = 'mascotas_my_found_reports';
const STORAGE_KEY_SIGHTINGS = 'mascotas_my_sightings';

function getStoredArray(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return [];
  }
}

function setStoredArray(key: string, list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(list))));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

export function saveCreatedReportId(type: 'lost' | 'found' | 'sighting', id: string): void {
  if (!id) return;
  const key = type === 'lost' ? STORAGE_KEY_LOST : type === 'found' ? STORAGE_KEY_FOUND : STORAGE_KEY_SIGHTINGS;
  const current = getStoredArray(key);
  if (!current.includes(id)) {
    setStoredArray(key, [id, ...current]);
  }
}

export function getMyReportIds(type: 'lost' | 'found' | 'sighting'): string[] {
  const key = type === 'lost' ? STORAGE_KEY_LOST : type === 'found' ? STORAGE_KEY_FOUND : STORAGE_KEY_SIGHTINGS;
  return getStoredArray(key);
}

export function removeCreatedReportId(type: 'lost' | 'found' | 'sighting', id: string): void {
  const key = type === 'lost' ? STORAGE_KEY_LOST : type === 'found' ? STORAGE_KEY_FOUND : STORAGE_KEY_SIGHTINGS;
  const current = getStoredArray(key);
  setStoredArray(key, current.filter(item => item !== id));
}
