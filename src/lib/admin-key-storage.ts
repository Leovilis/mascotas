/**
 * Clave de administrador en el navegador: se guarda solo en sessionStorage
 * (se borra al cerrar la pestaña) y se verifica siempre en el servidor.
 */
const KEY_STORAGE = 'mascotas_admin_api_key';

export function readAdminKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function writeAdminKey(value: string | null): void {
  try {
    if (value) sessionStorage.setItem(KEY_STORAGE, value);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {}
}

/** Pregunta al servidor si la clave es válida */
export async function verifyAdminKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/verify', { method: 'POST', headers: { 'x-admin-key': key } });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || 'Clave inválida.' };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}
