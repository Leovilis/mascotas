import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCoordinates } from '@/services/reports.service';
import { regionForPoint } from '@/config/region-geo';
import type { RegionConfig } from '@/config/regions';
import { emailButton, emailCode, emailLayout, escapeHtml } from '@/lib/email';
import type { ReportType } from '@/lib/report-auth';

/** Origen del sitio para armar links (el del pedido; así funciona igual en local y en producción) */
export function siteOrigin(req: Request): string {
  try {
    return new URL(req.url).origin;
  } catch {
    return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  }
}

export const DETAIL_PATH: Record<ReportType, string> = {
  lost: '/mascotas-perdidas/',
  found: '/mascotas-encontradas/',
  sighting: '/mascota-avistada/',
};

const LOCATION_COLUMN: Record<ReportType, string> = {
  lost: 'last_seen_location',
  found: 'found_location',
  sighting: 'location',
};
const TABLE: Record<ReportType, string> = { lost: 'lost_reports', found: 'found_reports', sighting: 'sightings' };

/** Datos para el mail: nombre de la mascota, dirección y provincia (según la ubicación) */
export async function getReportSummary(
  supabase: SupabaseClient,
  type: ReportType,
  id: string
): Promise<{ petName: string; address: string; region: RegionConfig } | null> {
  const select =
    type === 'sighting'
      ? `id, approximate_address, ${LOCATION_COLUMN[type]}, lost_report:lost_reports(pet:pets(name))`
      : `id, approximate_address, ${LOCATION_COLUMN[type]}, pet:pets(name)`;
  const { data } = await supabase.from(TABLE[type]).select(select).eq('id', id).maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  const coords = parseCoordinates(row[LOCATION_COLUMN[type]]);
  const petName = (type === 'sighting' ? row.lost_report?.pet?.name : row.pet?.name) || 'tu mascota';
  return {
    petName,
    address: row.approximate_address || '',
    region: regionForPoint(coords.latitude, coords.longitude),
  };
}

const TYPE_LABEL: Record<ReportType, string> = {
  lost: 'mascota perdida',
  found: 'mascota encontrada',
  sighting: 'avistamiento',
};

/** Mail con el código de gestión de UNA publicación */
export function managementCodeEmail(opts: {
  origin: string;
  type: ReportType;
  id: string;
  token: string;
  petName: string;
  address: string;
  region: RegionConfig;
}) {
  const code = `${opts.id}.${opts.token}`;
  const manageUrl = `${opts.origin}/mis-reportes?code=${encodeURIComponent(code)}`;
  const detailUrl = `${opts.origin}${DETAIL_PATH[opts.type]}${opts.id}`;
  const title = `Tu código de gestión: ${opts.petName}`;
  const html = emailLayout({
    brand: opts.region.brandName,
    title,
    bodyHtml: `
      <p style="font-size:14px;line-height:1.5;margin:0 0 12px 0;">Publicaste una <strong>${escapeHtml(TYPE_LABEL[opts.type])}</strong>${opts.address ? ` en <strong>${escapeHtml(opts.address)}</strong>` : ''}.
      Guardá este mail: con este código podés administrarla desde cualquier celular o computadora (marcarla como reunida, confirmar avistamientos o borrarla).</p>
      ${emailCode(code)}
      <p style="font-size:12px;color:#b91c1c;margin:8px 0 16px 0;">Es tu llave privada: no la compartas.</p>
      <p style="margin:0 0 10px 0;">${emailButton(manageUrl, 'Administrar mi publicación')}</p>
      <p style="font-size:13px;margin:0;">Ver la ficha pública: <a href="${escapeHtml(detailUrl)}" style="color:#ea580c;">${escapeHtml(detailUrl)}</a></p>`,
  });
  const text = `${title}\n\nCódigo de gestión (privado): ${code}\n\nAdministrar: ${manageUrl}\nFicha pública: ${detailUrl}\n\nCuidado con las estafas: nunca transfieras dinero por adelantado.`;
  return { subject: `🐾 ${title}`, html, text };
}
