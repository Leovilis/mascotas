'use client';

import React, { useRef, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { isValidEmail } from '@/lib/validations/contact';
import { requestCodeRecovery } from '@/services/reports.service';
import { TurnstileWidget, TurnstileHandle, TURNSTILE_ENABLED } from '@/components/forms/TurnstileWidget';

/** "¿Perdiste tu código?": envía códigos nuevos al email que se dejó al publicar */
export function RecoverCodeForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">
        ¿Perdiste tu código? Recuperalo con tu email
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!isValidEmail(v)) {
      setMsg({ ok: false, text: 'El email no tiene un formato válido (ej: nombre@gmail.com).' });
      return;
    }
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setMsg({ ok: false, text: 'Esperá a que termine la verificación de seguridad.' });
      return;
    }
    setSending(true);
    const res = await requestCodeRecovery(v, turnstileToken);
    setSending(false);
    turnstileRef.current?.reset();
    setMsg({ ok: res.ok, text: res.message });
  };

  return (
    <form onSubmit={submit} className="space-y-2 pt-2 border-t border-orange-200/70 dark:border-zinc-700">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Si dejaste tu email al publicar, te mandamos un <strong>código nuevo</strong> (el anterior deja de funcionar).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
          placeholder="tu@email.com"
          className="flex-1 px-4 py-3 rounded-2xl border border-orange-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Enviarme el código
        </button>
      </div>
      <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />
      {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>{msg.text}</p>}
    </form>
  );
}
