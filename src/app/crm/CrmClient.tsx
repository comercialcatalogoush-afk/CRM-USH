'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, ADMIN_EMAIL } from '@/lib/supabase';
import {
  LayoutDashboard, Users, Building2, Target, ListTodo, StickyNote,
  MessageCircle, LogOut, Lock, ChevronDown, ChevronRight, Bell,
  Search, Settings, HelpCircle, Menu, X, Layers, Mail, TrendingUp,
  UserPlus, BarChart3, Zap,
} from 'lucide-react';
import DashboardSection from '@/components/crm/DashboardSection';
import ContactSection from '@/components/crm/ContactSection';
import CompaniesSection from '@/components/crm/CompaniesSection';
import PipelineSection from '@/components/crm/PipelineSection';
import TaskSection from '@/components/crm/TaskSection';
import ActivitySection from '@/components/crm/ActivitySection';
import { WhatsappSection } from '@/components/crm/WhatsappSection';
import SegmentosSection from '@/components/crm/SegmentosSection';
import MarketingSection from '@/components/crm/MarketingSection';
import ProspectsSection from '@/components/crm/ProspectsSection';

type CrmTab = 'panel' | 'contacts' | 'companies' | 'pipeline' | 'tasks' | 'activity' | 'whatsapp' | 'segments' | 'marketing' | 'prospects';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { key: 'panel' as CrmTab, label: 'Inicio', icon: LayoutDashboard },
    ],
  },
  {
    label: 'CRM',
    items: [
      { key: 'contacts' as CrmTab, label: 'Contactos', icon: Users },
      { key: 'companies' as CrmTab, label: 'Empresas', icon: Building2 },
      { key: 'pipeline' as CrmTab, label: 'Negocios', icon: Target },
      { key: 'tasks' as CrmTab, label: 'Tareas', icon: ListTodo },
      { key: 'segments' as CrmTab, label: 'Segmentos', icon: Layers },
      { key: 'activity' as CrmTab, label: 'Actividades', icon: StickyNote },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { key: 'marketing' as CrmTab, label: 'Correos', icon: Mail },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { key: 'prospects' as CrmTab, label: 'Prospectos', icon: UserPlus },
      { key: 'whatsapp' as CrmTab, label: 'WhatsApp', icon: MessageCircle, badge: null as number | null },
    ],
  },
];

export default function CrmClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState(ADMIN_EMAIL || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CrmTab>('panel');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const [userName, setUserName] = useState('');
  const [unreadWa, setUnreadWa] = useState(0);
  const [selectedWaJid, setSelectedWaJid] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>(['CRM', 'Ventas', 'Marketing']);

  // Auth check
  useEffect(() => {
    if (!supabase) return;
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (u) { setIsAuthenticated(true); setUserName(u.email?.split('@')[0] || 'Admin'); }
    };
    checkAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session?.user);
      setUserName(session?.user?.email?.split('@')[0] || '');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Contador de mensajes no leídos WA
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = async () => {
      const { data } = await supabase.from('crm_wa_chats').select('unread_count').gt('unread_count', 0);
      setUnreadWa((data || []).reduce((s, c) => s + (c.unread_count || 0), 0));
    };
    fetchUnread();
    const ch = supabase.channel('unread_wa').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_wa_chats' }, fetchUnread).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) setLoginError('Correo o contraseña incorrectos.');
    } catch { setLoginError('Error de conexión.'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setIsAuthenticated(false); };
  // Navega al módulo WhatsApp y abre un chat específico por JID
  const navigateToWaChat = (jid: string) => {
    setSelectedWaJid(jid);
    setActiveTab('whatsapp');
    setSidebarMobile(false);
  };


  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  // ── Pantalla de login ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f8fa] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-[#ff7a59] flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white text-2xl font-bold">U</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Ush CRM</h1>
            <p className="text-gray-500 text-sm mt-1">Inicia sesión para acceder</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#ff7a59] focus:border-transparent" placeholder="correo@empresa.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#ff7a59] focus:border-transparent" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full bg-[#ff7a59] hover:bg-[#e8604a] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60">
              {loginLoading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeTab) {
      case 'panel': return <DashboardSection />;
      case 'contacts': return <ContactSection onOpenWaChat={navigateToWaChat} />;
      case 'companies': return <CompaniesSection />;
      case 'pipeline': return <PipelineSection />;
      case 'tasks': return <TaskSection />;
      case 'activity': return <ActivitySection onOpenWaChat={navigateToWaChat} />;
      case 'whatsapp': return <WhatsappSection initialJid={selectedWaJid} onJidConsumed={() => setSelectedWaJid(null)} />;
      case 'segments': return <SegmentosSection />;
      case 'marketing': return <MarketingSection />;
      case 'prospects': return <ProspectsSection onOpenWaChat={navigateToWaChat} />;
      default: return <DashboardSection />;
    }
  };

  const isWA = activeTab === 'whatsapp';

  return (
    <div className="flex h-screen bg-[#f5f8fa] overflow-hidden">
      {/* Overlay móvil */}
      {sidebarMobile && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarMobile(false)} />}

      {/* ═══ SIDEBAR ════════════════════════════════════════════════════════ */}
      <aside className={`
        fixed md:relative z-30 flex flex-col bg-[#33475b] text-white
        transition-all duration-200 ease-in-out flex-shrink-0
        ${sidebarMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarOpen ? 'w-56' : 'w-[56px]'}
        h-full
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 bg-[#ff7a59] rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm">U</div>
          {sidebarOpen && <span className="font-semibold text-sm text-white truncate">Ush By Ushuaia</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && sidebarOpen && (
                <button
                  onClick={() => setOpenGroups(prev => prev.includes(group.label!) ? prev.filter(l => l !== group.label) : [...prev, group.label!])}
                  className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
                >
                  {group.label}
                  {openGroups.includes(group.label) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
              )}
              {(!group.label || !sidebarOpen || openGroups.includes(group.label)) && group.items.map(item => {
                const isActive = activeTab === item.key;
                const badge = item.key === 'whatsapp' && unreadWa > 0 ? unreadWa : null;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => { setActiveTab(item.key); setSidebarMobile(false); }}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`
                      flex items-center gap-3 w-full px-2 py-2.5 rounded-lg transition-all text-left
                      ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}
                      ${!sidebarOpen ? 'justify-center' : ''}
                    `}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="flex-1 text-[13px] font-medium truncate">{item.label}</span>
                    )}
                    {badge && (
                      <span className={`bg-[#ff7a59] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ${sidebarOpen ? 'min-w-[18px] h-[18px] px-1' : 'min-w-[16px] h-4 px-0.5'}`}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t border-white/10 p-3 flex-shrink-0 space-y-1">
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <div className="w-7 h-7 rounded-full bg-[#ff7a59] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[12px] text-white/70 truncate">{userName}</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(s => !s)} className="flex items-center gap-2 w-full px-2 py-1.5 text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors text-xs">
            <Menu size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Colapsar</span>}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-2 py-1.5 text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors text-xs">
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ═══ CONTENIDO PRINCIPAL ═════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg" onClick={() => setSidebarMobile(true)}>
            <Menu size={20} className="text-gray-600" />
          </button>

          {/* Breadcrumb / título */}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-[15px] text-gray-900 truncate">
              {NAV_GROUPS.flatMap(g => g.items).find(i => i.key === activeTab)?.label || 'Panel'}
            </h1>
            <p className="text-[11px] text-gray-400 hidden sm:block">{todayCap}</p>
          </div>

          {/* Búsqueda global */}
          <div className="hidden md:flex items-center gap-2 bg-[#f5f8fa] border border-gray-200 rounded-lg px-3 py-1.5 w-64">
            <Search size={14} className="text-gray-400" />
            <input type="text" placeholder="Buscar en el CRM..." className="bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none flex-1" />
          </div>

          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell size={18} className="text-gray-600" />
              {unreadWa > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff7a59] rounded-full" />}
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <HelpCircle size={18} className="text-gray-600" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#ff7a59] flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer" onClick={handleLogout} title="Cerrar sesión">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Sección activa */}
        <main className={`flex-1 overflow-auto ${isWA ? 'p-0' : 'p-6'}`}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

// ─── Placeholders para secciones nuevas ─────────────────────────────────────
function SegmentosPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Layers size={32} className="text-violet-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Segmentos</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto">
        Filtra y guarda grupos de contactos según ciudad, etiquetas, actividad o criterios personalizados.
        <strong> Próximamente disponible.</strong>
      </p>
    </div>
  );
}
function MarketingPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Mail size={32} className="text-amber-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Correos de Marketing</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto">
        Crea y envía campañas de correo a tus segmentos directamente desde tu cuenta de correo.
        <strong> Próximamente disponible.</strong>
      </p>
    </div>
  );
}
function ProspectsPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <UserPlus size={32} className="text-sky-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Prospectos</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto">
        Gestiona leads entrantes, asigna scoring y conviértelos en contactos y negocios con un clic.
        <strong> Próximamente disponible.</strong>
      </p>
    </div>
  );
}
