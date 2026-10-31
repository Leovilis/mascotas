-- ==============================================================================
-- MIGRACIÓN: 20261008000001_multi_region.sql
-- SOPORTE MULTI-PROVINCIA (Chubut + Jujuy, ampliable)
--
-- 1. Columna region_slug en publicaciones (lost_reports, found_reports, sightings)
--    para filtrar los avisos por provincia directamente en la base.
-- 2. Asigna la provincia a las publicaciones existentes según sus coordenadas.
-- 3. Carga la provincia de Jujuy y sus ciudades.
-- 4. Quita "Trelew" del nombre por defecto de los perfiles nuevos.
--
-- IMPORTANTE: ejecutar ANTES de publicar la versión nueva del frontend,
-- porque la app ya consulta y guarda la columna region_slug.
-- Los slugs deben coincidir con src/config/regions.ts ('chubut', 'jujuy').
-- ==============================================================================

-- 1. COLUMNA region_slug ---------------------------------------------------------
-- Valor por defecto 'chubut': todo lo publicado hasta hoy es de Trelew y alrededores.
ALTER TABLE lost_reports  ADD COLUMN IF NOT EXISTS region_slug TEXT NOT NULL DEFAULT 'chubut';
ALTER TABLE found_reports ADD COLUMN IF NOT EXISTS region_slug TEXT NOT NULL DEFAULT 'chubut';
ALTER TABLE sightings     ADD COLUMN IF NOT EXISTS region_slug TEXT NOT NULL DEFAULT 'chubut';

CREATE INDEX IF NOT EXISTS idx_lost_reports_region_status_created
    ON lost_reports (region_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_found_reports_region_status_created
    ON found_reports (region_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_region_created
    ON sightings (region_slug, created_at DESC);

-- 2. BACKFILL POR COORDENADAS ----------------------------------------------------
-- Rectángulos aproximados (los mismos que src/config/regions.ts -> bounds)
UPDATE lost_reports SET region_slug = 'jujuy'
WHERE ST_Y(last_seen_location::geometry) BETWEEN -24.65 AND -21.75
  AND ST_X(last_seen_location::geometry) BETWEEN -67.25 AND -64.10;

UPDATE found_reports SET region_slug = 'jujuy'
WHERE ST_Y(found_location::geometry) BETWEEN -24.65 AND -21.75
  AND ST_X(found_location::geometry) BETWEEN -67.25 AND -64.10;

UPDATE sightings SET region_slug = 'jujuy'
WHERE ST_Y(location::geometry) BETWEEN -24.65 AND -21.75
  AND ST_X(location::geometry) BETWEEN -67.25 AND -64.10;

-- 3. PROVINCIAS Y CIUDADES -------------------------------------------------------
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
UPDATE provinces SET slug = 'chubut' WHERE id = 1 AND slug IS NULL;

INSERT INTO provinces (id, country_id, name, slug)
VALUES (2, 'ARG', 'Jujuy', 'jujuy')
ON CONFLICT (id) DO NOTHING;

-- Mantener la secuencia del SERIAL por delante de los ids insertados a mano
SELECT setval(pg_get_serial_sequence('provinces', 'id'), GREATEST((SELECT MAX(id) FROM provinces), 1));

-- Coordenadas aproximadas: verificarlas antes de producción
INSERT INTO cities (province_id, name, center_location, default_radius_km)
SELECT 2, c.name, ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography, c.radius
FROM (VALUES
    ('San Salvador de Jujuy',        -24.1858, -65.2995, 15),
    ('Palpalá',                      -24.2565, -65.2116, 10),
    ('Perico',                       -24.3820, -65.1130, 10),
    ('San Pedro de Jujuy',           -24.2310, -64.8660, 10),
    ('Libertador Gral. San Martín',  -23.8064, -64.7876, 10)
) AS c(name, lat, lng, radius)
WHERE NOT EXISTS (
    SELECT 1 FROM cities x WHERE x.province_id = 2 AND x.name = c.name
);

-- 4. NOMBRE POR DEFECTO DE PERFILES NUEVOS -----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Vecino'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
