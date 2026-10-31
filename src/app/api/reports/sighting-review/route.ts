import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { editTokenMatches, isAdminRequest, rateLimit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECISION_STATUS = { confirm: 'VERIFIED', dismiss: 'DISMISSED', pending: 'PENDING' } as const;

/**
 * La familia (dueña de la mascota perdida) confirma o descarta un avistamiento.
 * Autorizado: administrador, o el código de gestión de la publicación de la mascota perdida
 * a la que está vinculado el avistamiento.
 */
export async function POST(req: Request) {
  if (!rateLimit(req, 'sighting-review', 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const sightingId = body?.sightingId;
  const decision = body?.decision as keyof typeof DECISION_STATUS;
  if (typeof sightingId !== 'string' || !UUID_RE.test(sightingId)) {
    return NextResponse.json({ error: 'ID de avistamiento inválido' }, { status: 400 });
  }
  if (!(decision in DECISION_STATUS)) {
    return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: sighting, error: sErr } = await supabase
    .from('sightings')
    .select('id, lost_report_id')
    .eq('id', sightingId)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: 'Error al leer el avistamiento' }, { status: 500 });
  if (!sighting) return NextResponse.json({ error: 'El avistamiento no existe' }, { status: 404 });

  let authorized = isAdminRequest(req);
  if (!authorized && sighting.lost_report_id) {
    const { data: lost } = await supabase
      .from('lost_reports')
      .select('edit_token_hash')
      .eq('id', sighting.lost_report_id)
      .maybeSingle();
    authorized = editTokenMatches(body?.editToken, lost?.edit_token_hash);
  }
  if (!authorized) {
    return NextResponse.json(
      { error: 'Solo la familia de la mascota (con su código de gestión) puede confirmar o descartar avistamientos.' },
      { status: 403 }
    );
  }

  const status = DECISION_STATUS[decision];
  const { error } = await supabase.from('sightings').update({ status }).eq('id', sightingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status });
}
