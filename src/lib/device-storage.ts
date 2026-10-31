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

// ---------------------------------------------------------------------------
// Tokens de edición: prueban que este dispositivo creó la publicación.
// Se guardan como { [id]: token }. El "código de gestión" es "id.token" y sirve
// para administrar la publicación desde otro equipo.
// ---------------------------------------------------------------------------
const STORAGE_KEY_TOKENS = 'mascotas_edit_tokens';

function getTokenMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveEditToken(id: string, token: string): void {
  if (typeof window === 'undefined' || !id || !token) return;
  try {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify({ ...getTokenMap(), [id]: token }));
  } catch (e) {
    console.error('No se pudo guardar el token de edición:', e);
  }
}

export function getEditToken(id: string): string | null {
  return getTokenMap()[id] || null;
}

/** Código para administrar la publicación desde cualquier equipo: "id.token" */
export function getManagementCode(id: string): string {
  const token = getEditToken(id);
  return token ? `${id}.${token}` : id;
}

/** Interpreta un código de gestión ("id.token"), un ID suelto o una URL que termine en el ID */
export function parseManagementCode(raw: string): { id: string; token: string | null } {
  let value = raw.trim();
  if (value.includes('/')) {
    const parts = value.split(/[/?#]/).filter(Boolean);
    value = parts[parts.length - 1] || value;
  }
  value = value.replace(/^code=/, '').split('&')[0];
  const [id, token] = value.split('.');
  return { id: (id || '').trim(), token: token && /^[0-9a-f]{64}$/i.test(token) ? token.toLowerCase() : null };
}
