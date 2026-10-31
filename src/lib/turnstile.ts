/**
 * Verificación de Cloudflare Turnstile del lado del servidor.
 *
 * Variables:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (pública, la usa el widget en el navegador)
 *   TURNSTILE_SECRET_KEY            (secreta, solo servidor)
 * Si TURNSTILE_SECRET_KEY no está configurada, la verificación se omite (útil en desarrollo)
 * y se avisa en la consola del servidor.
 */
export function isTurnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token: unknown, req: Request): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY no configurada: se omite la verificación.');
    return { ok: true };
  }
  if (typeof token !== 'string' || token.length < 10 || token.length > 4096) {
    return { ok: false, error: 'Completá la verificación de seguridad antes de enviar.' };
  }
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip);
    const res = await fetch(process.env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    console.warn('[turnstile] verificación rechazada:', data['error-codes']);
    return { ok: false, error: 'La verificación de seguridad falló o venció. Volvé a intentarlo.' };
  } catch (err) {
    console.error('[turnstile] error al verificar:', err);
    return { ok: false, error: 'No se pudo verificar la seguridad. Probá de nuevo.' };
  }
}
