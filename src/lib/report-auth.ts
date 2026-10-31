import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { editTokenMatches, isAdminRequest } from '@/lib/admin-auth';

export type ReportType = 'lost' | 'found' | 'sighting';

export const REPORT_TABLE: Record<ReportType, string> = {
  lost: 'lost_reports',
  found: 'found_reports',
  sighting: 'sightings',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseReportRequest(body: unknown):
  | { ok: true; reportId: string; type: ReportType; editToken: unknown; raw: Record<string, unknown> }
  | { ok: false; response: NextResponse } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const reportId = b.reportId;
  const type = (b.type ?? 'lost') as ReportType;
  if (typeof reportId !== 'string' || !UUID_RE.test(reportId)) {
    return { ok: false, response: NextResponse.json({ error: 'ID de reporte inválido' }, { status: 400 }) };
  }
  if (!(type in REPORT_TABLE)) {
    return { ok: false, response: NextResponse.json({ error: 'Tipo de publicación inválido' }, { status: 400 }) };
  }
  return { ok: true, reportId, type, editToken: b.editToken, raw: b };
}

/**
 * Autoriza una acción sobre una publicación:
 *  - administrador (header x-admin-key válido), o
 *  - dueño (token de edición que coincide con edit_token_hash).
 * Devuelve la fila (con pet_id si corresponde) o la respuesta de error.
 */
export async function authorizeReportAction(
  req: Request,
  supabaseAdmin: SupabaseClient,
  type: ReportType,
  reportId: string,
  editToken: unknown
): Promise<
  | { ok: true; isAdmin: boolean; row: { id: string; pet_id?: string | null; status?: string } }
  | { ok: false; response: NextResponse }
> {
  const columns = type === 'sighting' ? 'id, status, edit_token_hash' : 'id, pet_id, status, edit_token_hash';
  const { data: row, error } = await supabaseAdmin
    .from(REPORT_TABLE[type])
    .select(columns)
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    console.error('Error leyendo publicación para autorizar:', error);
    const hint = /edit_token_hash/.test(error.message) ? ' (falta correr la migración 20261031000001_security_hardening.sql)' : '';
    return { ok: false, response: NextResponse.json({ error: 'Error al verificar la publicación' + hint }, { status: 500 }) };
  }
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: 'La publicación no existe' }, { status: 404 }) };
  }

  const r = row as unknown as { id: string; pet_id?: string | null; status?: string; edit_token_hash?: string | null };
  if (isAdminRequest(req)) return { ok: true, isAdmin: true, row: r };
  if (editTokenMatches(editToken, r.edit_token_hash)) return { ok: true, isAdmin: false, row: r };

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: r.edit_token_hash
          ? 'No tenés permiso para modificar esta publicación.'
          : 'Esta publicación es anterior al sistema de códigos de gestión. Pedile al administrador que la actualice.',
      },
      { status: 403 }
    ),
  };
}
