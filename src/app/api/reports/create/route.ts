import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { rateLimit, sha256Hex } from '@/lib/admin-auth';
import { dbRateLimit } from '@/lib/db-rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { lostReportSchema } from '@/lib/validations/lost-report.schema';
import { foundReportSchema } from '@/lib/validations/found-report.schema';
import { sightingSchema } from '@/lib/validations/sighting.schema';
import { regionForPoint } from '@/config/region-geo';
import { getServerRegion } from '@/lib/region/server';
import { isOwnStorageUrl } from '@/lib/storage-url';

export const dynamic = 'force-dynamic';

type CreateType = 'lost' | 'found' | 'sighting';

/** Límites por IP: publicaciones por hora */
const LIMITS: Record<CreateType, { max: number; windowMs: number }> = {
  lost: { max: 5, windowMs: 60 * 60 * 1000 },
  found: { max: 5, windowMs: 60 * 60 * 1000 },
  sighting: { max: 15, windowMs: 60 * 60 * 1000 },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatAddress(streetName?: string | null, approx?: string | null, number?: string | null, neighborhood?: string | null) {
  const street = (streetName || approx || '').trim();
  const num = (number || '').trim();
  const barrio = (neighborhood || '').trim();
  let out = street;
  if (num && !street.includes(num)) out = `${out} ${num}`;
  if (barrio) out = `${out}, B° ${barrio.replace(/^b[°ºa-z.]*\s*/i, '')}`;
  return out;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Alta de publicaciones (perdida, encontrada, avistamiento).
 * Se hace en el servidor para poder exigir el captcha (Turnstile) y limitar
 * cuántas publicaciones hace cada persona. El público ya no puede insertar directo en la base.
 */
export async function POST(req: Request) {
  // Freno rápido en memoria (antes de tocar la base o Cloudflare)
  if (!rateLimit(req, 'create-burst', 10, 5 * 60 * 1000)) {
    return bad('Estás publicando muy seguido. Esperá unos minutos y probá de nuevo.', 429);
  }

  const body = (await req.json().catch(() => null)) as { type?: unknown; data?: unknown; turnstileToken?: unknown } | null;
  const type = body?.type;
  if (type !== 'lost' && type !== 'found' && type !== 'sighting') return bad('Tipo de publicación inválido');

  const captcha = await verifyTurnstile(body?.turnstileToken, req);
  if (!captcha.ok) return bad(captcha.error || 'Verificación de seguridad inválida', 403);

  const supabase = createAdminClient();
  const limit = LIMITS[type];
  if (!(await dbRateLimit(supabase, req, `create-${type}`, limit.max, limit.windowMs))) {
    return bad(
      type === 'sighting'
        ? 'Llegaste al límite de avistamientos por hora. Si es urgente, contactá directamente a la familia.'
        : 'Llegaste al límite de publicaciones por hora desde esta conexión. Probá más tarde.',
      429
    );
  }

  // Usuario logueado (opcional)
  let userId: string | null = null;
  try {
    const auth = await createServerSupabase();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {}

  const { region: cookieRegion } = await getServerRegion();
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(token);

  if (type === 'lost' || type === 'found') {
    const parsed = type === 'lost' ? lostReportSchema.safeParse(body?.data) : foundReportSchema.safeParse(body?.data);
    if (!parsed.success) return bad(parsed.error.issues[0]?.message || 'Datos inválidos');
    const input = parsed.data;
    if (input.photos.length > 6 || !input.photos.every((u) => isOwnStorageUrl(u))) return bad('Las fotos deben subirse desde el formulario.');

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .insert({
        name: type === 'lost' ? (input as { name: string }).name : 'Encontrado',
        species: input.species,
        breed: input.breed || null,
        gender: input.gender,
        size: input.size,
        primary_color: input.primary_color,
        secondary_color: input.secondary_color || null,
        distinctive_features: input.distinctive_features || null,
        photos: input.photos,
        owner_id: userId,
      })
      .select('id')
      .single();
    if (petError || !pet) {
      console.error('Error insertando pet:', petError);
      return bad('No se pudo guardar la mascota.', 500);
    }

    const address = formatAddress(input.street_name, input.approximate_address, input.street_number, input.neighborhood);
    const regionSlug = regionForPoint(input.latitude, input.longitude, cookieRegion).slug;
    const point = `POINT(${input.longitude} ${input.latitude})`;

    if (type === 'lost') {
      const lost = parsed.data as ReturnType<typeof lostReportSchema.parse>;
      const { data: report, error } = await supabase
        .from('lost_reports')
        .insert({
          edit_token_hash: tokenHash,
          pet_id: pet.id,
          user_id: userId,
          last_seen_date: lost.last_seen_date,
          last_seen_location: point,
          region_slug: regionSlug,
          approximate_address: address,
          description: lost.description,
          contact_phone: lost.contact_phone || null,
          contact_name: lost.contact_name || null,
          contact_phone_public: lost.contact_phone_public,
          status: 'ACTIVE',
        })
        .select('id')
        .single();
      if (error || !report) {
        console.error('Error insertando lost_report:', error);
        await supabase.from('pets').delete().eq('id', pet.id);
        return bad('No se pudo crear la publicación.', 500);
      }
      if (userId && lost.contact_phone) {
        await supabase.from('profiles').update({ phone: lost.contact_phone, full_name: lost.contact_name }).eq('id', userId);
      }
      return NextResponse.json({ id: report.id, token });
    }

    const found = parsed.data as ReturnType<typeof foundReportSchema.parse>;
    const { data: report, error } = await supabase
      .from('found_reports')
      .insert({
        edit_token_hash: tokenHash,
        pet_id: pet.id,
        finder_id: userId,
        found_date: found.found_date,
        found_location: point,
        region_slug: regionSlug,
        approximate_address: address,
        is_holding: found.is_holding,
        description: found.description,
        contact_name: found.contact_name || null,
        contact_phone: found.contact_phone || null,
        status: 'ACTIVE',
      })
      .select('id')
      .single();
    if (error || !report) {
      console.error('Error insertando found_report:', error);
      await supabase.from('pets').delete().eq('id', pet.id);
      return bad('No se pudo crear el reporte.', 500);
    }
    return NextResponse.json({ id: report.id, token });
  }

  // Avistamiento
  const parsed = sightingSchema.safeParse(body?.data);
  if (!parsed.success) return bad(parsed.error.issues[0]?.message || 'Datos inválidos');
  const input = parsed.data;
  if (input.photo_url && !isOwnStorageUrl(input.photo_url)) return bad('La foto debe subirse desde el formulario.');

  let lostReportId: string | null = null;
  if (input.lost_report_id && UUID_RE.test(input.lost_report_id)) {
    const { data: exists } = await supabase.from('lost_reports').select('id').eq('id', input.lost_report_id).maybeSingle();
    if (exists) lostReportId = exists.id;
  }

  let description = input.is_holding
    ? `🏠 EN TRÁNSITO EN MI CASA / PATIO (El animal está a salvo esperando a su familia).\n\n${input.description}`
    : `🐾 VISTO EN LA VÍA PÚBLICA (Fue visto deambulando en el lugar indicado).\n\n${input.description}`;
  if (input.contact_phone?.trim()) description += `\n\n📞 Contacto / WhatsApp: ${input.contact_phone.trim()}`;
  if (input.reporter_name?.trim()) description += `\n\n👤 Reportado por: ${input.reporter_name.trim()}`;

  const { data, error } = await supabase
    .from('sightings')
    .insert({
      edit_token_hash: tokenHash,
      lost_report_id: lostReportId,
      user_id: userId,
      location: `POINT(${input.longitude} ${input.latitude})`,
      region_slug: regionForPoint(input.latitude, input.longitude, cookieRegion).slug,
      approximate_address: input.approximate_address,
      sighting_date: input.sighting_date,
      photo_url: input.photo_url || null,
      description,
      status: 'PENDING',
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('Error insertando sighting:', error);
    return bad('No se pudo registrar el avistamiento.', 500);
  }
  return NextResponse.json({ id: data.id, token });
}
