/**
 * Token de edición de publicaciones anónimas (lado navegador).
 * El token queda solo en el dispositivo de quien publicó (y en su "código de gestión");
 * en la base se guarda únicamente el hash SHA-256.
 */

export function generateEditToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256HexBrowser(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Genera un token nuevo y su hash para guardar en la base */
export async function createEditCredentials(): Promise<{ token: string; hash: string }> {
  const token = generateEditToken();
  return { token, hash: await sha256HexBrowser(token) };
}
