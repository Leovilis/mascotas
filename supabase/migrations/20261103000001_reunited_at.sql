-- ==============================================================================
-- MIGRACIÓN: 20261103000001_reunited_at.sql
-- FECHA DE REENCUENTRO
--
-- Guarda cuándo una mascota volvió a casa (estado REUNITED), para mostrar en
-- /reencuentros y en la home las mascotas encontradas en los últimos 3 meses.
-- (updated_at no sirve: cambia con cualquier edición.)
-- Es seguro correrla más de una vez.
-- ==============================================================================

ALTER TABLE lost_reports  ADD COLUMN IF NOT EXISTS reunited_at TIMESTAMPTZ;
ALTER TABLE found_reports ADD COLUMN IF NOT EXISTS reunited_at TIMESTAMPTZ;

-- Publicaciones que ya estaban reunidas: se toma la última modificación como fecha aproximada
UPDATE lost_reports  SET reunited_at = updated_at WHERE status = 'REUNITED' AND reunited_at IS NULL;
UPDATE found_reports SET reunited_at = updated_at WHERE status = 'REUNITED' AND reunited_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lost_reports_reunited  ON lost_reports  (region_slug, reunited_at DESC) WHERE status = 'REUNITED';
CREATE INDEX IF NOT EXISTS idx_found_reports_reunited ON found_reports (region_slug, reunited_at DESC) WHERE status = 'REUNITED';
