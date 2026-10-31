-- ==============================================================================
-- MIGRACIÓN: 20260909000002_add_contact_fields_to_reports.sql
-- ALMACENAR CONTACTO DIRECTO DE WHATSAPP EN REPORTES PARA NOTIFICACIÓN AUTOMÁTICA
-- ==============================================================================

ALTER TABLE lost_reports ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE lost_reports ADD COLUMN IF NOT EXISTS contact_name TEXT;

ALTER TABLE found_reports ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE found_reports ADD COLUMN IF NOT EXISTS contact_name TEXT;
