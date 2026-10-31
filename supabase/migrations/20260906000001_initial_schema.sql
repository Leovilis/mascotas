-- ==============================================================================
-- PLATAFORMA DE MASCOTAS PERDIDAS Y ENCONTRADAS (TRELEW / MULTI-CIUDAD)
-- SCRIPT DE MIGRACIÓN COMPLETO (PostgreSQL + PostGIS + RLS + Triggers + RPCs)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TIPOS Y ENUMS PERSONALIZADOS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE pet_species AS ENUM ('dog', 'cat', 'bird', 'rabbit', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE pet_gender AS ENUM ('male', 'female', 'unknown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE pet_size AS ENUM ('small', 'medium', 'large', 'giant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'FOUND', 'REUNITED', 'CLOSED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE sighting_status AS ENUM ('PENDING', 'VERIFIED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE moderation_reason AS ENUM ('false_information', 'spam', 'inappropriate_content', 'scam', 'duplicate', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('new_sighting', 'possible_match', 'geo_alert', 'status_changed', 'reputation_awarded', 'system_message');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. FUNCIONES AUXILIARES (TRIGGERS)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. JERARQUÍA GEOGRÁFICA (Multi-Ciudad Escalable)
CREATE TABLE IF NOT EXISTS countries (
    id VARCHAR(3) PRIMARY KEY, -- 'ARG'
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provinces (
    id SERIAL PRIMARY KEY,
    country_id VARCHAR(3) REFERENCES countries(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    province_id INTEGER REFERENCES provinces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    center_location GEOGRAPHY(Point, 4326) NOT NULL,
    default_radius_km NUMERIC DEFAULT 15 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. PERFILES DE USUARIOS (Vinculado a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'user' NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    whatsapp_enabled BOOLEAN DEFAULT false NOT NULL,
    avatar_url TEXT,
    trust_score INTEGER DEFAULT 0 NOT NULL,
    reunited_count INTEGER DEFAULT 0 NOT NULL,
    is_blocked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. MASCOTAS
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT, -- En mascotas encontradas puede ser NULL
    species pet_species NOT NULL,
    breed TEXT,
    gender pet_gender DEFAULT 'unknown' NOT NULL,
    size pet_size NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT,
    distinctive_features TEXT,
    photos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. REPORTES DE MASCOTAS PERDIDAS (Lost Reports)
CREATE TABLE IF NOT EXISTS lost_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
    city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
    status report_status DEFAULT 'ACTIVE' NOT NULL,
    last_seen_date TIMESTAMPTZ NOT NULL,
    last_seen_location GEOGRAPHY(Point, 4326) NOT NULL,
    approximate_address TEXT NOT NULL,
    description TEXT NOT NULL,
    contact_phone_public BOOLEAN DEFAULT false NOT NULL,
    views_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. REPORTES DE MASCOTAS ENCONTRADAS (Found Reports)
CREATE TABLE IF NOT EXISTS found_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
    city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
    status report_status DEFAULT 'ACTIVE' NOT NULL,
    found_date TIMESTAMPTZ NOT NULL,
    found_location GEOGRAPHY(Point, 4326) NOT NULL,
    approximate_address TEXT NOT NULL,
    is_holding BOOLEAN DEFAULT true NOT NULL, -- ¿Está en tránsito en su casa o en la calle?
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. AVISTAMIENTOS (Sightings)
CREATE TABLE IF NOT EXISTS sightings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    lost_report_id UUID REFERENCES lost_reports(id) ON DELETE CASCADE NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    sighting_date TIMESTAMPTZ NOT NULL,
    approximate_address TEXT NOT NULL,
    photo_url TEXT,
    description TEXT NOT NULL,
    status sighting_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. COINCIDENCIAS SUGERIDAS (Matching Engine)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_report_id UUID REFERENCES lost_reports(id) ON DELETE CASCADE NOT NULL,
    found_report_id UUID REFERENCES found_reports(id) ON DELETE CASCADE NOT NULL,
    match_score NUMERIC(5, 2) NOT NULL, -- Porcentaje 0 - 100%
    is_confirmed BOOLEAN DEFAULT false NOT NULL,
    dismissed_by_owner BOOLEAN DEFAULT false NOT NULL,
    dismissed_by_finder BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_match_pair UNIQUE (lost_report_id, found_report_id)
);

-- 11. ZONAS DE ALERTA DE USUARIOS (Geofencing de Alertas Comunitarias)
CREATE TABLE IF NOT EXISTS user_alert_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    center_location GEOGRAPHY(Point, 4326) NOT NULL,
    radius_meters NUMERIC DEFAULT 3000 NOT NULL,
    species_filter pet_species[],
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    resource_type TEXT, -- 'lost_report', 'found_report', 'sighting', 'match'
    resource_id UUID,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. AUDITORÍA DE REPUTACIÓN (Eventos Verificables)
CREATE TABLE IF NOT EXISTS reputation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    report_id UUID,
    points_delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. DENUNCIAS Y MODERACIÓN
CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reported_entity_type TEXT NOT NULL, -- 'lost_report', 'found_report', 'sighting', 'user'
    reported_entity_id UUID NOT NULL,
    reason moderation_reason NOT NULL,
    details TEXT,
    resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. CÓDIGOS QR FÍSICOS Y MÉTRICAS
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_identifier TEXT UNIQUE NOT NULL, -- ej: 'QR_VET_PATAGONIA_01'
    campaign_name TEXT NOT NULL,
    target_path TEXT NOT NULL, -- ej: '/publicar/perdida'
    assigned_location_name TEXT, -- ej: 'Veterinaria Trelew Centro'
    approximate_location GEOGRAPHY(Point, 4326),
    scan_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 16. EVENTOS DE ANALYTICS ANÓNIMOS
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 17. ÍNDICES ESPACIALES (GIST) Y DE RENDIMIENTO (B-TREE)
-- ==============================================================================

-- Índices Espaciales PostGIS (Búsquedas en milisegundos)
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities USING GIST (center_location);
CREATE INDEX IF NOT EXISTS idx_lost_reports_location ON lost_reports USING GIST (last_seen_location);
CREATE INDEX IF NOT EXISTS idx_found_reports_location ON found_reports USING GIST (found_location);
CREATE INDEX IF NOT EXISTS idx_sightings_location ON sightings USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_user_alert_zones_location ON user_alert_zones USING GIST (center_location);

-- Índices B-Tree para Relaciones y Estados
CREATE INDEX IF NOT EXISTS idx_lost_reports_status ON lost_reports (status);
CREATE INDEX IF NOT EXISTS idx_lost_reports_user ON lost_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_lost_reports_created ON lost_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_found_reports_status ON found_reports (status);
CREATE INDEX IF NOT EXISTS idx_found_reports_finder ON found_reports (finder_id);
CREATE INDEX IF NOT EXISTS idx_found_reports_created ON found_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sightings_report ON sightings (lost_report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;

-- ==============================================================================
-- 18. TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- Triggers de actualización de timestamps (updated_at)
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_lost_reports_updated_at ON lost_reports;
CREATE TRIGGER tr_lost_reports_updated_at BEFORE UPDATE ON lost_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_found_reports_updated_at ON found_reports;
CREATE TRIGGER tr_found_reports_updated_at BEFORE UPDATE ON found_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Crear automáticamente un registro en profiles cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Vecino de Trelew'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Actualizar trust_score en profiles cuando se crea un reputation_event
CREATE OR REPLACE FUNCTION update_user_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET trust_score = trust_score + NEW.points_delta
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reputation_event_added ON reputation_events;
CREATE TRIGGER tr_reputation_event_added
    AFTER INSERT ON reputation_events
    FOR EACH ROW EXECUTE FUNCTION update_user_trust_score();

-- ==============================================================================
-- 19. FUNCIONES RPC POSTGIS PARA CONSULTAS GEOGRÁFICAS
-- ==============================================================================

-- A. Búsqueda de Mascotas Perdidas por Radio Geográfico
CREATE OR REPLACE FUNCTION get_nearby_lost_reports(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 5000,
    p_species pet_species DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    pet_id UUID,
    pet_name TEXT,
    species pet_species,
    breed TEXT,
    size pet_size,
    primary_color TEXT,
    photos TEXT[],
    status report_status,
    last_seen_date TIMESTAMPTZ,
    approximate_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        lr.id,
        p.id AS pet_id,
        p.name AS pet_name,
        p.species,
        p.breed,
        p.size,
        p.primary_color,
        p.photos,
        lr.status,
        lr.last_seen_date,
        lr.approximate_address,
        ST_Y(lr.last_seen_location::geometry) AS latitude,
        ST_X(lr.last_seen_location::geometry) AS longitude,
        ROUND(ST_Distance(lr.last_seen_location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)) AS distance_meters,
        lr.created_at
    FROM lost_reports lr
    JOIN pets p ON p.id = lr.pet_id
    WHERE lr.status = 'ACTIVE'
      AND (p_species IS NULL OR p.species = p_species)
      AND ST_DWithin(lr.last_seen_location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    ORDER BY distance_meters ASC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- B. Búsqueda de Mascotas Encontradas por Radio Geográfico
CREATE OR REPLACE FUNCTION get_nearby_found_reports(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 5000,
    p_species pet_species DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    pet_id UUID,
    species pet_species,
    breed TEXT,
    size pet_size,
    primary_color TEXT,
    photos TEXT[],
    status report_status,
    found_date TIMESTAMPTZ,
    approximate_address TEXT,
    is_holding BOOLEAN,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        fr.id,
        p.id AS pet_id,
        p.species,
        p.breed,
        p.size,
        p.primary_color,
        p.photos,
        fr.status,
        fr.found_date,
        fr.approximate_address,
        fr.is_holding,
        ST_Y(fr.found_location::geometry) AS latitude,
        ST_X(fr.found_location::geometry) AS longitude,
        ROUND(ST_Distance(fr.found_location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)) AS distance_meters,
        fr.created_at
    FROM found_reports fr
    JOIN pets p ON p.id = fr.pet_id
    WHERE fr.status = 'ACTIVE'
      AND (p_species IS NULL OR p.species = p_species)
      AND ST_DWithin(fr.found_location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    ORDER BY distance_meters ASC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- C. Marcadores Unificados para el Mapa Interactivo (Perdidas 🔴, Encontradas 🟢, Avistamientos 🟡)
CREATE OR REPLACE FUNCTION get_map_markers(
    p_min_lat DOUBLE PRECISION,
    p_min_lng DOUBLE PRECISION,
    p_max_lat DOUBLE PRECISION,
    p_max_lng DOUBLE PRECISION
)
RETURNS TABLE (
    marker_id UUID,
    marker_type TEXT, -- 'lost', 'found', 'sighting'
    title TEXT,
    species pet_species,
    photo_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    report_date TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    -- Mascotas Perdidas (🔴)
    SELECT 
        lr.id AS marker_id,
        'lost' AS marker_type,
        COALESCE(p.name, 'Mascota perdida') AS title,
        p.species,
        CASE WHEN array_length(p.photos, 1) > 0 THEN p.photos[1] ELSE NULL END AS photo_url,
        ST_Y(lr.last_seen_location::geometry) AS latitude,
        ST_X(lr.last_seen_location::geometry) AS longitude,
        lr.last_seen_date AS report_date
    FROM lost_reports lr
    JOIN pets p ON p.id = lr.pet_id
    WHERE lr.status = 'ACTIVE'
      AND ST_Intersects(
          lr.last_seen_location::geometry,
          ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
      )

    UNION ALL

    -- Mascotas Encontradas (🟢)
    SELECT 
        fr.id AS marker_id,
        'found' AS marker_type,
        'Mascota encontrada' AS title,
        p.species,
        CASE WHEN array_length(p.photos, 1) > 0 THEN p.photos[1] ELSE NULL END AS photo_url,
        ST_Y(fr.found_location::geometry) AS latitude,
        ST_X(fr.found_location::geometry) AS longitude,
        fr.found_date AS report_date
    FROM found_reports fr
    JOIN pets p ON p.id = fr.pet_id
    WHERE fr.status = 'ACTIVE'
      AND ST_Intersects(
          fr.found_location::geometry,
          ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
      )

    UNION ALL

    -- Avistamientos (🟡)
    SELECT 
        s.id AS marker_id,
        'sighting' AS marker_type,
        'Avistamiento reportado' AS title,
        p.species,
        s.photo_url,
        ST_Y(s.location::geometry) AS latitude,
        ST_X(s.location::geometry) AS longitude,
        s.sighting_date AS report_date
    FROM sightings s
    JOIN lost_reports lr ON lr.id = s.lost_report_id
    JOIN pets p ON p.id = lr.pet_id
    WHERE lr.status = 'ACTIVE'
      AND ST_Intersects(
          s.location::geometry,
          ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
      );
$$;

-- ==============================================================================
-- 20. SEGURIDAD Y POLÍTICAS RLS (Row Level Security)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE found_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Jerarquía geográfica: Lectura pública
DROP POLICY IF EXISTS "Public Read Countries" ON countries;
CREATE POLICY "Public Read Countries" ON countries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Provinces" ON provinces;
CREATE POLICY "Public Read Provinces" ON provinces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Cities" ON cities;
CREATE POLICY "Public Read Cities" ON cities FOR SELECT USING (true);

-- Perfiles: Lectura pública (nombre, score), Edición solo propietario
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner Update Profile" ON profiles;
CREATE POLICY "Owner Update Profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Mascotas: Lectura pública, Inserción pública sin fricción
DROP POLICY IF EXISTS "Public Read Pets" ON pets;
CREATE POLICY "Public Read Pets" ON pets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated Insert Pets" ON pets;
DROP POLICY IF EXISTS "Public Insert Pets" ON pets;
CREATE POLICY "Public Insert Pets" ON pets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner Update Pets" ON pets;
CREATE POLICY "Owner Update Pets" ON pets FOR UPDATE USING (auth.uid() = owner_id);

-- Lost Reports:
DROP POLICY IF EXISTS "Public Read Active Lost Reports" ON lost_reports;
CREATE POLICY "Public Read Active Lost Reports" ON lost_reports FOR SELECT 
USING (status IN ('ACTIVE', 'FOUND', 'REUNITED') OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

DROP POLICY IF EXISTS "User Create Lost Report" ON lost_reports;
DROP POLICY IF EXISTS "Public Create Lost Report" ON lost_reports;
CREATE POLICY "Public Create Lost Report" ON lost_reports FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Owner Update Lost Report" ON lost_reports;
CREATE POLICY "Owner Update Lost Report" ON lost_reports FOR UPDATE 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Found Reports:
DROP POLICY IF EXISTS "Public Read Active Found Reports" ON found_reports;
CREATE POLICY "Public Read Active Found Reports" ON found_reports FOR SELECT 
USING (status IN ('ACTIVE', 'FOUND', 'REUNITED') OR (auth.uid() IS NOT NULL AND auth.uid() = finder_id));

DROP POLICY IF EXISTS "User Create Found Report" ON found_reports;
DROP POLICY IF EXISTS "Public Create Found Report" ON found_reports;
CREATE POLICY "Public Create Found Report" ON found_reports FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Finder Update Found Report" ON found_reports;
CREATE POLICY "Finder Update Found Report" ON found_reports FOR UPDATE 
USING (auth.uid() = finder_id) WITH CHECK (auth.uid() = finder_id);

-- Sightings:
DROP POLICY IF EXISTS "Public Read Sightings" ON sightings;
CREATE POLICY "Public Read Sightings" ON sightings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated Insert Sightings" ON sightings;
DROP POLICY IF EXISTS "Public Insert Sightings" ON sightings;
CREATE POLICY "Public Insert Sightings" ON sightings FOR INSERT WITH CHECK (true);

-- Notificaciones: Solo el destinatario
DROP POLICY IF EXISTS "User Access Own Notifications" ON notifications;
CREATE POLICY "User Access Own Notifications" ON notifications FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Zonas de Alerta: Solo el usuario dueño
DROP POLICY IF EXISTS "User Manage Own Alert Zones" ON user_alert_zones;
CREATE POLICY "User Manage Own Alert Zones" ON user_alert_zones FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Denuncias: Creación por usuarios autenticados, visualización por moderadores/admins
DROP POLICY IF EXISTS "User Create Moderation Report" ON moderation_reports;
CREATE POLICY "User Create Moderation Report" ON moderation_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Moderators Read Moderation Reports" ON moderation_reports;
CREATE POLICY "Moderators Read Moderation Reports" ON moderation_reports FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

-- ==============================================================================
-- 21. DATOS SEMILLA (Seed inicial para Trelew y Valle Inferior del Río Chubut)
-- ==============================================================================

INSERT INTO countries (id, name) VALUES ('ARG', 'Argentina') ON CONFLICT DO NOTHING;

INSERT INTO provinces (id, country_id, name) 
VALUES (1, 'ARG', 'Chubut') 
ON CONFLICT DO NOTHING;

INSERT INTO cities (province_id, name, center_location, default_radius_km) VALUES
(1, 'Trelew', ST_SetSRID(ST_MakePoint(-65.30505, -43.24895), 4326)::geography, 15),
(1, 'Rawson', ST_SetSRID(ST_MakePoint(-65.10228, -43.30016), 4326)::geography, 12),
(1, 'Playa Unión', ST_SetSRID(ST_MakePoint(-65.04167, -43.31667), 4326)::geography, 10),
(1, 'Puerto Madryn', ST_SetSRID(ST_MakePoint(-65.03851, -42.76920), 4326)::geography, 20),
(1, 'Gaiman', ST_SetSRID(ST_MakePoint(-65.49298, -43.28974), 4326)::geography, 10)
ON CONFLICT DO NOTHING;
-- ==============================================================================
-- 22. FUNCIONES Y ESTADÍSTICAS PARA SUPER ADMIN Y MODERADORES
-- ==============================================================================

-- A. Función para obtener métricas globales de la plataforma (Super Admin Dashboard)
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos elevados pero valida el rol del usuario
AS $$
DECLARE
    v_caller_role user_role;
    v_stats JSONB;
BEGIN
    -- Validar que quien ejecuta sea admin o moderador
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('admin', 'moderator') THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de moderador o administrador.';
    END IF;

    SELECT json_build_object(
        'total_lost_reports', (SELECT COUNT(*) FROM lost_reports),
        'active_lost_reports', (SELECT COUNT(*) FROM lost_reports WHERE status = 'ACTIVE'),
        'total_found_reports', (SELECT COUNT(*) FROM found_reports),
        'active_found_reports', (SELECT COUNT(*) FROM found_reports WHERE status = 'ACTIVE'),
        'total_sightings', (SELECT COUNT(*) FROM sightings),
        'total_reunited_pets', (SELECT COUNT(*) FROM lost_reports WHERE status = 'REUNITED'),
        'total_users', (SELECT COUNT(*) FROM profiles),
        'total_pending_moderations', (SELECT COUNT(*) FROM moderation_reports WHERE resolved = false),
        'reports_by_city', (
            SELECT json_agg(city_stat) FROM (
                SELECT c.name AS city_name, COUNT(lr.id) AS lost_count
                FROM cities c
                LEFT JOIN lost_reports lr ON lr.city_id = c.id
                GROUP BY c.name
            ) city_stat
        ),
        'recent_activity_last_7_days', (
            SELECT json_build_object(
                'lost_created', (SELECT COUNT(*) FROM lost_reports WHERE created_at >= NOW() - INTERVAL '7 days'),
                'found_created', (SELECT COUNT(*) FROM found_reports WHERE created_at >= NOW() - INTERVAL '7 days'),
                'sightings_created', (SELECT COUNT(*) FROM sightings WHERE created_at >= NOW() - INTERVAL '7 days'),
                'reunited_count', (SELECT COUNT(*) FROM lost_reports WHERE status = 'REUNITED' AND updated_at >= NOW() - INTERVAL '7 days')
            )
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$;

-- B. Función de Moderación: Ocultar o cambiar estado de cualquier publicación
CREATE OR REPLACE FUNCTION admin_set_report_status(
    p_report_type TEXT, -- 'lost' o 'found'
    p_report_id UUID,
    p_new_status report_status,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role user_role;
BEGIN
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('admin', 'moderator') THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren permisos administrativos.';
    END IF;

    IF p_report_type = 'lost' THEN
        UPDATE lost_reports SET status = p_new_status, updated_at = NOW() WHERE id = p_report_id;
    ELSIF p_report_type = 'found' THEN
        UPDATE found_reports SET status = p_new_status, updated_at = NOW() WHERE id = p_report_id;
    ELSE
        RAISE EXCEPTION 'Tipo de reporte inválido';
    END IF;

    -- Registrar la acción en auditoría
    INSERT INTO analytics_events (event_name, metadata)
    VALUES (
        'admin_status_override',
        json_build_object(
            'admin_id', auth.uid(),
            'report_type', p_report_type,
            'report_id', p_report_id,
            'new_status', p_new_status,
            'reason', p_reason
        )
    );

    RETURN true;
END;
$$;

-- C. Función para promover un usuario a Moderador o Admin (Solo Super Admin)
CREATE OR REPLACE FUNCTION admin_set_user_role(
    p_target_user_id UUID,
    p_new_role user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo un admin puede cambiar roles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Solo un Administrador puede asignar roles.';
    END IF;

    UPDATE profiles SET role = p_new_role, updated_at = NOW() WHERE id = p_target_user_id;
END;
$$;

-- D. Políticas RLS Adicionales para que Moderadores y Admins tengan lectura y edición total
DROP POLICY IF EXISTS "Admins Full Access Lost Reports" ON lost_reports;
CREATE POLICY "Admins Full Access Lost Reports" ON lost_reports FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "Admins Full Access Found Reports" ON found_reports;
CREATE POLICY "Admins Full Access Found Reports" ON found_reports FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "Admins Full Access Sightings" ON sightings;
CREATE POLICY "Admins Full Access Sightings" ON sightings FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "Admins Manage Moderation Reports" ON moderation_reports;
CREATE POLICY "Admins Manage Moderation Reports" ON moderation_reports FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')));

