'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Target, ShoppingBag, CheckCircle2, Clock, AlertTriangle, TrendingUp, DollarSign, RefreshCw, Building2, Trophy, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { crmErrorText } from '@/lib/crmErrors';
import { DEAL_STAGES, CrmDeal, CrmContact, CrmTask, CrmCompany } from '@/types/crm';

function formatCOP(v: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
}
function diffDays(a: string, b: string): number {
  return Math.ceil((+new Date(b) - +new Date(a)) / 86400000);
}

type ActivityItem = {
  key: string;
  date: string;
  label: string;
};

export default function DashboardSection() {
  const [contacts, setContacts] = useState<Pick<CrmContact, 'id' | 'full_name' | 'created_at' | 'whatsapp_number'>[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [contactsRes, companiesRes, dealsRes, tasksRes] = await Promise.all([
        supabase.from('crm_contacts').select('id,full_name,created_at,whatsapp_number'),
        supabase.from('crm_companies').select('id,name'),
        supabase.from('crm_deals').select('*'),
        supabase.from('crm_tasks').select('*'),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      setContacts((contactsRes.data || []) as Pick<CrmContact, 'id' | 'full_name' | 'created_at' | 'whatsapp_number'>[]);
      setCompanies((companiesRes.data || []) as CrmCompany[]);
      setDeals((dealsRes.data || []) as CrmDeal[]);
      setTasks((tasksRes.data || []) as CrmTask[]);
    } catch (e: any) {
      console.error('Error cargando panel:', e?.message || e);
      setError(crmErrorText(e, 'No se pudieron cargar los datos del panel. Reintenta y si el problema continúa revisa la configuración de Supabase.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const openDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
    const wonDeals = deals.filter((d) => d.stage === 'won');
    const lostDeals = deals.filter((d) => d.stage === 'lost');
    const pendingTasks = tasks.filter((t) => !t.done);
    const now = new Date().toISOString();
    const overdueTasks = pendingTasks.filter((t) => t.due_at && t.due_at < now);
    const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value_cop || 0), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value_cop || 0), 0);
    const closedDeals = wonDeals.length + lostDeals.length;

    return {
      totalContacts: contacts.length,
      totalCompanies: companies.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      pipelineValue,
      wonValue,
      conversionRate: closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      totalWhatsApp: contacts.filter((c) => c.whatsapp_number).length,
    };
  }, [contacts, companies, deals, tasks]);

  const funnel = useMemo(() => {
    const stageTotals = DEAL_STAGES.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage.key);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.value_cop || 0), 0);
      return {
        ...stage,
        count: stageDeals.length,
        totalValue,
      };
    });
    const maxValue = Math.max(...stageTotals.map((s) => s.totalValue), 1);
    return stageTotals.map((s) => ({
      ...s,
      pct: Math.round((s.totalValue / maxValue) * 100),
    }));
  }, [deals]);

  const topDeals = useMemo(() => {
    return deals
      .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
      .sort((a, b) => (b.value_cop || 0) - (a.value_cop || 0))
      .slice(0, 5);
  }, [deals]);

  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      if (c?.id) map.set(c.id, c.full_name || 'Sin nombre');
    });
    return map;
  }, [contacts]);

  const recentActivity = useMemo(() => {
    const recentContacts = contacts
      .slice()
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 8)
      .map((c): ActivityItem => ({
        key: `contact-${c.id}`,
        date: c.created_at,
        label: `Se registró el contacto ${c.full_name || 'Sin nombre'}`,
      }));

    const recentDeals = deals
      .slice()
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 8)
      .map((d): ActivityItem => ({
        key: `deal-${d.id}`,
        date: d.created_at,
        label: `Se creó la oportunidad ${d.title || 'Sin título'} (${formatCOP(d.value_cop)})`,
      }));

    return [...recentContacts, ...recentDeals]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 16);
  }, [contacts, deals]);

  const formatTs = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return ts;
    }
  };

  if (loading) {
    return (
      <div className="p-5">
        <div className="bg-white border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-[#1b2333] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Cargando panel…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <div className="bg-white border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-700">Error al cargar el panel</p>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            onClick={() => loadData(true)}
            className="mt-2 inline-flex items-center gap-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 shadow-sm transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="p-5 space-y-5">
      <div className="bg-white border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Resumen general
            </p>
            <h2 className="text-base font-black uppercase text-[#1b2333] tracking-wide">
              Panel de Control
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Indicadores clave de tu CRM: contactos, oportunidades, pipeline y actividad reciente.
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Actualizar datos"
            className="inline-flex items-center gap-1.5 border border-gray-300 text-neutral-600 hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider px-3 py-2.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contactos</p>
            <p className="text-2xl font-black text-[#1b2333] mt-1">{kpis.totalContacts}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Empresas</p>
            <p className="text-2xl font-black text-[#1b2333] mt-1">{kpis.totalCompanies}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Oportunidades Abiertas</p>
            <p className="text-2xl font-black text-[#1b2333] mt-1">{kpis.openDeals}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Target size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Valor en Pipeline</p>
            <p className="text-xl font-black text-[#1b2333] mt-1">{formatCOP(kpis.pipelineValue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ganado (Cerrado)</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{formatCOP(kpis.wonValue)}</p>
            <p className="text-[10px] text-neutral-400 font-bold mt-0.5">{kpis.wonDeals} ventas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Trophy size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tasa de Conversión</p>
            <p className="text-2xl font-black text-[#d88193] mt-1">{kpis.conversionRate}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-ush-pink">
            <Percent size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tareas Pendientes</p>
            <p className="text-2xl font-black text-[#1b2333] mt-1">{kpis.pendingTasks}</p>
            {kpis.overdueTasks > 0 && (
              <p className="text-[10px] text-red-500 font-bold mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {kpis.overdueTasks} vencida{kpis.overdueTasks !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contactos con WhatsApp</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{kpis.totalWhatsApp}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 shadow-sm p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Embudo de Ventas</p>
            <h3 className="text-sm font-black uppercase text-[#1b2333] tracking-wide mt-0.5">
              Distribución por Etapa
            </h3>
          </div>

          <div className="space-y-3">
            {funnel.map((stage) => (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {stage.count} {stage.count === 1 ? 'oportunidad' : 'oportunidades'}
                    </span>
                    <span className="text-xs font-black text-[#1b2333]">
                      {formatCOP(stage.totalValue)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-[#1b2333] transition-all duration-500"
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Oportunidades Destacadas</p>
            <h3 className="text-sm font-black uppercase text-[#1b2333] tracking-wide mt-0.5">
              Top 5 por Valor
            </h3>
          </div>

          {topDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Target className="h-8 w-8 text-neutral-200" />
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                Sin oportunidades
              </p>
              <p className="mt-1 text-[10px] text-neutral-400 uppercase tracking-wider">
                Crea tu primera oportunidad para verla aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topDeals.map((deal) => {
                const stageInfo = DEAL_STAGES.find((s) => s.key === deal.stage);
                const cname = deal.contact_name || contactNameMap.get(deal.contact_id) || '';
                return (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between gap-3 p-3 border border-gray-200 bg-neutral-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#1b2333] truncate">
                        {deal.title || 'Sin título'}
                      </p>
                      {cname && (
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          {cname}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {stageInfo && (
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase border rounded-sm ${stageInfo.color}`}>
                          {stageInfo.label}
                        </span>
                      )}
                      <span className="text-xs font-black text-[#1b2333] whitespace-nowrap">
                        {formatCOP(deal.value_cop)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm p-5">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Actividad Reciente</p>
          <h3 className="text-sm font-black uppercase text-[#1b2333] tracking-wide mt-0.5">
            Últimos Registros
          </h3>
        </div>

        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="h-8 w-8 text-neutral-200" />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              Sin actividad reciente
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((item) => (
              <li key={item.key} className="flex items-start gap-3 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d88193] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-700 font-medium">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                    {formatTs(item.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
