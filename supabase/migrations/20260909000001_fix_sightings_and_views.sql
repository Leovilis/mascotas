-- ==============================================================================
-- MIGRACIÓN: 20260909000001_fix_sightings_and_views.sql
-- 1. PERMITIR AVISTAMIENTOS GENERALES (lost_report_id OPCIONAL)
-- 2. FUNCIÓN PARA INCREMENTAR CONTADOR DE VISTAS EN REPORTES
-- ==============================================================================

-- 1. Permitir que lost_report_id sea NULL en la tabla sightings para avistamientos generales
ALTER TABLE sightings ALTER COLUMN lost_report_id DROP NOT NULL;

-- 2. Función segura para incrementar vistas de una publicación
CREATE OR REPLACE FUNCTION increment_report_views(p_report_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_views INTEGER;
BEGIN
    UPDATE lost_reports 
    SET views_count = COALESCE(views_count, 0) + 1 
    WHERE id = p_report_id
    RETURNING views_count INTO new_views;
    
    RETURN COALESCE(new_views, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permitir actualización pública del contador de vistas si se hace mediante RPC
GRANT EXECUTE ON FUNCTION increment_report_views(UUID) TO anon, authenticated, service_role;
