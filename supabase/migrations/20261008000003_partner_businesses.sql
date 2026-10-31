-- ==============================================================================
-- MIGRACIÓN: 20261008000003_partner_businesses.sql
-- COMERCIOS AMIGOS (veterinarias, pet shops, guarderías, etc.)
--
-- Modelo: el comercio paga un abono (plan 'basico' o 'destacado') para aparecer
-- en el directorio /comercios y junto a las fichas de mascotas perdidas cercanas.
--
-- Seguridad:
--  * La tabla NO es legible por anon/authenticated (RLS sin políticas públicas):
--    tiene datos internos (contacto del dueño, notas de cobro).
--  * El público lee SOLO columnas públicas mediante la función get_partner_businesses().
--  * Las altas/bajas/cambios se hacen desde /api/admin/partners con la service role key.
-- Requiere 20261008000001_multi_region.sql (usa los mismos slugs de provincia).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS partner_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('veterinaria', 'petshop', 'guarderia', 'peluqueria', 'refugio', 'otro')),
    description TEXT,
    address TEXT NOT NULL,
    city TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    website TEXT,
    instagram TEXT,
    logo_url TEXT,
    is_24h BOOLEAN NOT NULL DEFAULT FALSE,
    plan TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'destacado')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    -- Fecha hasta la que está pago el abono (NULL = sin vencimiento)
    valid_until DATE,
    -- Datos internos (no se muestran al público)
    owner_contact TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_businesses_region_active ON partner_businesses (region_slug, active);
CREATE INDEX IF NOT EXISTS idx_partner_businesses_location ON partner_businesses USING GIST (location);

DROP TRIGGER IF EXISTS tr_partner_businesses_updated_at ON partner_businesses;
CREATE TRIGGER tr_partner_businesses_updated_at
    BEFORE UPDATE ON partner_businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS activado y sin políticas para anon/authenticated: solo la service role accede a la tabla
ALTER TABLE partner_businesses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON partner_businesses FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- Lectura pública: solo comercios activos y con abono vigente, solo columnas públicas.
-- Orden: destacados primero; luego por distancia (si se pasa lat/lng) o por nombre.
-- p_max_km limita la distancia cuando se pasa lat/lng (ej: "veterinarias cerca").
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_partner_businesses(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
CREATE OR REPLACE FUNCTION get_partner_businesses(
    p_region TEXT,
    p_category TEXT DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL,
    p_max_km DOUBLE PRECISION DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    region_slug TEXT,
    name TEXT,
    category TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    whatsapp TEXT,
    website TEXT,
    instagram TEXT,
    logo_url TEXT,
    is_24h BOOLEAN,
    plan TEXT,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        b.id, b.region_slug, b.name, b.category, b.description, b.address, b.city,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.phone, b.whatsapp, b.website, b.instagram, b.logo_url, b.is_24h, b.plan,
        CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN NULL
             ELSE ST_Distance(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
        END AS distance_meters
    FROM partner_businesses b
    WHERE b.active
      AND (b.valid_until IS NULL OR b.valid_until >= CURRENT_DATE)
      AND b.region_slug = p_region
      AND (p_category IS NULL OR b.category = p_category)
      AND (
          p_max_km IS NULL OR p_lat IS NULL OR p_lng IS NULL
          OR ST_DWithin(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_max_km * 1000)
      )
    ORDER BY
        (b.plan = 'destacado') DESC,
        CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN NULL
             ELSE b.location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        END ASC NULLS LAST,
        b.name ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION get_partner_businesses(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER)
    TO anon, authenticated, service_role;
