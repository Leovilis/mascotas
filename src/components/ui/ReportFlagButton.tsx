'use client';

import React, { useRef, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { flagPublication, FlagReason } from '@/services/reports.service';
import { TurnstileWidget, TurnstileHandle, TURNSTILE_ENABLED } from '@/components/forms/TurnstileWidget';

const REASONS: { value: FlagReason; label: string }[] = [
  { value: 'scam', label: 'Pide dinero / posible estafa' },
  { value: 'false_information', label: 'Información falsa' },
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'inappropriate_content', label: 'Contenido inapropiado' },
  { value: 'duplicate', label: 'Publicación duplicada' },
  { value: 'other', label: 'Otro motivo' },
];

/** Botón "Denunciar" con formulario corto. La denuncia llega al panel de moderación. */
export function ReportFlagButton({
  entityType,
  entityId,
}: {
  entityType: 'lost_report' | 'found_report' | 'sighting';
  entityId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason>('scam');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  if (result?.ok) {
    return <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ {result.text}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-rose-600 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> Denunciar esta publicación
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setResult({ ok: false, text: 'Esperá a que termine la verificación de seguridad.' });
      return;
    }
    setSending(true);
    const res = await flagPublication({ entityType, entityId, reason, details, turnstileToken });
    setSending(false);
    if (!res.ok) turnstileRef.current?.reset();
    setResult(
      res.ok
        ? { ok: true, text: 'Gracias. Un moderador va a revisar la publicación.' }
        : { ok: false, text: res.error || 'No se pudo enviar la denuncia.' }
    );
  };

  return (
    <form onSubmit={submit} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 text-xs">
      <p className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
        <Flag className="w-4 h-4 text-rose-500" /> Denunciar publicación
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as FlagReason)}
        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-semibold"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Contanos qué pasó (opcional)"
        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      />
      <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />
      {result && !result.ok && <p className="text-rose-600 font-semibold">{result.text}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold"
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Enviar denuncia
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold">
          Cancelar
        </button>
      </div>
    </form>
  );
}
