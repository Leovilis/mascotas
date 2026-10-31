-- ==============================================================================
-- MIGRACIÓN: 20260907000001_fix_public_rls.sql
-- PERMITIR PUBLICACIÓN RÁPIDA SIN CUENTA OBLIGATORIA (CERO FRICCIÓN)
-- ==============================================================================

-- 1. Modificar columnas para que el user_id/owner_id/finder_id sea opcional
ALTER TABLE pets ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE lost_reports ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE found_reports ALTER COLUMN finder_id DROP NOT NULL;

-- 2. Actualizar políticas RLS de forma 100% segura e idempotente

-- Mascotas
DROP POLICY IF EXISTS "Authenticated Insert Pets" ON pets;
DROP POLICY IF EXISTS "Public Insert Pets" ON pets;
CREATE POLICY "Public Insert Pets" ON pets FOR INSERT WITH CHECK (true);

-- Reportes de Mascotas Perdidas
DROP POLICY IF EXISTS "User Create Lost Report" ON lost_reports;
DROP POLICY IF EXISTS "Public Create Lost Report" ON lost_reports;
CREATE POLICY "Public Create Lost Report" ON lost_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Active Lost Reports" ON lost_reports;
CREATE POLICY "Public Read Active Lost Reports" ON lost_reports FOR SELECT 
USING (status IN ('ACTIVE', 'FOUND', 'REUNITED') OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

-- Reportes de Mascotas Encontradas
DROP POLICY IF EXISTS "User Create Found Report" ON found_reports;
DROP POLICY IF EXISTS "Public Create Found Report" ON found_reports;
CREATE POLICY "Public Create Found Report" ON found_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Active Found Reports" ON found_reports;
CREATE POLICY "Public Read Active Found Reports" ON found_reports FOR SELECT 
USING (status IN ('ACTIVE', 'FOUND', 'REUNITED') OR (auth.uid() IS NOT NULL AND auth.uid() = finder_id));

-- Avistamientos
DROP POLICY IF EXISTS "Authenticated Insert Sightings" ON sightings;
DROP POLICY IF EXISTS "Public Insert Sightings" ON sightings;
CREATE POLICY "Public Insert Sightings" ON sightings FOR INSERT WITH CHECK (true);
