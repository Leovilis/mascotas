/** true si la URL es una foto subida al Storage público de ESTE proyecto de Supabase */
export function isOwnStorageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 500) return false;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  return !!base && url.startsWith(`${base}/storage/v1/object/public/`);
}
