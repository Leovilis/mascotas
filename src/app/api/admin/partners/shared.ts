import { NextResponse } from 'next/server';
import { parseCoordinates } from '@/services/reports.service';
import type { PartnerParsed } from '@/lib/validations/partner.schema';
import type { PartnerBusinessAdmin } from '@/types/partners';

export const PARTNER_COLUMNS =
  'id, region_slug, name, category, description, address, city, location, phone, whatsapp, website, instagram, logo_url, is_24h, plan, active, valid_until, owner_contact, internal_notes, created_at, updated_at';

/** Fila de la base -> objeto con latitude/longitude */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToPartner(row: any): PartnerBusinessAdmin {
  const { location, ...rest } = row;
  const coords = parseCoordinates(location);
  return { ...rest, latitude: coords.latitude, longitude: coords.longitude };
}

/** Objeto validado -> columnas de la tabla */
export function partnerToRow(p: PartnerParsed) {
  const { latitude, longitude, ...rest } = p;
  return { ...rest, location: `POINT(${longitude} ${latitude})` };
}

export function dbError(error: { message: string; code?: string }) {
  console.error('Error en partner_businesses:', error);
  const hint =
    error.code === '42501' || /permission denied/i.test(error.message)
      ? ' Verificá que SUPABASE_SERVICE_ROLE_KEY esté configurada en el servidor.'
      : error.code === '42P01'
        ? ' Falta correr la migración 20261008000003_partner_businesses.sql.'
        : '';
  return NextResponse.json({ error: error.message + hint }, { status: 500 });
}
