-- ========================================================
-- USH BY USHUAIA - CRM ROLES (admin / vendedor)
-- Fase 2 de seguridad: soporte de múltiples usuarios.
--
-- Requiere que primero se haya ejecutado crm_security_fix.sql
-- (función crm_is_admin() que compara contra el email del dueño).
-- Idempotente: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS.
-- Ejecutar en Supabase SQL Editor UNA sola vez.
-- ========================================================

-- ========================================================
-- 1) Tabla de usuarios del CRM (admin / seller)
--    El email debe coincidir con la cuenta auth.users invitada.
-- ========================================================
CREATE TABLE IF NOT EXISTS public.crm_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed: el dueño (admin). Se re-ejecuta sin duplicar por ON CONFLICT.
INSERT INTO public.crm_users (email, full_name, role)
VALUES ('comercialmayoristas@ushuaiajeans.com.co', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 2) Funciones de rol
-- ========================================================

-- ¿El JWT actual es un vendedor del CRM? (además de admin del dueño)
CREATE OR REPLACE FUNCTION public.crm_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.crm_users
      WHERE lower(email) = lower(auth.jwt() ->> 'email') AND active = TRUE
      LIMIT 1),
    CASE WHEN public.crm_is_admin() THEN 'admin' ELSE NULL END
  );
$$;

-- ID interno (crm_users.id) del usuario autenticado actual
CREATE OR REPLACE FUNCTION public.crm_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.crm_users
   WHERE lower(email) = lower(auth.jwt() ->> 'email')
   LIMIT 1;
$$;

-- ========================================================
-- 3) Asignación de vendedores en pipeline y tareas
-- ========================================================
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON public.crm_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee ON public.crm_tasks(assignee_id);

-- ========================================================
-- 4) Políticas de CRM_USERS
--    SELECT: admin ve todo; cada usuario ve su propia fila.
--    ESCRITURA: solo admin.
-- ========================================================
DROP POLICY IF EXISTS "admin crm_users read"   ON public.crm_users;
DROP POLICY IF EXISTS "admin crm_users insert" ON public.crm_users;
DROP POLICY IF EXISTS "admin crm_users update" ON public.crm_users;
DROP POLICY IF EXISTS "admin crm_users delete" ON public.crm_users;

CREATE POLICY "admin crm_users read"
  ON public.crm_users FOR SELECT TO authenticated
  USING (public.crm_is_admin() OR lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "admin crm_users insert"
  ON public.crm_users FOR INSERT TO authenticated
  WITH CHECK (public.crm_is_admin());

CREATE POLICY "admin crm_users update"
  ON public.crm_users FOR UPDATE TO authenticated
  USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());

CREATE POLICY "admin crm_users delete"
  ON public.crm_users FOR DELETE TO authenticated
  USING (public.crm_is_admin());

-- ========================================================
-- 5) Políticas de pipeline por rol
--    ADMIN: acceso total (hereda de crm_security_fix.sql).
--    VENDEDOR: SELECT + INSERT + UPDATE, sin DELETE.
-- ========================================================

-- ── CRM_COMPANIES ──
DROP POLICY IF EXISTS "admin crm_companies read"  ON public.crm_companies;
DROP POLICY IF EXISTS "admin crm_companies insert" ON public.crm_companies;
DROP POLICY IF EXISTS "admin crm_companies update" ON public.crm_companies;
DROP POLICY IF EXISTS "admin crm_companies delete" ON public.crm_companies;

CREATE POLICY "admin crm_companies read"  ON public.crm_companies FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller crm_companies read" ON public.crm_companies FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_companies insert" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_companies insert" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_companies update" ON public.crm_companies FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_companies update" ON public.crm_companies FOR UPDATE TO authenticated USING (public.crm_user_role() = 'seller') WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_companies delete" ON public.crm_companies FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_CONTACTS ──
DROP POLICY IF EXISTS "admin crm_contacts read"  ON public.crm_contacts;
DROP POLICY IF EXISTS "admin crm_contacts insert" ON public.crm_contacts;
DROP POLICY IF EXISTS "admin crm_contacts update" ON public.crm_contacts;
DROP POLICY IF EXISTS "admin crm_contacts delete" ON public.crm_contacts;

CREATE POLICY "admin crm_contacts read"  ON public.crm_contacts FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller crm_contacts read" ON public.crm_contacts FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_contacts insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_contacts insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_contacts update" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_contacts update" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.crm_user_role() = 'seller') WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_contacts delete" ON public.crm_contacts FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_DEALS ──
DROP POLICY IF EXISTS "admin crm_deals read"  ON public.crm_deals;
DROP POLICY IF EXISTS "admin crm_deals insert" ON public.crm_deals;
DROP POLICY IF EXISTS "admin crm_deals update" ON public.crm_deals;
DROP POLICY IF EXISTS "admin crm_deals delete" ON public.crm_deals;

CREATE POLICY "admin crm_deals read"  ON public.crm_deals FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller crm_deals read" ON public.crm_deals FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_deals insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_deals insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_deals update" ON public.crm_deals FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_deals update" ON public.crm_deals FOR UPDATE TO authenticated USING (public.crm_user_role() = 'seller') WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_deals delete" ON public.crm_deals FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_TASKS ──
DROP POLICY IF EXISTS "admin crm_tasks read"  ON public.crm_tasks;
DROP POLICY IF EXISTS "admin crm_tasks insert" ON public.crm_tasks;
DROP POLICY IF EXISTS "admin crm_tasks update" ON public.crm_tasks;
DROP POLICY IF EXISTS "admin crm_tasks delete" ON public.crm_tasks;

CREATE POLICY "admin crm_tasks read"  ON public.crm_tasks FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller crm_tasks read" ON public.crm_tasks FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_tasks insert" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_tasks insert" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_tasks update" ON public.crm_tasks FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_tasks update" ON public.crm_tasks FOR UPDATE TO authenticated USING (public.crm_user_role() = 'seller') WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_tasks delete" ON public.crm_tasks FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_ACTIVITIES ──
DROP POLICY IF EXISTS "admin crm_activities read"  ON public.crm_activities;
DROP POLICY IF EXISTS "admin crm_activities insert" ON public.crm_activities;
DROP POLICY IF EXISTS "admin crm_activities update" ON public.crm_activities;
DROP POLICY IF EXISTS "admin crm_activities delete" ON public.crm_activities;

CREATE POLICY "admin crm_activities read"  ON public.crm_activities FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller crm_activities read" ON public.crm_activities FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_activities insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_activities insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_activities update" ON public.crm_activities FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "seller crm_activities update" ON public.crm_activities FOR UPDATE TO authenticated USING (public.crm_user_role() = 'seller') WITH CHECK (public.crm_user_role() = 'seller');
CREATE POLICY "admin crm_activities delete" ON public.crm_activities FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ========================================================
-- 6) Políticas de WhatsApp por rol
--    VENDEDOR: SOLO LECTURA de chats y mensajes (ver contacto).
--    SESIONES y ESCRITURA: solo admin.
-- ========================================================

-- ── CRM_WA_SESSIONS (solo admin) ──
DROP POLICY IF EXISTS "admin wa_sessions read"  ON public.crm_wa_sessions;
DROP POLICY IF EXISTS "admin wa_sessions insert" ON public.crm_wa_sessions;
DROP POLICY IF EXISTS "admin wa_sessions update" ON public.crm_wa_sessions;
DROP POLICY IF EXISTS "admin wa_sessions delete" ON public.crm_wa_sessions;

CREATE POLICY "admin wa_sessions read"  ON public.crm_wa_sessions FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "admin wa_sessions insert" ON public.crm_wa_sessions FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_sessions update" ON public.crm_wa_sessions FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_sessions delete" ON public.crm_wa_sessions FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_WA_CHATS ──
DROP POLICY IF EXISTS "admin wa_chats read"  ON public.crm_wa_chats;
DROP POLICY IF EXISTS "admin wa_chats insert" ON public.crm_wa_chats;
DROP POLICY IF EXISTS "admin wa_chats update" ON public.crm_wa_chats;
DROP POLICY IF EXISTS "admin wa_chats delete" ON public.crm_wa_chats;

CREATE POLICY "admin wa_chats read"  ON public.crm_wa_chats FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller wa_chats read" ON public.crm_wa_chats FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin wa_chats insert" ON public.crm_wa_chats FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_chats update" ON public.crm_wa_chats FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_chats delete" ON public.crm_wa_chats FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ── CRM_WA_MESSAGES ──
DROP POLICY IF EXISTS "admin wa_messages read"  ON public.crm_wa_messages;
DROP POLICY IF EXISTS "admin wa_messages insert" ON public.crm_wa_messages;
DROP POLICY IF EXISTS "admin wa_messages update" ON public.crm_wa_messages;
DROP POLICY IF EXISTS "admin wa_messages delete" ON public.crm_wa_messages;

CREATE POLICY "admin wa_messages read"  ON public.crm_wa_messages FOR SELECT TO authenticated USING (public.crm_is_admin());
CREATE POLICY "seller wa_messages read" ON public.crm_wa_messages FOR SELECT TO authenticated USING (public.crm_user_role() = 'seller');
CREATE POLICY "admin wa_messages insert" ON public.crm_wa_messages FOR INSERT TO authenticated WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_messages update" ON public.crm_wa_messages FOR UPDATE TO authenticated USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY "admin wa_messages delete" ON public.crm_wa_messages FOR DELETE TO authenticated USING (public.crm_is_admin());

-- ========================================================
-- 7) Verificación rápida (políticas vigentes)
-- ========================================================
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'crm\_%'
ORDER BY tablename, cmd;