-- ==============================================================================
-- MIGRACIÓN: 20261031000001_security_hardening.sql
-- REFUERZO DE SEGURIDAD
--
-- 1. delete_all_reports(): ya no la puede ejecutar el público (antes cualquiera con la
--    clave pública de Supabase podía vaciar la base). Solo la service role (servidor).
-- 2. profiles: el público ya no puede leer los perfiles (tenían teléfono y rol de todos).
--    Cada usuario ve el suyo; moderadores y admins ven todos.
-- 3. Token de edición: columna edit_token_hash en publicaciones. Guarda el hash SHA-256
--    del código secreto que recibe quien publica; sin ese código (o la clave de admin)
--    no se puede marcar como reunida ni borrar una publicación.
-- 4. Storage: límite de 5 MB y solo imágenes en los buckets de fotos (si existen).
--
-- Es seguro correrla más de una vez.
-- ==============================================================================

-- 1. delete_all_reports: solo servidor ------------------------------------------------
REVOKE EXECUTE ON FUNCTION delete_all_reports() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_all_reports() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_all_reports() TO service_role;

-- 2. Perfiles privados --------------------------------------------------------------------
-- Función auxiliar (SECURITY DEFINER) para evitar recursión al consultar profiles desde su propia política
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    );
$$;
REVOKE EXECUTE ON FUNCTION public.is_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
DROP POLICY IF EXISTS "Own Read Profile" ON profiles;
CREATE POLICY "Own Read Profile" ON profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Moderators Read Profiles" ON profiles;
CREATE POLICY "Moderators Read Profiles" ON profiles FOR SELECT
USING (public.is_moderator());

-- 3. Token de edición de publicaciones -------------------------------------------------------
ALTER TABLE lost_reports  ADD COLUMN IF NOT EXISTS edit_token_hash TEXT;
ALTER TABLE found_reports ADD COLUMN IF NOT EXISTS edit_token_hash TEXT;
ALTER TABLE sightings     ADD COLUMN IF NOT EXISTS edit_token_hash TEXT;

-- Solo hashes SHA-256 en hexadecimal (64 caracteres) o vacío para publicaciones viejas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lost_reports_edit_token_hash_format') THEN
        ALTER TABLE lost_reports ADD CONSTRAINT lost_reports_edit_token_hash_format
            CHECK (edit_token_hash IS NULL OR edit_token_hash ~ '^[0-9a-f]{64}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'found_reports_edit_token_hash_format') THEN
        ALTER TABLE found_reports ADD CONSTRAINT found_reports_edit_token_hash_format
            CHECK (edit_token_hash IS NULL OR edit_token_hash ~ '^[0-9a-f]{64}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sightings_edit_token_hash_format') THEN
        ALTER TABLE sightings ADD CONSTRAINT sightings_edit_token_hash_format
            CHECK (edit_token_hash IS NULL OR edit_token_hash ~ '^[0-9a-f]{64}$');
    END IF;
END $$;

-- 4. Límites de Storage (solo si existen el esquema y los buckets) ---------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        UPDATE storage.buckets
        SET file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        WHERE id IN ('pet-photos', 'sighting-photos');
    END IF;
END $$;
