-- ==============================================================================
-- MIGRACIÓN: 20261101000001_adoption.sql
-- ADOPCIÓN RESPONSABLE (integración de "Adoptá Jujuy" en Mascotas Argentinas)
--
-- * Asociaciones / refugios: se registran solas pero quedan PENDIENTES hasta que el
--   administrador las aprueba en /admin/asociaciones. Solo las aprobadas se ven al público.
-- * Adoptantes: cuenta de Supabase Auth + ficha privada (DNI, domicilio, teléfono).
-- * Animales en adopción, vacunas, controles post-adopción, solicitudes y adopciones
--   (con ficha y estado de inscripción en el registro oficial, si la provincia lo tiene).
--
-- Seguridad: todas las tablas tienen RLS y SIN acceso para anon/authenticated.
-- La app lee y escribe solo desde el servidor (service role), verificando el usuario.
-- Es seguro correrla más de una vez.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS adoption_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    region_slug TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    city TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT NOT NULL,
    instagram TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    admin_notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_adoption_associations_owner ON adoption_associations (owner_id);
CREATE INDEX IF NOT EXISTS idx_adoption_associations_region ON adoption_associations (region_slug, status);

-- Ficha privada del adoptante (solo la ve la asociación a la que le pidió adoptar)
CREATE TABLE IF NOT EXISTS adopter_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dni TEXT NOT NULL UNIQUE CHECK (dni ~ '^[0-9]{7,8}$'),
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    region_slug TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adoption_animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES adoption_associations(id) ON DELETE CASCADE,
    region_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
    breed TEXT,
    sex TEXT NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
    size TEXT CHECK (size IN ('small', 'medium', 'large')),
    age TEXT,
    description TEXT,
    neutered BOOLEAN NOT NULL DEFAULT FALSE,
    photos TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'ADOPTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adoption_animals_region ON adoption_animals (region_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_animals_association ON adoption_animals (association_id);

CREATE TABLE IF NOT EXISTS adoption_vaccines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES adoption_animals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    applied_on DATE NOT NULL,
    next_due DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adoption_vaccines_animal ON adoption_vaccines (animal_id);

CREATE TABLE IF NOT EXISTS adoption_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES adoption_animals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adoption_followups_animal ON adoption_followups (animal_id);

CREATE TABLE IF NOT EXISTS adoption_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES adoption_animals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REJECTED', 'APPROVED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (animal_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_adoption_requests_user ON adoption_requests (user_id);

CREATE TABLE IF NOT EXISTS adoptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL UNIQUE REFERENCES adoption_animals(id) ON DELETE CASCADE,
    adopter_id UUID NOT NULL REFERENCES auth.users(id),
    adopted_on DATE NOT NULL DEFAULT CURRENT_DATE,
    record_code TEXT NOT NULL UNIQUE,
    registry_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (registry_status IN ('PENDING', 'REGISTERED', 'NOT_APPLICABLE')),
    registry_number TEXT,
    registry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at automático (la función existe desde el esquema inicial)
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['adoption_associations', 'adopter_profiles', 'adoption_animals'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_%s_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER tr_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- RLS sin políticas públicas: solo la service role (servidor) accede
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['adoption_associations', 'adopter_profiles', 'adoption_animals', 'adoption_vaccines',
                             'adoption_followups', 'adoption_requests', 'adoptions'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    END LOOP;
END $$;
