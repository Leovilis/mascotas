import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminKey } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Vacía todas las publicaciones. Solo administrador y con confirmación explícita.
 * Usa la función delete_all_reports(), que después de la migración de seguridad
 * solo puede ejecutar la service role.
 */
export async function POST(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== 'BORRAR TODO') {
    return NextResponse.json({ error: 'Falta la confirmación' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc('delete_all_reports');
  if (error) {
    console.error('Error en delete_all_reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    result: data,
    message: 'Todas las publicaciones y mascotas fueron eliminadas de la base de datos correctamente.',
  });
}
