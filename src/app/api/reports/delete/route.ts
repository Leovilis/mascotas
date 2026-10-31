import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reportId, type = 'lost', petId } = body;

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'ID de reporte inválido' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if (type === 'sighting') {
      const { error: sightErr } = await supabaseAdmin
        .from('sightings')
        .delete()
        .eq('id', reportId);

      if (sightErr) {
        console.error('Error al eliminar sighting:', sightErr);
        return NextResponse.json({ error: sightErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Avistamiento eliminado correctamente' });
    }

    if (type === 'found') {
      const { error: foundErr } = await supabaseAdmin
        .from('found_reports')
        .delete()
        .eq('id', reportId);

      if (foundErr) {
        console.error('Error al eliminar found_report:', foundErr);
        return NextResponse.json({ error: foundErr.message }, { status: 500 });
      }

      if (petId) {
        await supabaseAdmin.from('pets').delete().eq('id', petId);
      }

      return NextResponse.json({ success: true, message: 'Reporte de mascota encontrada eliminado correctamente' });
    }

    // Default: 'lost'
    // 1. Eliminar avistamientos vinculados
    await supabaseAdmin.from('sightings').delete().eq('lost_report_id', reportId);

    // 2. Eliminar de lost_reports
    const { error: lostErr } = await supabaseAdmin
      .from('lost_reports')
      .delete()
      .eq('id', reportId);

    if (lostErr) {
      console.error('Error al eliminar lost_report:', lostErr);
      return NextResponse.json({ error: lostErr.message }, { status: 500 });
    }

    // 3. Eliminar mascota si petId
    if (petId) {
      await supabaseAdmin.from('pets').delete().eq('id', petId);
    }

    return NextResponse.json({ success: true, message: 'Publicación de mascota perdida eliminada correctamente' });
  } catch (err: any) {
    console.error('Error en API /api/reports/delete:', err);
    return NextResponse.json({ error: err?.message || 'Error del servidor' }, { status: 500 });
  }
}
