'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { getRegion, REGION_COOKIE, REGION_COOKIE_MAX_AGE, REGION_SOURCE_COOKIE, RegionConfig, RegionSlug, RegionSource } from '@/config/regions';

export type GpsDetectResult =
  | { ok: true; region: RegionConfig; changed: boolean }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' | 'outside' };

interface RegionContextValue {
  region: RegionConfig;
  source: RegionSource;
  /** Cambia la provincia (por defecto como elección manual del usuario) */
  setRegion: (slug: RegionSlug, source?: RegionSource) => void;
  /** Pide la ubicación GPS del dispositivo y elige la provincia correspondiente */
  detectWithGps: () => Promise<GpsDetectResult>;
  isDetecting: boolean;
}

const RegionContext = createContext<RegionContextValue | null>(null);

const NOTICE_KEY = 'mascotas_region_gps_notice';

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${REGION_COOKIE_MAX_AGE}; samesite=lax`;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, // para saber la provincia alcanza con baja precisión (más rápido y menos batería)
      timeout: 10000,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

export function RegionProvider({
  initialSlug,
  initialSource,
  children,
}: {
  initialSlug: RegionSlug;
  initialSource: RegionSource;
  children: React.ReactNode;
}) {
  const [region, setRegionState] = useState<RegionConfig>(() => getRegion(initialSlug));
  const [source, setSource] = useState<RegionSource>(initialSource);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoNotice, setAutoNotice] = useState<RegionConfig | null>(null);
  const regionRef = useRef(region);
  const sourceRef = useRef(source);
  useEffect(() => {
    regionRef.current = region;
    sourceRef.current = source;
  }, [region, source]);

  const setRegion = useCallback(
    (slug: RegionSlug, newSource: RegionSource = 'manual') => {
      const next = getRegion(slug);
      writeCookie(REGION_COOKIE, next.slug);
      writeCookie(REGION_SOURCE_COOKIE, newSource);
      sourceRef.current = newSource;
      setSource(newSource);
      if (next.slug !== regionRef.current.slug) {
        regionRef.current = next;
        setRegionState(next);
        // Recargamos la página para que TODO (servidor y cliente) use la nueva provincia.
        // Se quita ?region= de la URL para que no vuelva a forzar la provincia anterior.
        const url = new URL(window.location.href);
        url.searchParams.delete('region');
        window.location.replace(url.toString());
      }
    },
    []
  );

  const detectWithGps = useCallback(async (): Promise<GpsDetectResult> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return { ok: false, reason: 'unsupported' };
    }
    setIsDetecting(true);
    try {
      const pos = await getPosition();
      // Import dinámico: los polígonos de límites solo se descargan cuando hace falta
      const { findRegionByCoords } = await import('@/config/region-geo');
      const found = findRegionByCoords(pos.coords.latitude, pos.coords.longitude);
      if (!found) return { ok: false, reason: 'outside' };
      const changed = found.slug !== regionRef.current.slug;
      if (changed) {
        // Para mostrar el aviso "Detectamos que estás en..." después de recargar
        try {
          sessionStorage.setItem(NOTICE_KEY, found.slug);
        } catch {}
      }
      setRegion(found.slug, 'gps');
      return { ok: true, region: found, changed };
    } catch (err) {
      const code = (err as GeolocationPositionError)?.code;
      return { ok: false, reason: code === 1 ? 'denied' : 'unavailable' };
    } finally {
      setIsDetecting(false);
    }
  }, [setRegion]);

  // Aviso pendiente de una detección por GPS que cambió la provincia (antes de recargar)
  useEffect(() => {
    let slug: string | null = null;
    try {
      slug = sessionStorage.getItem(NOTICE_KEY);
      sessionStorage.removeItem(NOTICE_KEY);
    } catch {}
    if (!slug) return;
    const timer = setTimeout(() => setAutoNotice(getRegion(slug)), 0);
    return () => clearTimeout(timer);
  }, []);

  // Detección automática silenciosa:
  // solo si el usuario NO eligió provincia a mano y YA dio permiso de ubicación
  // (no mostramos el cartel de permiso del navegador sin que el usuario lo pida).
  useEffect(() => {
    if (sourceRef.current === 'manual') return;
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let status: PermissionStatus | null = null;
    let cancelled = false;

    const runSilentDetect = async () => {
      if (cancelled || sourceRef.current === 'manual') return;
      await detectWithGps();
    };

    const onChange = () => {
      if (status?.state === 'granted') runSilentDetect();
    };

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        if (s.state === 'granted') runSilentDetect();
        // Si el usuario concede el permiso más tarde (ej: desde el mapa), detectamos en ese momento
        s.addEventListener('change', onChange);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      status?.removeEventListener('change', onChange);
    };
  }, [detectWithGps]);

  return (
    <RegionContext.Provider value={{ region, source, setRegion, detectWithGps, isDetecting }}>
      {children}
      {autoNotice && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-start gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-zinc-900 shadow-xl p-4 text-sm">
            <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="flex-1 text-zinc-700 dark:text-zinc-300">
              Detectamos que estás en <strong>{autoNotice.provinceName}</strong>. Te mostramos los avisos de esa provincia.
              Podés cambiarla cuando quieras desde el selector de provincia.
            </p>
            <button
              type="button"
              onClick={() => setAutoNotice(null)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion debe usarse dentro de <RegionProvider>');
  return ctx;
}
