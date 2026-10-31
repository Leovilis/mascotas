import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Seguridad del lado del SERVIDOR para las rutas /api/*.
 *
 * - Administrador: el panel envía la clave en el header "x-admin-key" y se compara con
 *   la variable de entorno ADMIN_API_KEY (configurarla en Vercel, nunca con prefijo NEXT_PUBLIC_).
 * - Dueño de una publicación: al publicar, el navegador genera un "token de edición" secreto y en la
 *   base se guarda solo su hash SHA-256 (edit_token_hash). Para marcar "reunida" o borrar,
 *   el navegador manda el token y acá se compara el hash.
 */

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** true si la request trae una clave de administrador válida */
export function isAdminRequest(req: Request): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected.length < 12) return false;
  return safeEqual(req.headers.get('x-admin-key') || '', expected);
}

/**
 * Exige clave de administrador. Devuelve null si está autorizado,
 * o la respuesta de error para devolver.
 */
export function checkAdminKey(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected.length < 12) {
    return NextResponse.json(
      { error: 'Falta configurar ADMIN_API_KEY (mínimo 12 caracteres) en las variables de entorno del servidor.' },
      { status: 503 }
    );
  }
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Clave de administrador inválida.' }, { status: 401 });
  }
  return null;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Compara un token de edición con el hash guardado en la base */
export function editTokenMatches(token: unknown, storedHash: unknown): boolean {
  if (typeof token !== 'string' || token.length < 32 || token.length > 200) return false;
  if (typeof storedHash !== 'string' || storedHash.length !== 64) return false;
  return safeEqual(sha256Hex(token), storedHash);
}

/**
 * Límite simple de pedidos por IP (en memoria, por instancia del servidor).
 * No es infalible en serverless, pero frena abusos básicos sin servicios externos.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: Request, key: string, max: number, windowMs: number): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'desconocida';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(id);
  if (!entry || entry.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
