'use client';

import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_ID, safePageLocation } from '@/lib/analytics';

/** Rutas que no se miden (paneles internos) */
const EXCLUDED = ['/admin', '/asociacion'];

function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || EXCLUDED.some((p) => pathname.startsWith(p))) return;
    // Se espera un instante para que el título de la página nueva ya esté puesto
    const t = setTimeout(() => {
      window.gtag?.('event', 'page_view', {
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
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`}
      </Script>
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
