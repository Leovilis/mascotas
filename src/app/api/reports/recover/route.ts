import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, sha256Hex } from '@/lib/admin-auth';
import { emailButton, emailCode, emailLayout, escapeHtml, isValidEmail, sendEmail } from '@/lib/email';
import { DETAIL_PATH, getReportSummary, siteOrigin } from '@/lib/report-email';
import type { ReportType } from '@/lib/report-auth';
import { DEFAULT_REGION } from '@/config/regions';
import { verifyTurnstile } from '@/lib/turnstile';
import { dbRateLimit } from '@/lib/db-rate-limit';

export const dynamic = 'force-dynamic';

const TABLE: Record<ReportType, string> = { lost: 'lost_reports', found: 'found_reports', sighting: 'sightings' };

/**
 * "Perdí mi código": si hay publicaciones con ese email, se generan códigos NUEVOS
 * (los anteriores dejan de funcionar) y se envían por mail.
 * Siempre responde lo mismo, para no revelar qué emails están registrados.
 */
export async function POST(req: Request) {
  if (!rateLimit(req, 'report-recover', 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en 15 minutos.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { email?: unknown; turnstileToken?: unknown } | null;
  const captcha = await verifyTurnstile(body?.turnstileToken, req);
  if (!captcha.ok) return NextResponse.json({ error: captcha.error }, { status: 403 });
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'El email no tiene un formato válido.' }, { status: 400 });
  }

  const generic = NextResponse.json({
    success: true,
    message: 'Si hay publicaciones asociadas a ese email, te enviamos los códigos de gestión. Revisá también la carpeta de spam.',
  });

  const supabase = createAdminClient();
  if (!(await dbRateLimit(supabase, req, 'recover', 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en una hora.' }, { status: 429 });
  }
  const { data: contacts } = await supabase
    .from('report_contacts')
    .select('report_type, report_id')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(10);
  if (!contacts || contacts.length === 0) return generic;

  const origin = siteOrigin(req);
  const items: { title: string; code: string; manageUrl: string; detailUrl: string }[] = [];
  let brand = DEFAULT_REGION.brandName;

  for (const c of contacts as { report_type: ReportType; report_id: string }[]) {
    const summary = await getReportSummary(supabase, c.report_type, c.report_id);
    if (!summary) continue; // la publicación ya no existe
    const token = randomBytes(32).toString('hex');
    const { error } = await supabase
      .from(TABLE[c.report_type])
      .update({ edit_token_hash: sha256Hex(token) })
      .eq('id', c.report_id);
    if (error) continue;
    brand = summary.region.brandName;
    const code = `${c.report_id}.${token}`;
    items.push({
      title: `${summary.petName}${summary.address ? ` — ${summary.address}` : ''}`,
      code,
      manageUrl: `${origin}/mis-reportes?code=${encodeURIComponent(code)}`,
      detailUrl: `${origin}${DETAIL_PATH[c.report_type]}${c.report_id}`,
    });
  }
  if (items.length === 0) return generic;

  const html = emailLayout({
    brand,
    title: 'Tus códigos de gestión',
    bodyHtml: `
      <p style="font-size:14px;line-height:1.5;margin:0 0 16px 0;">Pediste recuperar el acceso a tus publicaciones. Generamos <strong>códigos nuevos</strong>: los anteriores ya no funcionan.</p>
      ${items
        .map(
          (it) => `
        <div style="margin:0 0 18px 0;">
          <p style="font-weight:bold;margin:0 0 6px 0;">${escapeHtml(it.title)}</p>
          ${emailCode(it.code)}
          <p style="margin:8px 0 0 0;">${emailButton(it.manageUrl, 'Administrar')} &nbsp; <a href="${escapeHtml(it.detailUrl)}" style="color:#ea580c;font-size:13px;">Ver ficha</a></p>
        </div>`
        )
        .join('')}
      <p style="font-size:12px;color:#71717a;">Si no fuiste vos, no hace falta que hagas nada: con este mail seguís teniendo el control.</p>`,
  });
  const text =
    'Tus códigos de gestión (los anteriores ya no funcionan):\n\n' +
    items.map((it) => `${it.title}\nCódigo: ${it.code}\nAdministrar: ${it.manageUrl}\n`).join('\n');

  await sendEmail({ to: email, subject: '🐾 Tus códigos de gestión', html, text });
  return generic;
}
