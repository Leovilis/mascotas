import { NextResponse } from 'next/server';
import { checkAdminKey } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailButton, emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { getRegion } from '@/config/regions';
import { siteOrigin } from '@/lib/report-email';
import type { AdopterProfile, Association } from '@/lib/adoption/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

/** Lista de asociaciones de adopción para el super admin (con la persona responsable) */
export async function GET(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('adoption_associations').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: 'No se pudo leer (¿corriste la migración de adopción?)' }, { status: 500 });
  const list = (data as Association[]) || [];
  const ownerIds = list.map((a) => a.owner_id);
  const [{ data: profiles }, { data: animals }] = await Promise.all([
    ownerIds.length ? supabase.from('adopter_profiles').select('*').in('user_id', ownerIds) : Promise.resolve({ data: [] }),
    list.length ? supabase.from('adoption_animals').select('association_id, status').in('association_id', list.map((a) => a.id)) : Promise.resolve({ data: [] }),
  ]);
  const byOwner = new Map(((profiles as AdopterProfile[]) || []).map((p) => [p.user_id, p]));
  const counts = new Map<string, { total: number; adopted: number }>();
  ((animals as { association_id: string; status: string }[]) || []).forEach((a) => {
    const c = counts.get(a.association_id) || { total: 0, adopted: 0 };
    c.total += 1;
    if (a.status === 'ADOPTED') c.adopted += 1;
    counts.set(a.association_id, c);
  });
  return NextResponse.json({
    associations: list.map((a) => ({
      ...a,
      responsible: byOwner.get(a.owner_id) || null,
      animals: counts.get(a.id) || { total: 0, adopted: 0 },
    })),
  });
}

/** Aprobar / rechazar / suspender una asociación */
export async function PATCH(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; admin_notes?: unknown } | null;
  const id = body?.id;
  const status = body?.status;
  if (typeof id !== 'string' || !UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  if (typeof status !== 'string' || !STATUSES.includes(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  const notes = typeof body?.admin_notes === 'string' ? body.admin_notes.trim().slice(0, 500) || null : null;

  const supabase = createAdminClient();
  const { data: before } = await supabase.from('adoption_associations').select('*').eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  const { error } = await supabase
    .from('adoption_associations')
    .update({ status, admin_notes: notes, approved_at: status === 'APPROVED' ? new Date().toISOString() : (before as Association).approved_at })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });

  const a = before as Association;
  if (status !== a.status && (status === 'APPROVED' || status === 'REJECTED')) {
    const region = getRegion(a.region_slug);
    const origin = siteOrigin(req);
    await sendEmail({
      to: a.email,
      subject: status === 'APPROVED' ? `¡${a.name} ya está publicada en ${region.brandName}!` : `Sobre la solicitud de ${a.name}`,
      html: emailLayout({
        brand: region.brandName,
        title: status === 'APPROVED' ? '¡Tu asociación fue aprobada!' : 'Tu asociación no fue aprobada',
        bodyHtml:
          status === 'APPROVED'
            ? `<p>${escapeHtml(a.name)} ya aparece en la sección de adopción. Los animales que cargues se publican al instante.</p>${emailButton(`${origin}/asociacion`, 'Ir a mi panel')}`
            : `<p>Por ahora no pudimos aprobar a ${escapeHtml(a.name)}.</p>${notes ? `<p>Motivo: ${escapeHtml(notes)}</p>` : ''}<p>Si creés que es un error, respondé este mail.</p>`,
      }),
      text: status === 'APPROVED' ? `${a.name} fue aprobada. Panel: ${origin}/asociacion` : `${a.name} no fue aprobada.${notes ? ` Motivo: ${notes}` : ''}`,
    });
  }
  return NextResponse.json({ success: true });
}
