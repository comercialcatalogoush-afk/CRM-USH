-- ========================================================
-- USH BY USHUAIA - CRM (nivel Bitrix24 / HubSpot)
-- Almacenamiento: plan gratuito de Supabase (PostgreSQL + RLS)
-- Ejecutar en Supabase SQL Editor UNA sola vez.
-- ========================================================

-- Extensión para uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── EMPRESAS ──
CREATE TABLE IF NOT EXISTS public.crm_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nit TEXT,
    industry TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── CONTACTOS ──
CREATE TABLE IF NOT EXISTS public.crm_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    city TEXT,
    company TEXT,
    company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── OPORTUNIDADES (Pipeline de ventas) ──
CREATE TABLE IF NOT EXISTS public.crm_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value_cop NUMERIC(12,2) DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'new',
    probability INTEGER DEFAULT 10,
    notes TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── TAREAS / RECORDATORIOS ──
CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMP WITH TIME ZONE,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ── LÍNEA DE TIEMPO (actividades por contacto / oportunidad) ──
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'nota',
    subject TEXT NOT NULL DEFAULT '',
    content TEXT,
    happened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── ÍNDICES ──
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON public.crm_companies(name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON public.crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_whatsapp ON public.crm_contacts(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON public.crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON public.crm_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_deal ON public.crm_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON public.crm_tasks(due_at) WHERE done = FALSE;
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities(contact_id);

-- ── RLS (solo admin autenticado; los visitantes no ven nada del CRM) ──
ALTER TABLE public.crm_companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- empresas
CREATE POLICY "auth crm_companies read"  ON public.crm_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth crm_companies insert" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth crm_companies update" ON public.crm_companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth crm_companies delete" ON public.crm_companies FOR DELETE TO authenticated USING (true);

-- contactos
CREATE POLICY "auth crm_contacts read"  ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth crm_contacts insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth crm_contacts update" ON public.crm_contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth crm_contacts delete" ON public.crm_contacts FOR DELETE TO authenticated USING (true);

-- oportunidades
CREATE POLICY "auth crm_deals read"  ON public.crm_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth crm_deals insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth crm_deals update" ON public.crm_deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth crm_deals delete" ON public.crm_deals FOR DELETE TO authenticated USING (true);

-- tareas
CREATE POLICY "auth crm_tasks read"  ON public.crm_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth crm_tasks insert" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth crm_tasks update" ON public.crm_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth crm_tasks delete" ON public.crm_tasks FOR DELETE TO authenticated USING (true);

-- actividades
CREATE POLICY "auth crm_activities read"  ON public.crm_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth crm_activities insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth crm_activities update" ON public.crm_activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth crm_activities delete" ON public.crm_activities FOR DELETE TO authenticated USING (true);