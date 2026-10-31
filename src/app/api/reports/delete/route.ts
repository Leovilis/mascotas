import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/admin-auth';
import { authorizeReportAction, parseReportRequest, REPORT_TABLE } from '@/lib/report-auth';

export const dynamic = 'force-dynamic';

/**
 * Borra una publicación.
 * Autorizado: administrador (x-admin-key) o dueño (editToken).
 */
export async function POST(req: Request) {
  if (!rateLimit(req, 'report-delete', 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }

  const parsed = parseReportRequest(await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const { reportId, type, editToken } = parsed;

  try {
    const supabaseAdmin = createAdminClient();
    const auth = await authorizeReportAction(req, supabaseAdmin, type, reportId, editToken);
    if (!auth.ok) return auth.response;

    // Avistamientos vinculados a una mascota perdida
    if (type === 'lost') {
      await supabaseAdmin.from('sightings').delete().eq('lost_report_id', reportId);
    }

    const { error } = await supabaseAdmin.from(REPORT_TABLE[type]).delete().eq('id', reportId);
    if (error) {
      console.error('Error al eliminar publicación:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // La mascota asociada se borra solo si ninguna otra publicación la usa
    const petId = auth.row.pet_id;
    if (petId) {
      const [{ count: lostRefs }, { count: foundRefs }] = await Promise.all([
        supabaseAdmin.from('lost_reports').select('id', { count: 'exact', head: true }).eq('pet_id', petId),
        supabaseAdmin.from('found_reports').select('id', { count: 'exact', head: true }).eq('pet_id', petId),
      ]);
      if (!lostRefs && !foundRefs) {
        await supabaseAdmin.from('pets').delete().eq('id', petId);
      }
    }

    return NextResponse.json({ success: true, message: 'Publicación eliminada correctamente' });
  } catch (error) {
    console.error('Error en /api/reports/delete:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
