import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { PartnerBusiness, PartnerBusinessAdmin, PartnerCategory } from '@/types/partners';
import type { PartnerInput } from '@/lib/validations/partner.schema';

/**
 * COMERCIOS AMIGOS
 * Lectura pública: función RPC get_partner_businesses (solo activos, vigentes y columnas públicas).
 * Administración: rutas /api/admin/partners protegidas con la clave ADMIN_API_KEY.
 */

export async function getPartnerBusinesses(opts: {
  region: string;
  category?: PartnerCategory | null;
  lat?: number | null;
  lng?: number | null;
  maxKm?: number | null;
  limit?: number;
}): Promise<PartnerBusiness[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.rpc('get_partner_businesses', {
    p_region: opts.region,
    p_category: opts.category ?? null,
    p_lat: opts.lat ?? null,
    p_lng: opts.lng ?? null,
    p_max_km: opts.maxKm ?? null,
    p_limit: opts.limit ?? 100,
  });
  if (error) {
    console.warn('No se pudieron cargar los comercios amigos:', error.message);
    return [];
  }
  return (data || []) as PartnerBusiness[];
}

// ---------------------------------------------------------------- Admin

async function adminFetch<T>(adminKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey, ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issues = Array.isArray(json.issues)
      ? ' ' + json.issues.map((i: { path?: unknown[]; message: string }) => `${(i.path || []).join('.')}: ${i.message}`).join(' · ')
      : '';
    const err = new Error((json.error || `Error ${res.status}`) + issues) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json as T;
}

export function adminListPartners(adminKey: string) {
  return adminFetch<{ partners: PartnerBusinessAdmin[] }>(adminKey, '/api/admin/partners').then((r) => r.partners);
}

export function adminCreatePartner(adminKey: string, input: PartnerInput) {
  return adminFetch<{ partner: PartnerBusinessAdmin }>(adminKey, '/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.partner);
}

export function adminUpdatePartner(adminKey: string, id: string, input: PartnerInput) {
  return adminFetch<{ partner: PartnerBusinessAdmin }>(adminKey, `/api/admin/partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((r) => r.partner);
}

export function adminPatchPartner(
  adminKey: string,
  id: string,
  patch: Partial<Pick<PartnerBusinessAdmin, 'active' | 'plan' | 'valid_until'>>
) {
  return adminFetch<{ partner: PartnerBusinessAdmin }>(adminKey, `/api/admin/partners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((r) => r.partner);
}

export function adminDeletePartner(adminKey: string, id: string) {
  return adminFetch<{ success: boolean }>(adminKey, `/api/admin/partners/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------- Helpers de presentación

export function onlyDigits(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

/** Link de WhatsApp con 549 adelante si hace falta (mismo criterio que el resto de la app) */
export function partnerWhatsappUrl(p: Pick<PartnerBusiness, 'whatsapp' | 'name'>, text?: string) {
  let digits = onlyDigits(p.whatsapp);
  if (!digits) return null;
  if (digits.length === 10) digits = `549${digits}`;
  else if (digits.startsWith('54') && !digits.startsWith('549')) digits = `549${digits.slice(2)}`;
  const msg = text ?? `Hola ${p.name}! Los encontré en la red de Mascotas Perdidas.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function partnerInstagramUrl(handle?: string | null) {
  if (!handle) return null;
  if (/^https?:\/\//i.test(handle)) return handle;
  return `https://instagram.com/${handle.replace(/^@/, '')}`;
}

export function partnerMapsUrl(p: Pick<PartnerBusiness, 'latitude' | 'longitude'>) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
}
