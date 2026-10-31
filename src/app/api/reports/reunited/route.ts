import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reportId, type, status = 'REUNITED' } = body;

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'ID de reporte inválido' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Caso Avistamiento
    if (type === 'sighting') {
      const nextSightingStatus = status === 'REUNITED' ? 'VERIFIED' : status;
      const { data: updatedSighting, error: sightErr } = await supabaseAdmin
        .from('sightings')
        .update({
          status: nextSightingStatus,
        })
        .eq('id', reportId)
        .select()
        .single();

      if (sightErr) {
        console.error('Error al actualizar sighting:', sightErr);
        return NextResponse.json({ error: sightErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        report: updatedSighting,
        message: nextSightingStatus === 'VERIFIED' ? 'Avistamiento verificado correctamente' : 'Avistamiento actualizado',
      });
    }

    // 2. Caso Mascota Encontrada
    if (type === 'found') {
      const { data: updatedFound, error: foundErr } = await supabaseAdmin
        .from('found_reports')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single();

      if (foundErr) {
        console.error('Error al actualizar found_report:', foundErr);
        return NextResponse.json({ error: foundErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        report: updatedFound,
        message: status === 'REUNITED' ? 'Mascota encontrada marcada como devuelta a su familia ❤️' : 'Publicación reactivada',
      });
    }

    // 3. Caso Mascota Perdida (o detección automática)
    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from('lost_reports')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error al actualizar lost_report:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Si no estaba en lost_reports, intentar en found_reports
    if (!updatedReport) {
      const { data: updatedFound, error: fallbackFoundErr } = await supabaseAdmin
        .from('found_reports')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .maybeSingle();

      if (fallbackFoundErr) {
        return NextResponse.json({ error: fallbackFoundErr.message }, { status: 500 });
      }

      if (updatedFound) {
        return NextResponse.json({
          success: true,
          report: updatedFound,
          message: status === 'REUNITED' ? 'Mascota marcada como reunida exitosamente ❤️' : 'Publicación reactivada',
        });
      }

      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    // Archivar avistamientos vinculados si se marcó como reunida
    if (status === 'REUNITED') {
      try {
        await supabaseAdmin
          .from('sightings')
          .update({ status: 'VERIFIED' })
          .eq('lost_report_id', reportId);
      } catch (sightingErr) {
        console.warn('Aviso al actualizar avistamientos vinculados:', sightingErr);
      }
    }

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: status === 'REUNITED' ? 'Mascota marcada como reunida exitosamente ❤️' : 'Publicación reactivada en búsqueda activa',
    });
  } catch (err: any) {
    console.error('Error en API /api/reports/reunited:', err);
    return NextResponse.json({ error: err?.message || 'Error del servidor' }, { status: 500 });
  }
}
