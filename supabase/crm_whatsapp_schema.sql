-- ========================================================
-- USH BY USHUAIA - CRM WHATSAPP SYNC (QR como WhatsApp Web)
-- Fase 1: sesión vinculada, chats y mensajes sincronizados.
-- Ejecutar en Supabase SQL Editor UNA sola vez (idempotente).
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── SESIÓN (device vinculado por QR) ──
CREATE TABLE IF NOT EXISTS public.crm_wa_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name TEXT NOT NULL DEFAULT 'WhatsApp Ush CRM',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected | connecting | paired | syncing
    qr_secret TEXT,                              -- payload del QR a escanear (solo mientras connecting)
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── CHATS (conversaciones sincronizadas) ──
CREATE TABLE IF NOT EXISTS public.crm_wa_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jid TEXT UNIQUE NOT NULL,                    -- 57301xxxxxxx@s.whatsapp.net
    name TEXT,
    phone TEXT,
    contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
    unread_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── MENSAJES ──
CREATE TABLE IF NOT EXISTS public.crm_wa_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_jid TEXT NOT NULL,
    message_id TEXT UNIQUE,                      -- id real del mensaje para evitar duplicados
    sender_jid TEXT,
    content TEXT,
    media_type TEXT,
    media_url TEXT,
    filename TEXT,
    is_from_me BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON public.crm_wa_messages(chat_jid);
CREATE INDEX IF NOT EXISTS idx_wa_messages_ts   ON public.crm_wa_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_wa_chats_phone   ON public.crm_wa_chats(phone);

-- ── RLS (solo admin autenticado) ──
ALTER TABLE public.crm_wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_wa_chats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_wa_messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth wa_sessions read"  ON public.crm_wa_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth wa_sessions insert" ON public.crm_wa_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth wa_sessions update" ON public.crm_wa_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth wa_sessions delete" ON public.crm_wa_sessions FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth wa_chats read"  ON public.crm_wa_chats FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth wa_chats insert" ON public.crm_wa_chats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth wa_chats update" ON public.crm_wa_chats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth wa_chats delete" ON public.crm_wa_chats FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth wa_messages read"  ON public.crm_wa_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth wa_messages insert" ON public.crm_wa_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth wa_messages update" ON public.crm_wa_messages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth wa_messages delete" ON public.crm_wa_messages FOR DELETE TO authenticated USING (true);