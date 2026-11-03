import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/admin-auth';
import { authorizeReportAction, parseReportRequest, REPORT_TABLE, ReportType } from '@/lib/report-auth';

export const dynamic = 'force-dynamic';

/** Estados permitidos por tipo de publicación */
const ALLOWED_STATUS: Record<ReportType, string[]> = {
  lost: ['ACTIVE', 'REUNITED'],
  found: ['ACTIVE', 'REUNITED'],
  sighting: ['PENDING', 'VERIFIED', 'DISMISSED'],
};

const MESSAGES: Record<string, string> = {
  'lost:REUNITED': '¡Mascota marcada como reunida con su familia! ❤️',
  'lost:ACTIVE': 'Búsqueda reactivada',
  'found:REUNITED': 'Mascota encontrada marcada como devuelta a su familia ❤️',
  'found:ACTIVE': 'Publicación reactivada',
  'sighting:VERIFIED': 'Avistamiento verificado correctamente',
  'sighting:PENDING': 'Avistamiento marcado como pendiente',
  'sighting:DISMISSED': 'Avistamiento descartado',
};

/**
 * Cambia el estado de una publicación (reunida / activa, verificado / pendiente).
 * Autorizado: administrador (x-admin-key) o dueño (editToken).
 */
export async function POST(req: Request) {
  if (!rateLimit(req, 'report-status', 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }

  const parsed = parseReportRequest(await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const { reportId, type, editToken, raw } = parsed;

  const requested = typeof raw.status === 'string' ? raw.status : type === 'sighting' ? 'VERIFIED' : 'REUNITED';
  // Compatibilidad: algunos clientes mandan REUNITED para avistamientos
  const status = type === 'sighting' && requested === 'REUNITED' ? 'VERIFIED' : requested;
  if (!ALLOWED_STATUS[type].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const auth = await authorizeReportAction(req, supabaseAdmin, type, reportId, editToken);
    if (!auth.ok) return auth.response;

    const patch: Record<string, unknown> = { status };
    if (type !== 'sighting') {
      patch.updated_at = new Date().toISOString();
      // Fecha del reencuentro (para /reencuentros); se borra si la búsqueda se reactiva
      patch.reunited_at = status === 'REUNITED' ? patch.updated_at : null;
    }

    const { data, error } = await supabaseAdmin
      .from(REPORT_TABLE[type])
      .update(patch)
      .eq('id', reportId)
      .select('id, status')
      .single();

    if (error) {
      console.error('Error al actualizar estado:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, report: data, message: MESSAGES[`${type}:${status}`] });
  } catch (error) {
    console.error('Error en /api/reports/reunited:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
