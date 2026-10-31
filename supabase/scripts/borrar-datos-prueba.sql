-- ==============================================================================
-- BORRAR DATOS DE PRUEBA
-- Vacía publicaciones, mascotas, avistamientos y todo lo que depende de ellos.
-- NO toca: provincias, ciudades, usuarios/perfiles ni Comercios Amigos
-- (para borrar los comercios, descomentá la línea marcada abajo).
--
-- Cómo usarlo: Supabase → SQL Editor → pegar todo → Run.
-- ¡No se puede deshacer! Usalo solo antes de lanzar o en una base de prueba.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    t TEXT;
    n BIGINT;
BEGIN
    -- Orden: primero lo que depende, después las tablas principales
    FOREACH t IN ARRAY ARRAY[
        'matches', 'notifications', 'qr_codes', 'moderation_reports',
        'report_contacts', 'rate_limit_events',
        'sightings', 'lost_reports', 'found_reports', 'pets'
        -- , 'partner_businesses'   -- <- descomentá para borrar también los Comercios Amigos
    ]
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('DELETE FROM public.%I', t);
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE '% filas borradas de %', n, t;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- Verificación: todo tendría que dar 0
SELECT
    (SELECT COUNT(*) FROM lost_reports)  AS perdidas,
    (SELECT COUNT(*) FROM found_reports) AS encontradas,
    (SELECT COUNT(*) FROM sightings)     AS avistamientos,
    (SELECT COUNT(*) FROM pets)          AS mascotas;
