import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminKey } from '@/lib/admin-auth';
import { partnerSchema } from '@/lib/validations/partner.schema';
import { PARTNER_COLUMNS, dbError, partnerToRow, rowToPartner } from './shared';

export const dynamic = 'force-dynamic';

// GET /api/admin/partners -> todos los comercios (activos, inactivos y vencidos)
export async function GET(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('partner_businesses')
    .select(PARTNER_COLUMNS)
    .order('region_slug', { ascending: true })
    .order('name', { ascending: true });

  if (error) return dbError(error);
  return NextResponse.json({ partners: (data || []).map(rowToPartner) });
}

// POST /api/admin/partners -> alta de comercio
export async function POST(req: Request) {
  const denied = checkAdminKey(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('partner_businesses')
    .insert(partnerToRow(parsed.data))
    .select(PARTNER_COLUMNS)
    .single();

  if (error) return dbError(error);
  return NextResponse.json({ partner: rowToPartner(data) }, { status: 201 });
}
