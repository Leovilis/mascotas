/**
 * Acceso a datos de ADOPCIÓN (solo servidor).
 * Las tablas no tienen acceso público: se leen con la service role y cada función
 * filtra lo que corresponde (ej: solo asociaciones aprobadas para el público).
 */
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import type {
  AdopterProfile,
  AdoptionAnimal,
  AdoptionRecord,
  AdoptionRequest,
  Association,
  Followup,
  Vaccine,
} from './types';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function db() {
  return createAdminClient();
}

export interface SessionUser {
  id: string;
  email: string;
}

/** Usuario logueado (Supabase Auth) o null */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;
    return { id: data.user.id, email: data.user.email || '' };
  } catch {
    return null;
  }
}

export async function requireSessionUser(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/cuenta/ingresar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function getAdopterProfile(userId: string): Promise<AdopterProfile | null> {
  const { data } = await db().from('adopter_profiles').select('*').eq('user_id', userId).maybeSingle();
  return (data as AdopterProfile) || null;
}

export async function getAssociationByOwner(userId: string): Promise<Association | null> {
  const { data } = await db().from('adoption_associations').select('*').eq('owner_id', userId).maybeSingle();
  return (data as Association) || null;
}

/** Asociación del usuario logueado (cualquier estado). Si no tiene, lo manda a registrarla. */
export async function requireMyAssociation(next = '/asociacion'): Promise<{ user: SessionUser; association: Association }> {
  const user = await requireSessionUser(next);
  const association = await getAssociationByOwner(user.id);
  if (!association) redirect('/adopcion/sumar-asociacion');
  return { user, association };
}

/** Animal que pertenece a la asociación (o redirige al panel) */
export async function requireOwnAnimal(animalId: string): Promise<{ association: Association; animal: AdoptionAnimal }> {
  const { association } = await requireMyAssociation();
  if (!UUID_RE.test(animalId)) redirect('/asociacion');
  const { data } = await db()
    .from('adoption_animals')
    .select('*')
    .eq('id', animalId)
    .eq('association_id', association.id)
    .maybeSingle();
  if (!data) redirect('/asociacion');
  return { association, animal: data as AdoptionAnimal };
}

// ---------------------------------------------------------------------------
// Consultas públicas
// ---------------------------------------------------------------------------

export async function listApprovedAssociations(region: string): Promise<(Association & { available: number })[]> {
  const supabase = db();
  const { data: assocs } = await supabase
    .from('adoption_associations')
    .select('*')
    .eq('region_slug', region)
    .eq('status', 'APPROVED')
    .order('name');
  const list = (assocs as Association[]) || [];
  if (list.length === 0) return [];
  const { data: animals } = await supabase
    .from('adoption_animals')
    .select('association_id')
    .in('association_id', list.map((a) => a.id))
    .eq('status', 'AVAILABLE');
  const counts = new Map<string, number>();
  (animals || []).forEach((a: { association_id: string }) => counts.set(a.association_id, (counts.get(a.association_id) || 0) + 1));
  return list.map((a) => ({ ...a, available: counts.get(a.id) || 0 }));
}

export type PublicAnimal = AdoptionAnimal & { association: Pick<Association, 'id' | 'name' | 'slug' | 'city'> };

export async function listPublicAnimals(opts: {
  region?: string;
  associationId?: string;
  species?: string | null;
  includeReserved?: boolean;
  limit?: number;
}): Promise<PublicAnimal[]> {
  const supabase = db();
  let assocQuery = supabase.from('adoption_associations').select('id, name, slug, city').eq('status', 'APPROVED');
  if (opts.region) assocQuery = assocQuery.eq('region_slug', opts.region);
  if (opts.associationId) assocQuery = assocQuery.eq('id', opts.associationId);
  const { data: assocs } = await assocQuery;
  const byId = new Map((assocs || []).map((a: PublicAnimal['association']) => [a.id, a]));
  if (byId.size === 0) return [];

  let q = supabase
    .from('adoption_animals')
    .select('*')
    .in('association_id', [...byId.keys()])
    .in('status', opts.includeReserved === false ? ['AVAILABLE'] : ['AVAILABLE', 'RESERVED'])
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 120);
  if (opts.species === 'dog' || opts.species === 'cat' || opts.species === 'other') q = q.eq('species', opts.species);
  const { data } = await q;
  return ((data as AdoptionAnimal[]) || []).map((a) => ({ ...a, association: byId.get(a.association_id)! }));
}

export async function getPublicAssociationBySlug(slug: string): Promise<Association | null> {
  const { data } = await db().from('adoption_associations').select('*').eq('slug', slug).eq('status', 'APPROVED').maybeSingle();
  return (data as Association) || null;
}

/** Ficha pública de un animal (solo si la asociación está aprobada) */
export async function getPublicAnimal(id: string): Promise<{ animal: AdoptionAnimal; association: Association; vaccines: Vaccine[] } | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = db();
  const { data: animal } = await supabase.from('adoption_animals').select('*').eq('id', id).maybeSingle();
  if (!animal) return null;
  const { data: association } = await supabase
    .from('adoption_associations')
    .select('*')
    .eq('id', (animal as AdoptionAnimal).association_id)
    .eq('status', 'APPROVED')
    .maybeSingle();
  if (!association) return null;
  const { data: vaccines } = await supabase.from('adoption_vaccines').select('*').eq('animal_id', id).order('applied_on', { ascending: false });
  return { animal: animal as AdoptionAnimal, association: association as Association, vaccines: (vaccines as Vaccine[]) || [] };
}

// ---------------------------------------------------------------------------
// Panel de la asociación
// ---------------------------------------------------------------------------

export async function listAssociationAnimals(associationId: string): Promise<(AdoptionAnimal & { pending_requests: number })[]> {
  const supabase = db();
  const { data } = await supabase
    .from('adoption_animals')
    .select('*')
    .eq('association_id', associationId)
    .order('created_at', { ascending: false });
  const animals = (data as AdoptionAnimal[]) || [];
  if (animals.length === 0) return [];
  const { data: reqs } = await supabase
    .from('adoption_requests')
    .select('animal_id')
    .in('animal_id', animals.map((a) => a.id))
    .eq('status', 'PENDING');
  const counts = new Map<string, number>();
  (reqs || []).forEach((r: { animal_id: string }) => counts.set(r.animal_id, (counts.get(r.animal_id) || 0) + 1));
  return animals.map((a) => ({ ...a, pending_requests: counts.get(a.id) || 0 }));
}

export type RequestWithAdopter = AdoptionRequest & { adopter: AdopterProfile | null; animal?: Pick<AdoptionAnimal, 'id' | 'name' | 'photos' | 'status'> };

export async function getAnimalPanelData(animalId: string) {
  const supabase = db();
  const [vaccines, followups, requests, adoption] = await Promise.all([
    supabase.from('adoption_vaccines').select('*').eq('animal_id', animalId).order('applied_on', { ascending: false }),
    supabase.from('adoption_followups').select('*').eq('animal_id', animalId).order('date', { ascending: false }),
    supabase.from('adoption_requests').select('*').eq('animal_id', animalId).order('created_at', { ascending: true }),
    supabase.from('adoptions').select('*').eq('animal_id', animalId).maybeSingle(),
  ]);
  const reqs = (requests.data as AdoptionRequest[]) || [];
  const userIds = [...new Set([...reqs.map((r) => r.user_id), ...(adoption.data ? [(adoption.data as AdoptionRecord).adopter_id] : [])])];
  const profiles = await getProfilesByIds(userIds);
  return {
    vaccines: (vaccines.data as Vaccine[]) || [],
    followups: (followups.data as Followup[]) || [],
    requests: reqs.map((r) => ({ ...r, adopter: profiles.get(r.user_id) || null })) as RequestWithAdopter[],
    adoption: (adoption.data as AdoptionRecord) || null,
    adopter: adoption.data ? profiles.get((adoption.data as AdoptionRecord).adopter_id) || null : null,
  };
}

export async function getProfilesByIds(ids: string[]): Promise<Map<string, AdopterProfile>> {
  if (ids.length === 0) return new Map();
  const { data } = await db().from('adopter_profiles').select('*').in('user_id', ids);
  return new Map(((data as AdopterProfile[]) || []).map((p) => [p.user_id, p]));
}

export async function listAssociationRequests(associationId: string): Promise<RequestWithAdopter[]> {
  const supabase = db();
  const { data: animals } = await supabase.from('adoption_animals').select('id, name, photos, status').eq('association_id', associationId);
  const byId = new Map(((animals as RequestWithAdopter['animal'][]) || []).map((a) => [a!.id, a]));
  if (byId.size === 0) return [];
  const { data } = await supabase
    .from('adoption_requests')
    .select('*')
    .in('animal_id', [...byId.keys()])
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });
  const reqs = (data as AdoptionRequest[]) || [];
  const profiles = await getProfilesByIds([...new Set(reqs.map((r) => r.user_id))]);
  return reqs.map((r) => ({ ...r, adopter: profiles.get(r.user_id) || null, animal: byId.get(r.animal_id) }));
}

export async function listAssociationAdoptions(associationId: string) {
  const supabase = db();
  const { data: animals } = await supabase.from('adoption_animals').select('id, name, photos, species').eq('association_id', associationId).eq('status', 'ADOPTED');
  const list = (animals as Pick<AdoptionAnimal, 'id' | 'name' | 'photos' | 'species'>[]) || [];
  if (list.length === 0) return [];
  const { data: adoptions } = await supabase.from('adoptions').select('*').in('animal_id', list.map((a) => a.id)).order('adopted_on', { ascending: false });
  const recs = (adoptions as AdoptionRecord[]) || [];
  const profiles = await getProfilesByIds(recs.map((r) => r.adopter_id));
  const animalById = new Map(list.map((a) => [a.id, a]));
  return recs.map((r) => ({ ...r, animal: animalById.get(r.animal_id)!, adopter: profiles.get(r.adopter_id) || null }));
}

// ---------------------------------------------------------------------------
// Adoptante
// ---------------------------------------------------------------------------

export async function listMyRequests(userId: string) {
  const supabase = db();
  const { data } = await supabase.from('adoption_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const reqs = (data as AdoptionRequest[]) || [];
  if (reqs.length === 0) return [];
  const { data: animals } = await supabase.from('adoption_animals').select('id, name, photos, status, association_id').in('id', reqs.map((r) => r.animal_id));
  const animalById = new Map(((animals as AdoptionAnimal[]) || []).map((a) => [a.id, a]));
  const assocIds = [...new Set(((animals as AdoptionAnimal[]) || []).map((a) => a.association_id))];
  const { data: assocs } = assocIds.length
    ? await supabase.from('adoption_associations').select('id, name, slug, phone, whatsapp, email').in('id', assocIds)
    : { data: [] };
  const assocById = new Map(((assocs as Association[]) || []).map((a) => [a.id, a]));
  return reqs.map((r) => {
    const animal = animalById.get(r.animal_id);
    return { ...r, animal, association: animal ? assocById.get(animal.association_id) : undefined };
  });
}

export async function getMyRequestForAnimal(userId: string, animalId: string): Promise<AdoptionRequest | null> {
  const { data } = await db().from('adoption_requests').select('*').eq('user_id', userId).eq('animal_id', animalId).maybeSingle();
  return (data as AdoptionRequest) || null;
}
