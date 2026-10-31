-- ==============================================================================
-- MIGRACIÓN: 20261031000002_report_contacts.sql
-- EMAIL DE CONTACTO PRIVADO DE LAS PUBLICACIONES
--
-- El email que deja quien publica se guarda en una tabla aparte, PRIVADA:
-- no se puede leer ni escribir con la clave pública (solo el servidor, con la service role).
-- Se usa para: enviar el código de gestión, recuperarlo si se pierde,
-- y avisar a la familia cuando alguien reporta un avistamiento.
-- Es seguro correrla más de una vez.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS report_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('lost', 'found', 'sighting')),
    report_id UUID NOT NULL,
    email TEXT NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (report_type, report_id)
);

CREATE INDEX IF NOT EXISTS idx_report_contacts_email ON report_contacts (lower(email));

ALTER TABLE report_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON report_contacts FROM anon, authenticated;

-- Evita avisar dos veces a la familia por el mismo avistamiento
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS owner_notified_at TIMESTAMPTZ;
