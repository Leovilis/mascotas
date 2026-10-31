'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  CalendarPlus,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { REGION_LIST, getRegion, isRegionSlug } from '@/config/regions';
import { regionForPoint } from '@/config/region-geo';
import { useRegion } from '@/components/region/RegionProvider';
import { PARTNER_CATEGORIES, PartnerBusinessAdmin, PartnerCategory, getPartnerCategory } from '@/types/partners';
import type { PartnerInput } from '@/lib/validations/partner.schema';
import {
  adminCreatePartner,
  adminDeletePartner,
  adminListPartners,
  adminPatchPartner,
  adminUpdatePartner,
} from '@/services/partners.service';
import { uploadPetPhoto } from '@/services/reports.service';
import { cn } from '@/lib/utils';
import { sanitizePhoneInput } from '@/lib/validations/contact';

const LocationPicker = dynamic(() => import('@/components/map/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />,
});

const KEY_STORAGE = 'mascotas_admin_api_key';

function readKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}
function writeKey(value: string | null) {
  try {
    if (value) sessionStorage.setItem(KEY_STORAGE, value);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {}
}

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().slice(0, 10);
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

type Status = { label: string; tone: 'green' | 'amber' | 'red' | 'zinc' };
function statusOf(p: PartnerBusinessAdmin): Status {
  if (!p.active) return { label: 'Inactivo', tone: 'zinc' };
  const days = daysUntil(p.valid_until);
  if (days === null) return { label: 'Activo (sin vencimiento)', tone: 'green' };
  if (days < 0) return { label: `Vencido hace ${-days} d`, tone: 'red' };
  if (days <= 7) return { label: `Vence en ${days} d`, tone: 'amber' };
  return { label: `Activo hasta ${p.valid_until}`, tone: 'green' };
}

const TONES: Record<Status['tone'], string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

type FormState = Omit<PartnerInput, 'latitude' | 'longitude'> & { latitude: number; longitude: number };

function emptyForm(regionSlug: string, lat: number, lng: number): FormState {
  return {
    region_slug: regionSlug,
    name: '',
    category: 'veterinaria',
    description: '',
    address: '',
    city: '',
    latitude: lat,
    longitude: lng,
    phone: '',
    whatsapp: '',
    website: '',
    instagram: '',
    logo_url: '',
    is_24h: false,
    plan: 'basico',
    active: true,
    valid_until: addMonths(todayIso(), 1),
    owner_contact: '',
    internal_notes: '',
  };
}

function formFromPartner(p: PartnerBusinessAdmin): FormState {
  return {
    region_slug: p.region_slug,
    name: p.name,
    category: p.category,
    description: p.description ?? '',
    address: p.address,
    city: p.city ?? '',
    latitude: p.latitude,
    longitude: p.longitude,
    phone: p.phone ?? '',
    whatsapp: p.whatsapp ?? '',
    website: p.website ?? '',
    instagram: p.instagram ?? '',
    logo_url: p.logo_url ?? '',
    is_24h: p.is_24h,
    plan: p.plan,
    active: p.active,
    valid_until: p.valid_until ?? '',
    owner_contact: p.owner_contact ?? '',
    internal_notes: p.internal_notes ?? '',
  };
}

const input =
  'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400';
const labelCls = 'block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1';

export default function AdminComerciosPage() {
  const { region: viewerRegion } = useRegion();
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerBusinessAdmin[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const list = await adminListPartners(key);
      setPartners(list);
      setAdminKey(key);
      writeKey(key);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 401 || e.status === 503) {
        setAdminKey('');
        writeKey(null);
        setAuthError(e.message);
      } else {
        setFeedback({ type: 'error', text: e.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = readKey();
    if (!saved) return;
    const t = setTimeout(() => load(saved), 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (partners || []).filter(
      (p) =>
        (regionFilter === 'all' || p.region_slug === regionFilter) &&
        (!q || `${p.name} ${p.address} ${p.city ?? ''} ${p.owner_contact ?? ''}`.toLowerCase().includes(q))
    );
  }, [partners, regionFilter, search]);

  const summary = useMemo(() => {
    const list = filtered;
    let activos = 0, destacados = 0, porVencer = 0, vencidos = 0;
    list.forEach((p) => {
      const s = statusOf(p);
      if (p.active && s.tone !== 'red') activos++;
      if (p.active && p.plan === 'destacado' && s.tone !== 'red') destacados++;
      if (s.tone === 'amber') porVencer++;
      if (s.tone === 'red') vencidos++;
    });
    return { total: list.length, activos, destacados, porVencer, vencidos };
  }, [filtered]);

  const openNew = () => {
    const r = regionFilter !== 'all' && isRegionSlug(regionFilter) ? getRegion(regionFilter) : viewerRegion;
    setEditingId(null);
    setForm(emptyForm(r.slug, r.center.lat, r.center.lng));
    setFeedback(null);
  };

  const openEdit = (p: PartnerBusinessAdmin) => {
    setEditingId(p.id);
    setForm(formFromPartner(p));
    setFeedback(null);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload: PartnerInput = { ...form, valid_until: form.valid_until || null };
      const saved = editingId
        ? await adminUpdatePartner(adminKey, editingId, payload)
        : await adminCreatePartner(adminKey, payload);
      setPartners((list) => {
        const rest = (list || []).filter((p) => p.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.region_slug.localeCompare(b.region_slug) || a.name.localeCompare(b.name));
      });
      setForm(null);
      setEditingId(null);
      setFeedback({ type: 'success', text: `"${saved.name}" guardado correctamente.` });
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const patch = async (p: PartnerBusinessAdmin, changes: Partial<Pick<PartnerBusinessAdmin, 'active' | 'plan' | 'valid_until'>>) => {
    setBusyId(p.id);
    try {
      const saved = await adminPatchPartner(adminKey, p.id, changes);
      setPartners((list) => (list || []).map((x) => (x.id === saved.id ? saved : x)));
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const extendOneMonth = (p: PartnerBusinessAdmin) => {
    const base = p.valid_until && p.valid_until > todayIso() ? p.valid_until : todayIso();
    patch(p, { valid_until: addMonths(base, 1), active: true });
  };

  const handleDelete = async (p: PartnerBusinessAdmin) => {
    setBusyId(p.id);
    try {
      await adminDeletePartner(adminKey, p.id);
      setPartners((list) => (list || []).filter((x) => x.id !== p.id));
      setFeedback({ type: 'success', text: `"${p.name}" eliminado.` });
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleLogo = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPetPhoto(file);
      update('logo_url', url);
    } catch (err) {
      setFeedback({ type: 'error', text: `No se pudo subir el logo: ${(err as Error).message}` });
    } finally {
      setUploading(false);
    }
  };

  // ------------------------------------------------------------------ Login con clave
  if (!adminKey) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (keyInput.trim()) load(keyInput.trim());
          }}
          className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-500" />
            <h1 className="text-lg font-black text-zinc-900 dark:text-white">Comercios Amigos — Administración</h1>
          </div>
          <p className="text-xs text-zinc-500">
            Ingresá la clave de administrador (variable <code>ADMIN_API_KEY</code> del servidor). Se guarda solo en esta pestaña.
          </p>
          <input
            type="password"
            autoComplete="current-password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Clave de administrador"
            className={input}
          />
          {authError && <p className="text-xs font-semibold text-red-600">{authError}</p>}
          <button
            type="submit"
            disabled={loading || !keyInput.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Ingresar
          </button>
          <Link href="/admin" className="block text-center text-xs font-bold text-zinc-500 hover:underline">
            Volver al panel de moderación
          </Link>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------------ Panel
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Panel de moderación
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2 mt-1">
            <Store className="w-6 h-6 text-orange-500" /> Comercios Amigos
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              writeKey(null);
              setAdminKey('');
              setPartners(null);
            }}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
          >
            Salir
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Nuevo comercio
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'p-3 rounded-xl text-sm font-semibold flex justify-between gap-2',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
          )}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ['Total', summary.total],
          ['Activos', summary.activos],
          ['Destacados', summary.destacados],
          ['Vencen en 7 días', summary.porVencer],
          ['Vencidos', summary.vencidos],
        ].map(([label, value]) => (
          <div key={label} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <p className="text-[11px] font-bold uppercase text-zinc-500">{label}</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={cn(input, 'sm:w-64')}>
          <option value="all">Todas las provincias</option>
          {REGION_LIST.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.provinceName}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, dirección o contacto"
            className={cn(input, 'pl-9')}
          />
        </div>
      </div>

      {/* Listado */}
      {loading && !partners ? (
        <div className="py-16 flex justify-center text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-zinc-500 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
          No hay comercios cargados{regionFilter !== 'all' ? ' en esta provincia' : ''}.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const s = statusOf(p);
            const cat = getPartnerCategory(p.category);
            const busy = busyId === p.id;
            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-white">{p.name}</span>
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase', TONES[s.tone])}>{s.label}</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-black uppercase',
                        p.plan === 'destacado'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      )}
                    >
                      {p.plan}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {cat.emoji} {cat.singular} · {getRegion(p.region_slug).provinceName} · {p.address}
                    {p.city ? `, ${p.city}` : ''}
                  </p>
                  {(p.owner_contact || p.internal_notes) && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {p.owner_contact && <>Contacto: {p.owner_contact}. </>}
                      {p.internal_notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" disabled={busy} onClick={() => openEdit(p)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button type="button" disabled={busy} onClick={() => extendOneMonth(p)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold" title="Registrar un mes más de abono">
                    <CalendarPlus className="w-3.5 h-3.5" /> +1 mes
                  </button>
                  <button type="button" disabled={busy} onClick={() => patch(p, { plan: p.plan === 'destacado' ? 'basico' : 'destacado' })} className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                    {p.plan === 'destacado' ? 'Pasar a básico' : 'Destacar'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => patch(p, { active: !p.active })} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                    <Power className="w-3.5 h-3.5" /> {p.active ? 'Desactivar' : 'Activar'}
                  </button>
                  {confirmDeleteId === p.id ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => handleDelete(p)} className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">
                        {busy ? 'Eliminando…' : 'Confirmar'}
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => setConfirmDeleteId(p.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 text-xs font-bold">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario alta / edición */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
          <form onSubmit={handleSave} className="w-full max-w-3xl my-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">{editingId ? 'Editar comercio' : 'Nuevo comercio'}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Cerrar">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={input} />
              </div>
              <div>
                <label className={labelCls}>Categoría *</label>
                <select value={form.category} onChange={(e) => update('category', e.target.value as PartnerCategory)} className={input}>
                  {PARTNER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.singular}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Descripción (pública)</label>
                <textarea rows={2} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} className={input} placeholder="Ej: Lectura de microchip gratis para mascotas encontradas." />
              </div>
            </div>

            <div className="space-y-3">
              <LocationPicker
                initialLat={form.latitude}
                initialLng={form.longitude}
                label="Ubicación del local"
                helperText="Marcá el local en el mapa. La provincia se completa sola según el punto."
                onLocationChange={(lat, lng, street, houseNumber) => {
                  const r = regionForPoint(lat, lng, getRegion(form.region_slug));
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          latitude: lat,
                          longitude: lng,
                          region_slug: r.slug,
                          address: street ? `${street}${houseNumber ? ` ${houseNumber}` : ''}` : f.address,
                        }
                      : f
                  );
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Dirección *</label>
                  <input required value={form.address} onChange={(e) => update('address', e.target.value)} className={input} />
                </div>
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} className={input} />
                </div>
                <div>
                  <label className={labelCls}>Provincia *</label>
                  <select value={form.region_slug} onChange={(e) => update('region_slug', e.target.value)} className={input}>
                    {REGION_LIST.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.provinceName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input inputMode="tel" value={form.whatsapp ?? ''} onChange={(e) => update('whatsapp', sanitizePhoneInput(e.target.value))} className={input} placeholder={getRegion(form.region_slug).phoneExampleCompact} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input inputMode="tel" value={form.phone ?? ''} onChange={(e) => update('phone', sanitizePhoneInput(e.target.value))} className={input} />
              </div>
              <div>
                <label className={labelCls}>Instagram</label>
                <input value={form.instagram ?? ''} onChange={(e) => update('instagram', e.target.value)} className={input} placeholder="@veterinaria" />
              </div>
              <div>
                <label className={labelCls}>Sitio web</label>
                <input value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} className={input} placeholder="https://" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Logo</label>
                <div className="flex gap-2 items-center">
                  {form.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
                  )}
                  <input value={form.logo_url ?? ''} onChange={(e) => update('logo_url', e.target.value)} className={input} placeholder="https://… o subí una imagen" />
                  <label className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold cursor-pointer shrink-0">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Subir
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" checked={!!form.is_24h} onChange={(e) => update('is_24h', e.target.checked)} /> Atiende 24 hs / urgencias
              </label>
            </div>

            <fieldset className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-4">
              <legend className="px-1 text-xs font-black uppercase text-zinc-500">Abono (interno)</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Plan</label>
                  <select value={form.plan} onChange={(e) => update('plan', e.target.value as 'basico' | 'destacado')} className={input}>
                    <option value="basico">Básico</option>
                    <option value="destacado">Destacado</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Pago hasta</label>
                  <input type="date" value={form.valid_until ?? ''} onChange={(e) => update('valid_until', e.target.value)} className={input} />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 sm:mt-6">
                  <input type="checkbox" checked={!!form.active} onChange={(e) => update('active', e.target.checked)} /> Activo
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Contacto del dueño</label>
                  <input value={form.owner_contact ?? ''} onChange={(e) => update('owner_contact', e.target.value)} className={input} placeholder="Nombre, teléfono o email" />
                </div>
                <div>
                  <label className={labelCls}>Notas internas</label>
                  <input value={form.internal_notes ?? ''} onChange={(e) => update('internal_notes', e.target.value)} className={input} placeholder="Ej: paga por transferencia el día 5" />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">Si dejás &quot;Pago hasta&quot; vacío, el comercio no vence nunca.</p>
            </fieldset>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
