-- ========================================================
-- USH BY USHUAIA - CRM SEGURIDAD RLS (SOLO ADMIN)
-- Fase 1 de seguridad: cierra el hueco entre los archivos
-- crm_schema.sql / crm_whatsapp_schema.sql, donde todas las
-- políticas decían "TO authenticated USING (true)".
--
-- HOY: cualquier usuario autenticado en Supabase puede leer y
--      escribir en las 8 tablas del CRM.
-- DESPUÉS: solo la cuenta del administrador definida en
--      NEXT_PUBLIC_ADMIN_EMAIL puede leer/escribir.
--
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ========================================================

-- ========================================================
-- 1) Función helper: ¿el JWT actual es el admin?
--    (el email viaja firmado dentro del JWT; aquí se compara
--     contra el correo del dueño definido en NEXT_PUBLIC_ADMIN_EMAIL)
-- ========================================================
CREATE OR REPLACE FUNCTION public.crm_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'comercialmayoristas@ushuaiajeans.com.co';
$$;

-- ========================================================
-- 2) Tablas del CRM de clientes (5)
-- ========================================================

-- ── CRM_COMPANIES ──
DROP POLICY IF EXISTS "auth crm_companies read"  ON public.crm_companies;
DROP POLICY IF EXISTS "auth crm_companies insert" ON public.crm_companies;
DROP POLICY IF EXISTS "auth crm_companies update" ON public.crm_companies;
DROP POLICY IF EXISTS "auth crm_companies delete" ON public.crm_companies;

CREATE POLICY "admin crm_companies read"   ON public.crm_companies FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin crm_companies insert" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_companies update" ON public.crm_companies FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_companies delete" ON public.crm_companies FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_CONTACTS ──
DROP POLICY IF EXISTS "auth crm_contacts read"  ON public.crm_contacts;
DROP POLICY IF EXISTS "auth crm_contacts insert" ON public.crm_contacts;
DROP POLICY IF EXISTS "auth crm_contacts update" ON public.crm_contacts;
DROP POLICY IF EXISTS "auth crm_contacts delete" ON public.crm_contacts;

CREATE POLICY "admin crm_contacts read"   ON public.crm_contacts FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin crm_contacts insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_contacts update" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_contacts delete" ON public.crm_contacts FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_DEALS ──
DROP POLICY IF EXISTS "auth crm_deals read"  ON public.crm_deals;
DROP POLICY IF EXISTS "auth crm_deals insert" ON public.crm_deals;
DROP POLICY IF EXISTS "auth crm_deals update" ON public.crm_deals;
DROP POLICY IF EXISTS "auth crm_deals delete" ON public.crm_deals;

CREATE POLICY "admin crm_deals read"   ON public.crm_deals FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin crm_deals insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_deals update" ON public.crm_deals FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_deals delete" ON public.crm_deals FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_TASKS ──
DROP POLICY IF EXISTS "auth crm_tasks read"  ON public.crm_tasks;
DROP POLICY IF EXISTS "auth crm_tasks insert" ON public.crm_tasks;
DROP POLICY IF EXISTS "auth crm_tasks update" ON public.crm_tasks;
DROP POLICY IF EXISTS "auth crm_tasks delete" ON public.crm_tasks;

CREATE POLICY "admin crm_tasks read"   ON public.crm_tasks FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin crm_tasks insert" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_tasks update" ON public.crm_tasks FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_tasks delete" ON public.crm_tasks FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_ACTIVITIES ──
DROP POLICY IF EXISTS "auth crm_activities read"  ON public.crm_activities;
DROP POLICY IF EXISTS "auth crm_activities insert" ON public.crm_activities;
DROP POLICY IF EXISTS "auth crm_activities update" ON public.crm_activities;
DROP POLICY IF EXISTS "auth crm_activities delete" ON public.crm_activities;

CREATE POLICY "admin crm_activities read"   ON public.crm_activities FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin crm_activities insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_activities update" ON public.crm_activities FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin crm_activities delete" ON public.crm_activities FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ========================================================
-- 3) Tablas de WhatsApp (3)
-- ========================================================

-- ── CRM_WA_SESSIONS ──
DROP POLICY IF EXISTS "auth wa_sessions read"   ON public.crm_wa_sessions;
DROP POLICY IF EXISTS "auth wa_sessions insert"  ON public.crm_wa_sessions;
DROP POLICY IF EXISTS "auth wa_sessions update"  ON public.crm_wa_sessions;
DROP POLICY IF EXISTS "auth wa_sessions delete"  ON public.crm_wa_sessions;

CREATE POLICY "admin wa_sessions read"   ON public.crm_wa_sessions FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin wa_sessions insert"  ON public.crm_wa_sessions FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_sessions update"  ON public.crm_wa_sessions FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_sessions delete"  ON public.crm_wa_sessions FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_WA_CHATS ──
DROP POLICY IF EXISTS "auth wa_chats read"   ON public.crm_wa_chats;
DROP POLICY IF EXISTS "auth wa_chats insert"  ON public.crm_wa_chats;
DROP POLICY IF EXISTS "auth wa_chats update"  ON public.crm_wa_chats;
DROP POLICY IF EXISTS "auth wa_chats delete"  ON public.crm_wa_chats;

CREATE POLICY "admin wa_chats read"   ON public.crm_wa_chats FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin wa_chats insert"  ON public.crm_wa_chats FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_chats update"  ON public.crm_wa_chats FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_chats delete"  ON public.crm_wa_chats FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_WA_MESSAGES ──
DROP POLICY IF EXISTS "auth wa_messages read"   ON public.crm_wa_messages;
DROP POLICY IF EXISTS "auth wa_messages insert"  ON public.crm_wa_messages;
DROP POLICY IF EXISTS "auth wa_messages update"  ON public.crm_wa_messages;
DROP POLICY IF EXISTS "auth wa_messages delete"  ON public.crm_wa_messages;

CREATE POLICY "admin wa_messages read"   ON public.crm_wa_messages FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin wa_messages insert"  ON public.crm_wa_messages FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_messages update"  ON public.crm_wa_messages FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_messages delete"  ON public.crm_wa_messages FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ========================================================
-- 4) Verificación rápida (mostrará las políticas vigentes)
-- ========================================================
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'crm\_%'
ORDER BY tablename, cmd;