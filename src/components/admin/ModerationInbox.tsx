'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

interface ModerationItem {
  id: string;
  reported_entity_type: 'lost_report' | 'found_report' | 'sighting' | string;
  reported_entity_id: string;
  reason: string;
  details: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  scam: 'Pide dinero / posible estafa',
  false_information: 'Información falsa',
  spam: 'Spam o publicidad',
  inappropriate_content: 'Contenido inapropiado',
  duplicate: 'Duplicada',
  other: 'Otro motivo',
};

const ENTITY: Record<string, { label: string; url: (id: string) => string }> = {
  lost_report: { label: 'Mascota perdida', url: (id) => `/mascotas-perdidas/${id}` },
  found_report: { label: 'Mascota encontrada', url: (id) => `/mascotas-encontradas/${id}` },
  sighting: { label: 'Avistamiento', url: (id) => `/mascota-avistada/${id}` },
};

/** Bandeja real de denuncias (reemplaza el ejemplo fijo que tenía el panel) */
export function ModerationInbox({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/moderation', { headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setItems(data.reports || []);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    }
  }, [adminKey]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (item: ModerationItem, action: 'dismiss' | 'hide') => {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id: item.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = (items || []).filter((i) => !i.resolved);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          Denuncias Pendientes
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
          {items === null ? '…' : pending.length} pendientes
        </span>
      </div>

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

      {items === null ? (
        <div className="p-6 flex justify-center text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : pending.length === 0 ? (
        <div className="p-6 text-center text-xs text-zinc-400">✅ No hay denuncias pendientes de revisión.</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pending.map((item) => {
            const entity = ENTITY[item.reported_entity_type];
            const busy = busyId === item.id;
            return (
              <div key={item.id} className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-rose-800 dark:text-rose-300">{REASON_LABEL[item.reason] || item.reason}</span>
                  <span className="text-[10px] text-zinc-500">{formatTimeAgo(item.created_at)}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {entity?.label || item.reported_entity_type}
                  {entity && (
                    <a href={entity.url(item.reported_entity_id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 ml-1.5 font-bold text-blue-600 hover:underline">
                      ver <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </p>
                {item.details && <p className="text-zinc-700 dark:text-zinc-300 italic">“{item.details}”</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(item, 'hide')}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold rounded-lg text-[10px] transition-colors"
                  >
                    Ocultar publicación
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(item, 'dismiss')}
                    className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg text-[10px] transition-colors"
                  >
                    Desestimar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
