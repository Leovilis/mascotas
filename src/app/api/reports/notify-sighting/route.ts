import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/admin-auth';
import { emailButton, emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { getReportSummary, siteOrigin } from '@/lib/report-email';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Avisa por mail a la familia que alguien reportó un avistamiento de su mascota.
 * Se envía UNA sola vez por avistamiento (columna owner_notified_at), y solo si
 * la familia dejó su email. Nunca se expone el email de la familia.
 */
export async function POST(req: Request) {
  if (!rateLimit(req, 'notify-sighting', 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { sightingId?: unknown } | null;
  const sightingId = body?.sightingId;
  if (typeof sightingId !== 'string' || !UUID_RE.test(sightingId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: sighting } = await supabase
    .from('sightings')
    .select('id, lost_report_id, approximate_address, description, sighting_date, owner_notified_at, created_at')
    .eq('id', sightingId)
    .maybeSingle();
  if (!sighting || !sighting.lost_report_id) return NextResponse.json({ success: true, sent: false });
  if (sighting.owner_notified_at) return NextResponse.json({ success: true, sent: false, reason: 'already_notified' });
  // Solo avistamientos recién creados (evita que alguien dispare avisos de avistamientos viejos)
  if (Date.now() - new Date(sighting.created_at).getTime() > 60 * 60 * 1000) {
    return NextResponse.json({ success: true, sent: false, reason: 'too_old' });
  }

  // Marcar primero (evita envíos duplicados si llegan dos pedidos juntos)
  const { data: claimed } = await supabase
    .from('sightings')
    .update({ owner_notified_at: new Date().toISOString() })
    .eq('id', sightingId)
    .is('owner_notified_at', null)
    .select('id');
  if (!claimed || claimed.length === 0) return NextResponse.json({ success: true, sent: false });

  const { data: contact } = await supabase
    .from('report_contacts')
    .select('email')
    .eq('report_type', 'lost')
    .eq('report_id', sighting.lost_report_id)
    .maybeSingle();
  if (!contact?.email) return NextResponse.json({ success: true, sent: false, reason: 'no_email' });

  const summary = await getReportSummary(supabase, 'lost', sighting.lost_report_id);
  if (!summary) return NextResponse.json({ success: true, sent: false });

  const origin = siteOrigin(req);
  const sightingUrl = `${origin}/mascota-avistada/${sighting.id}`;
  const title = `Nuevo avistamiento de ${summary.petName}`;
  const html = emailLayout({
    brand: summary.region.brandName,
    title,
    bodyHtml: `
      <p style="font-size:14px;line-height:1.5;margin:0 0 10px 0;">Un vecino reportó haber visto a <strong>${escapeHtml(summary.petName)}</strong>:</p>
      <p style="font-size:14px;margin:0 0 6px 0;">📍 <strong>${escapeHtml(sighting.approximate_address)}</strong></p>
      <p style="font-size:13px;color:#3f3f46;margin:0 0 16px 0;white-space:pre-line;">${escapeHtml(String(sighting.description || '').slice(0, 400))}</p>
      <p style="margin:0 0 10px 0;">${emailButton(sightingUrl, 'Ver el avistamiento')}</p>
      <p style="font-size:12px;color:#71717a;margin:0;">Desde la ficha podés confirmar si es tu mascota o descartarlo (necesitás tu código de gestión).</p>`,
  });
  const text = `${title}\n\nLugar: ${sighting.approximate_address}\n${String(sighting.description || '').slice(0, 400)}\n\nVer: ${sightingUrl}\n\nCuidado con las estafas: nunca transfieras dinero por adelantado.`;

  const result = await sendEmail({ to: contact.email, subject: `🟡 ${title}`, html, text });
  return NextResponse.json({ success: true, sent: result.sent });
}
