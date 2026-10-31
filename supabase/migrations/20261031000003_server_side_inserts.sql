-- ==============================================================================
-- MIGRACIÓN: 20261031000003_server_side_inserts.sql
-- CAPTCHA + LÍMITE DE PUBLICACIONES
--
-- 1. Las publicaciones (mascota perdida/encontrada y avistamientos) ahora se crean
--    desde el servidor (/api/reports/create), que verifica el captcha de Cloudflare
--    Turnstile y limita cuántas publica cada persona. Por eso se quitan los permisos
--    de INSERT directo del público sobre pets, lost_reports, found_reports y sightings:
--    sin esto, un bot podría saltear el captcha usando la clave pública de Supabase.
-- 2. Tabla rate_limit_events: registro de envíos por IP (hasheada) para el límite.
-- 3. AGUJERO GRAVE: una migración vieja (delete_all_reports_rpc) dejó políticas
--    "Public Delete ..." con USING (true): cualquiera con la clave pública podía borrar
--    publicaciones, mascotas, denuncias, etc. directo contra Supabase. Se eliminan.
--    Los borrados legítimos ya pasan por el servidor (código de gestión o clave admin).
--
-- IMPORTANTE: después de correrla, la app necesita SUPABASE_SERVICE_ROLE_KEY
-- configurada (en .env y en Vercel) para poder publicar.
-- Es seguro correrla más de una vez.
-- ==============================================================================

-- 1. Sacar todas las políticas de INSERT de esas tablas (cualquiera sea su nombre).
--    Las de moderadores ("Admins Full Access ...") quedan; igual el REVOKE impide insertar.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('pets', 'lost_reports', 'found_reports', 'sightings')
          AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Política eliminada: % en %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

REVOKE INSERT ON pets, lost_reports, found_reports, sightings FROM anon, authenticated;

-- 2. Límite de envíos por IP --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_events (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_time ON rate_limit_events (key, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limit_events FROM anon, authenticated;

-- Limpieza: borra registros de más de 2 días (se puede llamar desde un cron o a mano)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH d AS (DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '2 days' RETURNING 1)
    SELECT COUNT(*)::INTEGER FROM d;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_events() TO service_role;

-- 3. Borrados públicos: fuera ------------------------------------------------------------
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND cmd = 'DELETE'
          AND policyname LIKE 'Public Delete %'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Política eliminada: % en %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['pets', 'lost_reports', 'found_reports', 'sightings', 'matches',
                             'moderation_reports', 'notifications', 'qr_codes']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('REVOKE DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
        END IF;
    END LOOP;
END $$;
