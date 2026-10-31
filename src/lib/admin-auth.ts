import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Verificación de administrador EN EL SERVIDOR para las rutas /api/admin/*.
 * El panel envía la clave en el header "x-admin-key" y se compara con la variable
 * de entorno ADMIN_API_KEY (configurarla en Vercel, nunca con prefijo NEXT_PUBLIC_).
 *
 * Devuelve null si está autorizado, o la respuesta de error para devolver.
 */
export function checkAdminKey(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected.length < 12) {
    return NextResponse.json(
      { error: 'Falta configurar ADMIN_API_KEY (mínimo 12 caracteres) en las variables de entorno del servidor.' },
      { status: 503 }
    );
  }
  const provided = req.headers.get('x-admin-key') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Clave de administrador inválida.' }, { status: 401 });
  }
  return null;
}
