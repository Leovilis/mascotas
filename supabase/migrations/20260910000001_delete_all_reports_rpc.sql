-- ==============================================================================
-- MIGRACIÓN: 20260910000001_delete_all_reports_rpc.sql
-- FUNCIÓN SUPER ADMIN PARA VACIAR COMPLETAMENTE TODAS LAS PUBLICACIONES
-- ==============================================================================

-- 1. Crear función RPC con SECURITY DEFINER (para saltear RLS y borrar todo en cascada)
CREATE OR REPLACE FUNCTION delete_all_reports()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_lost integer := 0;
    deleted_found integer := 0;
    deleted_sightings integer := 0;
    deleted_pets integer := 0;
BEGIN
    -- 1. Eliminar tablas dependientes secundarias
    DELETE FROM matches;
    DELETE FROM notifications;
    DELETE FROM qr_codes;
    DELETE FROM moderation_reports;
    
    -- 2. Eliminar avistamientos
    DELETE FROM sightings;
    GET DIAGNOSTICS deleted_sightings = ROW_COUNT;

    -- 3. Eliminar reportes de mascotas perdidas
    DELETE FROM lost_reports;
    GET DIAGNOSTICS deleted_lost = ROW_COUNT;

    -- 4. Eliminar reportes de mascotas encontradas
    DELETE FROM found_reports;
    GET DIAGNOSTICS deleted_found = ROW_COUNT;

    -- 5. Eliminar todas las mascotas registradas
    DELETE FROM pets;
    GET DIAGNOSTICS deleted_pets = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'message', 'Todas las publicaciones y mascotas fueron eliminadas de la base de datos.',
        'deleted_lost', deleted_lost,
        'deleted_found', deleted_found,
        'deleted_sightings', deleted_sightings,
        'deleted_pets', deleted_pets
    );
END;
$$;

-- 2. Conceder permisos de ejecución para el cliente web
GRANT EXECUTE ON FUNCTION delete_all_reports() TO anon, authenticated, service_role;

-- 3. Habilitar políticas de DELETE para eliminación directa en todas las tablas
DROP POLICY IF EXISTS "Public Delete Sightings" ON sightings;
CREATE POLICY "Public Delete Sightings" ON sightings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete Matches" ON matches;
CREATE POLICY "Public Delete Matches" ON matches FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete Notifications" ON notifications;
CREATE POLICY "Public Delete Notifications" ON notifications FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete Moderation Reports" ON moderation_reports;
CREATE POLICY "Public Delete Moderation Reports" ON moderation_reports FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete QR Codes" ON qr_codes;
CREATE POLICY "Public Delete QR Codes" ON qr_codes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete Lost Reports" ON lost_reports;
CREATE POLICY "Public Delete Lost Reports" ON lost_reports FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete Found Reports" ON found_reports;
CREATE POLICY "Public Delete Found Reports" ON found_reports FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Delete Pets" ON pets;
CREATE POLICY "Public Delete Pets" ON pets FOR DELETE USING (true);
