-- ========================================================
-- USH BY USHUAIA - CRM WHATSAPP SYNC - MEJORAS FASE 2
-- Cola de salida (envío desde el CRM) + updated_at automático.
-- Idempotente: se puede ejecutar sobre la fase 1 sin romper nada.
-- ========================================================

-- 1. Cola de salida: estado de los mensajes que el CRM envía
ALTER TABLE public.crm_wa_messages ADD COLUMN IF NOT EXISTS outgoing_status TEXT; -- queued | sending | sent | failed
ALTER TABLE public.crm_wa_messages ADD COLUMN IF NOT EXISTS error TEXT;

-- 2. Índice para que el servicio lea rápido la cola de salida
CREATE INDEX IF NOT EXISTS idx_wa_messages_outgoing ON public.crm_wa_messages(outgoing_status) WHERE outgoing_status IN ('queued', 'sending');

-- 3. Índice para búsqueda de un chat por teléfono (emparejado de contactos)
CREATE INDEX IF NOT EXISTS idx_wa_chats_jid ON public.crm_wa_chats(jid);

-- 4. updated_at automático en las 3 tablas
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wa_sessions_updated ON public.crm_wa_sessions;
CREATE TRIGGER trg_wa_sessions_updated
    BEFORE UPDATE ON public.crm_wa_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_wa_chats_updated ON public.crm_wa_chats;
CREATE TRIGGER trg_wa_chats_updated
    BEFORE UPDATE ON public.crm_wa_chats
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Verificación final
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'crm_wa_messages'
    ) THEN
        RAISE EXCEPTION 'crm_wa_messages no existe: ejecute primero crm_whatsapp_schema.sql';
    END IF;
END $$;