'use client';

import React, { useState, useEffect } from 'react';
import { supabase, ADMIN_EMAIL } from '@/lib/supabase';
import Logo from '@/components/Logo';
import {
  Lock, LogOut, ShieldAlert, Key, LayoutDashboard, Users,
  Building2, Target, ListTodo, StickyNote, MessageCircle, X,
} from 'lucide-react';
import DashboardSection from '@/components/crm/DashboardSection';
import ContactSection from '@/components/crm/ContactSection';
import CompaniesSection from '@/components/crm/CompaniesSection';
import PipelineSection from '@/components/crm/PipelineSection';
import TaskSection from '@/components/crm/TaskSection';
import ActivitySection from '@/components/crm/ActivitySection';
import { WhatsappSection, waSectionMeta } from '@/components/crm/WhatsappSection';

type CrmTab = 'panel' | 'contacts' | 'companies' | 'pipeline' | 'tasks' | 'activity' | 'whatsapp';
type CrmRole = 'admin' | 'seller';

const TABS: { key: CrmTab; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { key: 'panel',      label: 'Panel de Control',    icon: LayoutDashboard },
  { key: 'contacts',   label: 'Contactos',           icon: Users },
  { key: 'companies',  label: 'Empresas',            icon: Building2 },
  { key: 'pipeline',   label: 'Pipeline de Ventas',  icon: Target },
  { key: 'tasks',      label: 'Tareas',              icon: ListTodo },
  { key: 'activity',   label: 'Línea de Tiempo',     icon: StickyNote },
  { key: 'whatsapp',   label: 'WhatsApp',            icon: MessageCircle },
];

export default function CrmClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasNonAdminSession, setHasNonAdminSession] = useState(false);
  const [crmRole, setCrmRole] = useState<CrmRole>('admin');
  const [configMissing, setConfigMissing] = useState(false);
  const [loginEmail, setLoginEmail] = useState(ADMIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<CrmTab>('panel');

  const resolveRole = async (email: string): Promise<CrmRole | null> => {
    try {
      const { data, error } = await supabase
        .from('crm_users')
        .select('role, active')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (!error && data) {
        if (data.active === false) return null;
        return data.role === 'admin' ? 'admin' : 'seller';
      }
      // Compatibilidad: si aún no hay fila, el ADMIN_EMAIL sigue siendo admin.
      return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : null;
    } catch (e) {
      return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : null;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setConfigMissing(true);
      setIsAuthenticated(false);
      return;
    }
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        const role = sessionUser?.email ? await resolveRole(sessionUser.email) : null;
        setIsAuthenticated(role !== null);
        setCrmRole(role ?? 'admin');
        setHasNonAdminSession(!!sessionUser && role === null);
      } catch (e) {
        setIsAuthenticated(false);
        setHasNonAdminSession(false);
      }
    };
    checkAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user;
      const role = sessionUser?.email ? await resolveRole(sessionUser.email) : null;
      setIsAuthenticated(role !== null);
      setCrmRole(role ?? 'admin');
      setHasNonAdminSession(!!sessionUser && role === null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (configMissing) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full p-8 border border-gray-200 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-ush-navy text-white flex items-center justify-center mx-auto shadow-md">
            <Lock size={22} className="text-ush-pink" />
          </div>
          <h1 className="text-xl font-black text-ush-navy uppercase tracking-wide text-center">Configuración incompleta</h1>
          <p className="text-xs text-neutral-600 font-light text-center">
            El CRM necesita las variables de entorno de Supabase para funcionar. Copia <code className="bg-neutral-100 px-1">.env.example</code> a <code className="bg-neutral-100 px-1">.env.local</code> y pega tu URL y tu anon key de Supabase (Supabase → Project Settings → API Keys).
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (!error) {
        const sessionUser = (await supabase.auth.getSession()).data.session?.user;
        const role = sessionUser?.email ? await resolveRole(sessionUser.email) : null;
        if (role !== null) {
          setIsAuthenticated(true);
          setCrmRole(role);
          setHasNonAdminSession(false);
        } else {
          setHasNonAdminSession(true);
          setIsAuthenticated(false);
          setLoginError('Esta cuenta no tiene permisos de acceso al CRM.');
        }
      } else {
        setLoginError('Credenciales incorrectas. Verifique el correo o la contraseña.');
      }
    } catch (err) {
      setLoginError('Error de conexión con el servidor de autenticación.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut();
    } catch (e) {}
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    if (hasNonAdminSession) {
      return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 border border-gray-200 shadow-2xl space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-ush-navy text-white flex items-center justify-center mx-auto shadow-md">
              <ShieldAlert size={22} className="text-ush-pink" />
            </div>
            <h1 className="text-xl font-black text-ush-navy uppercase tracking-wide">Acceso Restringido</h1>
            <p className="text-xs text-neutral-500 font-light">
              Tu cuenta no está autorizada para ingresar al CRM. Solicita acceso al administrador.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 border border-gray-200 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-ush-navy text-white flex items-center justify-center mx-auto shadow-md">
              <Lock size={22} className="text-ush-pink" />
            </div>
            <h1 className="text-xl font-black text-ush-navy uppercase tracking-wide">CRM Ush By Ushuaia</h1>
            <p className="text-xs text-neutral-500 font-light">
              Ingresa tus credenciales autorizadas para gestionar contactos, oportunidades, tareas y seguimiento.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center">{loginError}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder={ADMIN_EMAIL}
                className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-ush-pink font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Contraseña de Seguridad *</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-ush-pink"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-ush-navy text-white font-bold py-3.5 px-4 text-xs uppercase tracking-widest hover:bg-ush-pink transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Key size={16} /> Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!supabase) return null;

  return (
    <div className="min-h-screen bg-neutral-100 pb-16">
      <header className="bg-[#1b2333] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="text-xs font-bold uppercase tracking-widest bg-[#d88193] text-white px-2.5 py-1">CRM Comercial</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-1 ${crmRole === 'admin' ? 'bg-[#d88193]/20 text-[#d88193]' : 'bg-white/10 text-neutral-300'}`}>
              {crmRole === 'admin' ? 'Administrador' : 'Vendedor'}
            </span>
            <button onClick={handleLogout} className="text-xs text-rose-300 hover:text-rose-100 flex items-center gap-1 font-bold border-l border-neutral-700 pl-4">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#1b2333] uppercase tracking-tight">CRM Comercial</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Gestiona contactos, empresas, oportunidades y seguimiento de tus clientes mayoristas.
          </p>
        </div>

        <div className="flex items-center gap-2 border-b border-gray-200 bg-white p-2 mb-6 shadow-sm overflow-x-auto">
          {TABS.filter((tab) => crmRole === 'admin' || tab.key !== 'whatsapp').map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key ? 'bg-[#1b2333] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon size={14} className={activeTab === tab.key ? 'text-[#d88193]' : 'text-neutral-400'} /> {tab.label}
              </button>
            );
          })}
          <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] text-neutral-400">
            <button onClick={() => setActiveTab('panel')} className="p-1.5 border border-gray-300 text-neutral-500 hover:bg-neutral-50" title="Cerrar tab actual y volver al panel">
              <X size={12} />
            </button>
          </div>
        </div>

        {activeTab === 'panel' && <DashboardSection />}
        {activeTab === 'contacts' && <ContactSection userRole={crmRole} />}
        {activeTab === 'companies' && <CompaniesSection userRole={crmRole} />}
        {activeTab === 'pipeline' && <PipelineSection userRole={crmRole} />}
        {activeTab === 'tasks' && <TaskSection userRole={crmRole} />}
        {activeTab === 'activity' && <ActivitySection userRole={crmRole} />}
        {activeTab === 'whatsapp' && crmRole === 'admin' && <WhatsappSection />}
      </div>
    </div>
  );
}