'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, PauseCircle, XCircle } from 'lucide-react';
import { readAdminKey, verifyAdminKey, writeAdminKey } from '@/lib/admin-key-storage';
import { getRegion } from '@/config/regions';
import { ASSOCIATION_STATUS_LABEL, AdopterProfile, Association, AssociationStatus } from '@/lib/adoption/types';
import { cn } from '@/lib/utils';

type Row = Association & { responsible: AdopterProfile | null; animals: { total: number; adopted: number } };

const TABS: { value: AssociationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'SUSPENDED', label: 'Suspendidas' },
  { value: 'ALL', label: 'Todas' },
];

export default function AdminAsociacionesPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<AssociationStatus | 'ALL'>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (k: string) => {
    const res = await fetch('/api/admin/associations', { headers: { 'x-admin-key': k } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'No se pudo cargar');
      if (res.status === 401) {
        writeAdminKey(null);
        setAuthed(false);
      }
      return;
    }
    setRows(data.associations);
  }, []);

  useEffect(() => {
    const stored = readAdminKey();
    if (!stored) return;
    verifyAdminKey(stored).then((r) => {
      if (r.ok) {
        setKey(stored);
        setAuthed(true);
        load(stored);
      }
    });
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await verifyAdminKey(keyInput.trim());
    if (!r.ok) return setError(r.error || 'Clave inválida');
    writeAdminKey(keyInput.trim());
    setKey(keyInput.trim());
    setAuthed(true);
    setError(null);
    load(keyInput.trim());
  };

  const setStatus = async (row: Row, status: AssociationStatus) => {
    let notes: string | null = row.admin_notes;
    if (status === 'REJECTED' || status === 'SUSPENDED') {
      notes = window.prompt('Motivo (se le envía por mail a la asociación):', row.admin_notes || '') ?? null;
      if (notes === null) return;
    }
    setBusy(row.id);
    const res = await fetch('/api/admin/associations', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ id: row.id, status, admin_notes: notes }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo actualizar');
      return;
    }
    load(key);
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <form onSubmit={login} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <p className="font-black flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-500" /> Clave de administrador
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
          />
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          <button className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-bold">Entrar</button>
        </form>
      </div>
    );
  }

  const visible = (rows || []).filter((r) => tab === 'ALL' || r.status === tab);
  const countOf = (s: AssociationStatus) => (rows || []).filter((r) => r.status === s).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500">
        <ArrowLeft className="w-4 h-4" /> Panel admin
      </Link>
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Asociaciones de adopción</h1>
      <p className="text-sm text-zinc-500">
        Antes de aprobar, verificá que exista (redes, teléfono, referencias). Solo las aprobadas se muestran al público.
      </p>
      {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold border',
              tab === t.value ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'border-zinc-300 dark:border-zinc-700'
            )}
          >
            {t.label}
            {t.value !== 'ALL' && ` (${countOf(t.value)})`}
          </button>
        ))}
      </div>
      {!rows ? (
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      ) : visible.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay asociaciones en esta lista.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-lg text-zinc-900 dark:text-white">{r.name}</p>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">{ASSOCIATION_STATUS_LABEL[r.status]}</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {r.city}, {getRegion(r.region_slug).provinceName} · {r.email}
                {r.whatsapp && ` · WA ${r.whatsapp}`}
                {r.phone && ` · Tel ${r.phone}`}
                {r.instagram && (
                  <>
                    {' · '}
                    <a href={`https://instagram.com/${r.instagram}`} target="_blank" rel="noreferrer" className="underline">
                      @{r.instagram}
                    </a>
                  </>
                )}
              </p>
              {r.description && <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{r.description}</p>}
              <p className="text-xs text-zinc-500">
                Responsable:{' '}
                {r.responsible
                  ? `${r.responsible.first_name} ${r.responsible.last_name} · DNI ${r.responsible.dni} · ${r.responsible.phone} · ${r.responsible.email}`
                  : 'sin ficha'}
                {' · '}Alta: {new Date(r.created_at).toLocaleDateString('es-AR')} · Animales: {r.animals.total} ({r.animals.adopted} adoptados)
              </p>
              {r.admin_notes && <p className="text-xs text-amber-700">Nota: {r.admin_notes}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {r.status !== 'APPROVED' && (
                  <button onClick={() => setStatus(r, 'APPROVED')} disabled={busy === r.id} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Aprobar
                  </button>
                )}
                {r.status === 'PENDING' && (
                  <button onClick={() => setStatus(r, 'REJECTED')} disabled={busy === r.id} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 text-xs font-bold">
                    <XCircle className="w-4 h-4" /> Rechazar
                  </button>
                )}
                {r.status === 'APPROVED' && (
                  <button onClick={() => setStatus(r, 'SUSPENDED')} disabled={busy === r.id} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-bold">
                    <PauseCircle className="w-4 h-4" /> Suspender
                  </button>
                )}
                {r.status === 'APPROVED' && (
                  <Link href={`/adopcion/asociaciones/${r.slug}`} target="_blank" className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold">
                    Ver página
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
