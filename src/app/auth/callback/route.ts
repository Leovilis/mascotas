import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Vuelta desde los mails de Supabase Auth (confirmar cuenta, recuperar contraseña).
 * Acepta los dos formatos: ?code=... (PKCE) y ?token_hash=...&type=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get('next') || '/cuenta';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/cuenta';
  const supabase = await createClient();

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  if (!ok) {
    return NextResponse.redirect(
      new URL(`/cuenta/ingresar?e=${encodeURIComponent('El link venció o ya se usó. Ingresá con tu email y contraseña, o pedí uno nuevo.')}`, url.origin)
    );
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
