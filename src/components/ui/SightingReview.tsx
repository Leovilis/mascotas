'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { getEditToken } from '@/lib/device-storage';
import { reviewSightingAsOwner } from '@/services/reports.service';
import { cn } from '@/lib/utils';

/** Etiqueta del estado de un avistamiento */
export function SightingStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (status === 'VERIFIED') {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider', className)}>
        <CheckCircle2 className="w-3 h-3" /> Confirmado por la familia
      </span>
    );
  }
  if (status === 'DISMISSED') {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider', className)}>
        <XCircle className="w-3 h-3" /> Descartado
      </span>
    );
  }
  return (
    <span
      title="Lo informó un vecino y la familia todavía no lo revisó"
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-black uppercase tracking-wider', className)}
    >
      <CircleDashed className="w-3 h-3" /> Sin confirmar
    </span>
  );
}

/** true si este dispositivo tiene el código de gestión de la publicación (es la familia) */
export function useIsOwner(reportId?: string | null): boolean {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    // Se lee después de montar: localStorage no existe en el servidor
    Promise.resolve().then(() => {
      if (!cancelled) setIsOwner(!!getEditToken(reportId));
    });
    return () => {
      cancelled = true;
    };
  }, [reportId]);
  return isOwner;
}

/**
 * Botones para que la familia confirme o descarte un avistamiento.
 * Solo se muestran en el dispositivo que tiene el código de gestión de la mascota perdida.
 */
export function SightingOwnerActions({
  sightingId,
  lostReportId,
  status,
  onChange,
}: {
  sightingId: string;
  lostReportId: string;
  status?: string | null;
  onChange?: (status: string) => void;
}) {
  const isOwner = useIsOwner(lostReportId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  const act = async (decision: 'confirm' | 'dismiss' | 'pending') => {
    setBusy(decision);
    setError(null);
    const res = await reviewSightingAsOwner(sightingId, lostReportId, decision);
    setBusy(null);
    if (res.ok && res.status) onChange?.(res.status);
    else setError(res.error || 'No se pudo actualizar.');
  };

  const btn = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-60';

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-zinc-500">Sos la familia:</span>
      {status !== 'VERIFIED' && (
        <button type="button" disabled={!!busy} onClick={() => act('confirm')} className={cn(btn, 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700')}>
          {busy === 'confirm' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Es mi mascota
        </button>
      )}
      {status !== 'DISMISSED' && (
        <button type="button" disabled={!!busy} onClick={() => act('dismiss')} className={cn(btn, 'border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40')}>
          {busy === 'dismiss' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} No es / descartar
        </button>
      )}
      {status && status !== 'PENDING' && (
        <button type="button" disabled={!!busy} onClick={() => act('pending')} className={cn(btn, 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300')}>
          Deshacer
        </button>
      )}
      {error && <span className="text-rose-600 font-semibold">{error}</span>}
    </div>
  );
}
