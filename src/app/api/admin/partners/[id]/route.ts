import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminKey } from '@/lib/admin-auth';
import { partnerSchema } from '@/lib/validations/partner.schema';
import { PARTNER_COLUMNS, dbError, partnerToRow, rowToPartner } from '../shared';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/admin/partners/:id -> reemplaza los datos del comercio
export async function PUT(req: Request, { params }: Ctx) {
  const denied = checkAdminKey(req);
  if (denied) return denied;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('partner_businesses')
    .update(partnerToRow(parsed.data))
    .eq('id', id)
    .select(PARTNER_COLUMNS)
    .single();

  if (error) return dbError(error);
  return NextResponse.json({ partner: rowToPartner(data) });
}

// PATCH /api/admin/partners/:id -> cambio rápido de activo/plan/vencimiento
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = checkAdminKey(req);
  if (denied) return denied;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const patch: Record<string, unknown> = {};
  if (typeof body?.active === 'boolean') patch.active = body.active;
  if (body?.plan === 'basico' || body?.plan === 'destacado') patch.plan = body.plan;
  if (body?.valid_until === null || (typeof body?.valid_until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.valid_until))) {
    patch.valid_until = body.valid_until;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('partner_businesses')
    .update(patch)
    .eq('id', id)
    .select(PARTNER_COLUMNS)
    .single();

  if (error) return dbError(error);
  return NextResponse.json({ partner: rowToPartner(data) });
}

// DELETE /api/admin/partners/:id
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = checkAdminKey(req);
  if (denied) return denied;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from('partner_businesses').delete().eq('id', id);
  if (error) return dbError(error);
  return NextResponse.json({ success: true });
}
