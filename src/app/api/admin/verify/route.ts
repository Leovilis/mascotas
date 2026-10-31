import { NextResponse } from 'next/server';
import { checkAdminKey, rateLimit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Verifica la clave de administrador (la usa la pantalla de ingreso del panel) */
export async function POST(req: Request) {
  // Frena intentos de adivinar la clave: 10 por cada 15 minutos por IP
  if (!rateLimit(req, 'admin-verify', 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 });
  }
  const denied = checkAdminKey(req);
  if (denied) return denied;
  return NextResponse.json({ ok: true });
}
