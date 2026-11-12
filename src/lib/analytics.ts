/**
 * Google Analytics 4 (solo si está configurado NEXT_PUBLIC_GA_ID).
 * Nunca mandamos datos personales: ni teléfonos, ni emails, ni códigos de gestión.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

/** Parámetros de la URL que se pueden mandar a Analytics (el resto se descarta: ?code= tiene el código secreto) */
const ALLOWED_PARAMS = ['region', 'especie', 'tipo', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

/** URL sin datos sensibles para registrar la visita */
export function safePageLocation(pathname: string, search: URLSearchParams | null): string {
  const params = new URLSearchParams();
  search?.forEach((value, key) => {
    if (ALLOWED_PARAMS.includes(key)) params.set(key, value);
  });
  const qs = params.toString();
  return `${window.location.origin}${pathname}${qs ? `?${qs}` : ''}`;
}

/** Evento personalizado (ej: trackEvent('publicar_perdida', { region: 'jujuy' })) */
export function trackEvent(name: string, params: Record<string, string | number | boolean | undefined> = {}): void {
  try {
    if (GA_ID && typeof window !== 'undefined' && window.gtag) window.gtag('event', name, params);
  } catch {}
}
