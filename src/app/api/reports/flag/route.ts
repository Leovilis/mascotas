import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/admin-auth';
import { verifyTurnstile } from '@/lib/turnstile';
import { dbRateLimit } from '@/lib/db-rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITY_TABLE: Record<string, string> = {
  lost_report: 'lost_reports',
  found_report: 'found_reports',
  sighting: 'sightings',
};
const REASONS = ['false_information', 'spam', 'inappropriate_content', 'scam', 'duplicate', 'other'];

/** Denuncia pública de una publicación (sin cuenta). Queda pendiente para el panel de moderación. */
export async function POST(req: Request) {
  if (!rateLimit(req, 'flag', 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Ya enviaste varias denuncias. Probá de nuevo más tarde.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const entityType = body?.entityType;
  const entityId = body?.entityId;
  const reason = body?.reason;
  const details = typeof body?.details === 'string' ? body.details.trim().slice(0, 500) : null;

  const captcha = await verifyTurnstile(body?.turnstileToken, req);
  if (!captcha.ok) return NextResponse.json({ error: captcha.error }, { status: 403 });

  if (typeof entityType !== 'string' || !(entityType in ENTITY_TABLE)) {
    return NextResponse.json({ error: 'Tipo de publicación inválido' }, { status: 400 });
  }
  if (typeof entityId !== 'string' || !UUID_RE.test(entityId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  if (typeof reason !== 'string' || !REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Motivo inválido' }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!(await dbRateLimit(supabase, req, 'flag', 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Ya enviaste varias denuncias. Probá de nuevo más tarde.' }, { status: 429 });
  }
  const { data: exists } = await supabase.from(ENTITY_TABLE[entityType]).select('id').eq('id', entityId).maybeSingle();
  if (!exists) return NextResponse.json({ error: 'La publicación no existe' }, { status: 404 });

  const { error } = await supabase.from('moderation_reports').insert({
    reported_entity_type: entityType,
    reported_entity_id: entityId,
    reason,
    details: details || null,
  });
  if (error) {
    console.error('Error guardando denuncia:', error);
    return NextResponse.json({ error: 'No se pudo enviar la denuncia' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
