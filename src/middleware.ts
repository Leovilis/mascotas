import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  DEFAULT_REGION_SLUG,
  findRegionByIsoCode,
  isRegionSlug,
  REGION_COOKIE,
  REGION_COOKIE_MAX_AGE,
  REGION_SOURCE_COOKIE,
  RegionSlug,
  RegionSource,
} from '@/config/regions';

/**
 * Decide la región del visitante (sin costo de base de datos):
 *  1. ?region=jujuy en la URL (ej: QR impresos para una provincia) → elección manual
 *  2. Cookie ya existente → se respeta
 *  3. Geolocalización por IP que agrega Vercel (x-vercel-ip-country-region) → aproximada
 *  4. Región por defecto del despliegue
 * La detección precisa por GPS se hace en el navegador (RegionProvider).
 */
function resolveRegion(request: NextRequest): { slug: RegionSlug; source: RegionSource; changed: boolean } {
  const param = request.nextUrl.searchParams.get('region');
  if (isRegionSlug(param)) {
    const changed = request.cookies.get(REGION_COOKIE)?.value !== param;
    return { slug: param, source: 'manual', changed };
  }

  const existing = request.cookies.get(REGION_COOKIE)?.value;
  if (isRegionSlug(existing)) {
    const src = request.cookies.get(REGION_SOURCE_COOKIE)?.value as RegionSource | undefined;
    return { slug: existing, source: src ?? 'default', changed: false };
  }

  const country = request.headers.get('x-vercel-ip-country');
  const ipRegion = country === 'AR' ? findRegionByIsoCode(request.headers.get('x-vercel-ip-country-region')) : null;
  if (ipRegion) return { slug: ipRegion.slug, source: 'ip', changed: true };

  return { slug: DEFAULT_REGION_SLUG, source: 'default', changed: true };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const region = resolveRegion(request);

  // La cookie se escribe también en el request para que el primer render ya use la región correcta
  if (region.changed) {
    request.cookies.set(REGION_COOKIE, region.slug);
    request.cookies.set(REGION_SOURCE_COOKIE, region.source);
  }

  const withRegionCookie = (response: NextResponse) => {
    if (region.changed) {
      const opts = { path: '/', maxAge: REGION_COOKIE_MAX_AGE, sameSite: 'lax' as const };
      response.cookies.set(REGION_COOKIE, region.slug, opts);
      response.cookies.set(REGION_SOURCE_COOKIE, region.source, opts);
    }
    return response;
  };

  // 1. Rutas protegidas que requieren validación de sesión obligatoria
  const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/mis-reportes');

  // 2. Verificar si el usuario tiene cookies de autenticación de Supabase
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') || cookie.name.includes('auth-token'));

  // Si es una ruta pública y el usuario no tiene cookies de sesión,
  // retornamos de inmediato sin invocar Supabase Auth
  if (!isProtectedPath && !hasAuthCookie) {
    return withRegionCookie(NextResponse.next({ request }));
  }

  return withRegionCookie(await updateSession(request));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
