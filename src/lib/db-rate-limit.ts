import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex } from '@/lib/admin-auth';

/** IP del visitante (Vercel / Cloudflare / proxy) */
export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'desconocida'
  );
}

/**
 * Límite por IP guardado en la base (tabla rate_limit_events), así funciona aunque
 * Vercel reparta los pedidos entre varias instancias. La IP se guarda hasheada.
 * Si la tabla todavía no existe (falta la migración), no bloquea.
 */
export async function dbRateLimit(
  supabase: SupabaseClient,
  req: Request,
  bucket: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const key = `${bucket}:${sha256Hex(clientIp(req)).slice(0, 32)}`;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', since);
  if (error) {
    console.warn('[rate-limit] no se pudo consultar rate_limit_events:', error.message);
    return true;
  }
  if ((count ?? 0) >= max) return false;
  await supabase.from('rate_limit_events').insert({ key });
  // De vez en cuando se borran los registros viejos
  if (Math.random() < 0.02) {
    supabase.rpc('cleanup_rate_limit_events').then(() => {}, () => {});
  }
  return true;
}
