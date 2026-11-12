'use client';

import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_ID, safePageLocation } from '@/lib/analytics';

/** Rutas que no se miden (paneles internos) */
const EXCLUDED = ['/admin', '/asociacion'];

/**
 * Prepara la cola de Google Analytics (dataLayer + gtag) en el momento, aunque gtag.js
 * todavía no haya cargado: los eventos quedan en cola y se envían cuando el script llega.
 * Antes esto se hacía en un <Script> aparte que podía ejecutarse DESPUÉS de la primera
 * visita, y esa visita se perdía.
 */
function ensureGtag(): (...args: unknown[]) => void {
  if (window.gtag) return window.gtag;
  const dataLayer = (window.dataLayer = window.dataLayer || []);
  const gtag = function gtag() {
    // gtag necesita el objeto `arguments` tal cual (no un array)
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  } as (...args: unknown[]) => void;
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, { send_page_view: false });
  return gtag;
}

function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || EXCLUDED.some((p) => pathname.startsWith(p))) return;
    const gtag = ensureGtag();
    // Se espera un instante para que el título de la página nueva ya esté puesto
    const t = setTimeout(() => {
      gtag('event', 'page_view', {
        page_location: safePageLocation(pathname, searchParams),
        page_path: pathname,
        page_title: document.title,
      });
    }, 50);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Google Analytics 4. Las visitas se registran a mano (send_page_view: false) para
 * limpiar la URL: así nunca le llegan a Google los códigos de gestión (?code=) ni otros datos.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
