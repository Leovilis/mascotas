'use client';

import React, { useState } from 'react';
import { LocateFixed, Loader2, MapPin } from 'lucide-react';
import { isRegionSlug, REGION_LIST } from '@/config/regions';
import { cn } from '@/lib/utils';
import { useRegion } from './RegionProvider';

const DETECT_VALUE = '__detect__';

const ERROR_MESSAGES: Record<string, string> = {
  unsupported: 'Tu navegador no permite obtener la ubicación.',
  denied: 'No diste permiso de ubicación. Podés elegir la provincia a mano.',
  unavailable: 'No pudimos obtener tu ubicación. Probá de nuevo o elegila a mano.',
  outside: 'Tu ubicación no está en una provincia habilitada todavía.',
};

/**
 * Selector de provincia con opción "Detectar mi ubicación" (GPS del dispositivo).
 * variant="pill": compacto para la barra superior. variant="panel": bloque ancho para el menú.
 */
export function RegionSelector({ variant = 'pill', className }: { variant?: 'pill' | 'panel'; className?: string }) {
  const { region, setRegion, detectWithGps, isDetecting, source } = useRegion();
  const [message, setMessage] = useState<string | null>(null);

  const handleDetect = async () => {
    setMessage(null);
    const result = await detectWithGps();
    if (!result.ok) setMessage(ERROR_MESSAGES[result.reason]);
    else if (!result.changed) setMessage(`Ya estás viendo los avisos de ${result.region.provinceName}.`);
  };

  const handleChange = (value: string) => {
    if (value === DETECT_VALUE) {
      handleDetect();
      return;
    }
    if (isRegionSlug(value)) {
      setMessage(null);
      setRegion(value, 'manual');
    }
  };

  if (variant === 'panel') {
    return (
      <div className={cn('p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5 text-xs', className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="font-bold">Provincia:</span>
            <select
              value={region.slug}
              onChange={(e) => handleChange(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              {REGION_LIST.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.provinceName} ({r.mainCity})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] font-semibold text-zinc-500 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
            {source === 'gps' ? 'Por GPS' : source === 'ip' ? 'Aproximada' : source === 'manual' ? 'Elegida' : 'Por defecto'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDetect}
          disabled={isDetecting}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-2 transition-colors"
        >
          {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          {isDetecting ? 'Buscando tu ubicación…' : 'Detectar mi ubicación'}
        </button>
        {message && <p className="text-zinc-600 dark:text-zinc-400">{message}</p>}
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300', className)}>
      {isDetecting ? (
        <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
      ) : (
        <MapPin className="w-3.5 h-3.5 text-orange-500" />
      )}
      <select
        value={region.slug}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Elegir provincia"
        className="bg-transparent border-none focus:outline-none cursor-pointer pr-1 font-semibold text-zinc-800 dark:text-zinc-200"
      >
        {REGION_LIST.map((r) => (
          <option key={r.slug} value={r.slug} className="text-zinc-900 dark:text-zinc-100">
            📍 {r.provinceName}
          </option>
        ))}
        <option value={DETECT_VALUE} className="text-zinc-900 dark:text-zinc-100">
          🛰️ Detectar mi ubicación
        </option>
      </select>
      {message && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-2.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 z-50">
          {message}
          <button type="button" onClick={() => setMessage(null)} className="block mt-1 font-bold text-orange-600">
            Entendido
          </button>
        </div>
      )}
    </div>
  );
}
