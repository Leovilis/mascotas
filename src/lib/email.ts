/**
 * Envío de emails con Resend (https://resend.com) usando su API HTTP (sin dependencias extra).
 *
 * Variables de entorno (solo servidor):
 *   RESEND_API_KEY  -> clave de Resend (re_...)
 *   EMAIL_FROM      -> remitente, ej: "Mascotas Perdidas <avisos@tudominio.com.ar>"
 *                      (el dominio tiene que estar verificado en Resend)
 * Si no están configuradas, los envíos se omiten sin romper nada (la app sigue funcionando).
 */

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn('[email] RESEND_API_KEY / EMAIL_FROM no configurados: no se envió el mail.');
    return { sent: false, error: 'not_configured' };
  }
  try {
    const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email] Resend respondió', res.status, body);
      return { sent: false, error: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] Error enviando mail:', err);
    return { sent: false, error: 'network' };
  }
}

/** Plantilla simple y compatible con clientes de correo (estilos en línea) */
export function emailLayout(opts: { brand: string; title: string; bodyHtml: string }): string {
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#f97316;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold;">🐾 ${escapeHtml(opts.brand)}</td></tr>
        <tr><td style="padding:24px;">
          <h1 style="font-size:20px;margin:0 0 16px 0;">${escapeHtml(opts.title)}</h1>
          ${opts.bodyHtml}
          <p style="margin:24px 0 0 0;padding:12px;border-radius:10px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#78350f;">
            ⚠️ <strong>Cuidado con las estafas:</strong> nunca transfieras dinero por adelantado para recuperar una mascota.
            Pedí una foto actual o una videollamada y encontrate en un lugar público.
          </p>
        </td></tr>
        <tr><td style="padding:14px 24px;font-size:11px;color:#71717a;border-top:1px solid #e4e4e7;">
          Recibiste este mail porque dejaste esta dirección al publicar en ${escapeHtml(opts.brand)}. Red comunitaria y gratuita.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px;font-size:14px;">${escapeHtml(label)}</a>`;
}

export function emailCode(code: string): string {
  return `<div style="font-family:Consolas,Menlo,monospace;font-size:13px;word-break:break-all;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:12px;color:#7c2d12;">${escapeHtml(code)}</div>`;
}
