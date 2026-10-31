import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/admin-auth';
import { authorizeReportAction, parseReportRequest } from '@/lib/report-auth';
import { isValidEmail, sendEmail } from '@/lib/email';
import { getReportSummary, managementCodeEmail, siteOrigin } from '@/lib/report-email';

export const dynamic = 'force-dynamic';

/**
 * Guarda el email PRIVADO de quien publicó y le manda su código de gestión.
 * Solo lo puede hacer quien tiene el código (editToken) de la publicación.
 */
export async function POST(req: Request) {
  if (!rateLimit(req, 'report-contact', 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }

  const parsed = parseReportRequest(await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const { reportId, type, editToken, raw } = parsed;

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'El email no tiene un formato válido.' }, { status: 400 });
  }
  if (typeof editToken !== 'string') {
    return NextResponse.json({ error: 'Falta el código de gestión.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const auth = await authorizeReportAction(req, supabase, type, reportId, editToken);
  if (!auth.ok) return auth.response;

  const { error } = await supabase
    .from('report_contacts')
    .upsert({ report_type: type, report_id: reportId, email }, { onConflict: 'report_type,report_id' });
  if (error) {
    console.error('Error guardando email de contacto:', error);
    const hint = /report_contacts/.test(error.message) ? ' (falta correr la migración 20261031000002_report_contacts.sql)' : '';
    return NextResponse.json({ error: 'No se pudo guardar el email' + hint }, { status: 500 });
  }

  const summary = await getReportSummary(supabase, type, reportId);
  if (!summary) return NextResponse.json({ success: true, sent: false });

  const mail = managementCodeEmail({ origin: siteOrigin(req), type, id: reportId, token: editToken, ...summary });
  const result = await sendEmail({ to: email, ...mail });
  return NextResponse.json({ success: true, sent: result.sent });
}
