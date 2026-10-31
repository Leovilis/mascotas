import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminKey } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITY_TABLE: Record<string, string> = {
  lost_report: 'lost_reports',
  found_report: 'found_reports',
  sighting: 'sightings',
};

// GET /api/admin/moderation -> denuncias pendientes (y las últimas resueltas)
export async function GET(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('moderation_reports')
    .select('id, reported_entity_type, reported_entity_id, reason, details, resolved, resolved_at, created_at')
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data || [] });
}

/**
 * PATCH /api/admin/moderation  { id, action: 'dismiss' | 'hide' }
 *  - dismiss: la denuncia no corresponde (se marca resuelta).
 *  - hide: se oculta la publicación denunciada (perdida/encontrada -> REMOVED, avistamiento -> DISMISSED)
 *          y se marcan resueltas todas las denuncias de esa publicación.
 */
export async function PATCH(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { id?: string; action?: string } | null;
  if (!body?.id || !UUID_RE.test(body.id) || (body.action !== 'dismiss' && body.action !== 'hide')) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: flag, error: fErr } = await supabase
    .from('moderation_reports')
    .select('id, reported_entity_type, reported_entity_id')
    .eq('id', body.id)
    .maybeSingle();
  if (fErr || !flag) return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 });

  const now = new Date().toISOString();
  if (body.action === 'hide') {
    const table = ENTITY_TABLE[flag.reported_entity_type];
    if (!table) return NextResponse.json({ error: 'Tipo de publicación no soportado' }, { status: 400 });
    const status = table === 'sightings' ? 'DISMISSED' : 'REMOVED';
    const { error } = await supabase.from(table).update({ status }).eq('id', flag.reported_entity_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase
      .from('moderation_reports')
      .update({ resolved: true, resolved_at: now })
      .eq('reported_entity_id', flag.reported_entity_id)
      .eq('resolved', false);
  } else {
    const { error } = await supabase.from('moderation_reports').update({ resolved: true, resolved_at: now }).eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
