'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  ExternalLink,
  Target,
  ListTodo,
  RefreshCw,
  StickyNote,
  CheckCircle2,
  Circle,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { crmErrorText } from '@/lib/crmErrors';
import {
  CrmContact,
  CrmCompany,
  CrmDeal,
  CrmTask,
  CrmActivity,
  DEAL_STAGES,
  ACTIVITY_TYPES,
} from '@/types/crm';

type Props = {
  contact: CrmContact | null;
  onClose: () => void;
};

type Related = {
  company: CrmCompany | null;
  deals: CrmDeal[];
  tasks: CrmTask[];
  activities: CrmActivity[];
};

const normalizeWhatsApp = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('57') ? digits : `57${digits}`;
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const formatCOP = (value: number): string => {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toLocaleString('es-CO')}`;
  }
};

const EMPTY_RELATED: Related = { company: null, deals: [], tasks: [], activities: [] };

export default function Contact360Drawer({ contact, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<Related>(EMPTY_RELATED);

  useEffect(() => {
    if (!contact) {
      setRelated(EMPTY_RELATED);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setRelated(EMPTY_RELATED);
      try {
        const dealsPromise = supabase
          .from('crm_deals')
          .select('*')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false });
        const tasksPromise = supabase
          .from('crm_tasks')
          .select('*')
          .eq('contact_id', contact.id)
          .order('due_at', { ascending: false });
        const activitiesPromise = supabase
          .from('crm_activities')
          .select('*')
          .eq('contact_id', contact.id)
          .order('happened_at', { ascending: false });
        const companyPromise = contact.company_id
          ? supabase.from('crm_companies').select('*').eq('id', contact.company_id).maybeSingle()
          : Promise.resolve({ data: null, error: null });

        const [dealsRes, tasksRes, activitiesRes, companyRes] = await Promise.all([
          dealsPromise,
          tasksPromise,
          activitiesPromise,
          companyPromise,
        ]);
        if (dealsRes.error) throw dealsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (activitiesRes.error) throw activitiesRes.error;

        const company = companyRes.error
          ? null
          : ((companyRes.data as CrmCompany | null) ?? null);

        if (!cancelled) {
          setRelated({
            company,
            deals: (Array.isArray(dealsRes.data) ? dealsRes.data : []) as CrmDeal[],
            tasks: (Array.isArray(tasksRes.data) ? tasksRes.data : []) as CrmTask[],
            activities: (Array.isArray(activitiesRes.data) ? activitiesRes.data : []) as CrmActivity[],
          });
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Error cargando ficha 360:', (e as any)?.message || e);
          setError(crmErrorText(e, 'No se pudo cargar el historial del contacto.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [contact?.id]);

  if (!contact) return null;

  const openDeals = related.deals.filter((d) => d.stage !== 'lost' && d.stage !== 'won');
  const wonAmount = related.deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + Number(d.value_cop || 0), 0);
  const pendingTasks = related.tasks.filter((t) => !t.done);
  const whatsappNumber = contact.whatsapp_number || contact.phone;

  const sectionTitle = (icon: React.ReactNode, text: string, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[11px] font-black uppercase tracking-widest text-[#1b2333] flex items-center gap-2">
        <span className="text-[#d88193]">{icon}</span>
        {text}
      </h4>
      {extra}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex justify-end">
        <aside
          className="w-full max-w-lg bg-neutral-50 shadow-2xl min-h-full relative"
          onClick={(e) => e.stopPropagation()}
          aria-label="Ficha 360 del contacto"
        >
          <div className="bg-[#1b2333] text-white p-6 sticky top-0 z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#d88193]">Ficha 360°</p>
              <h3 className="text-lg font-black uppercase tracking-wide mt-1 break-words">
                {contact.full_name || 'Sin nombre'}
              </h3>
              {Array.isArray(contact.tags) && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={`${contact.id}-${index}`}
                      className="whitespace-nowrap bg-white/10 text-[10px] font-bold uppercase px-2 py-0.5 border border-white/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md shrink-0"
              title="Cerrar ficha"
            >
              <X size={19} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="bg-white border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-xs text-neutral-700 break-all">
                      <Mail size={13} className="text-neutral-400 flex-shrink-0" />
                      <span className="font-medium">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-xs text-neutral-700">
                      <Phone size={13} className="text-neutral-400 flex-shrink-0" />
                      <span className="font-mono">{contact.phone}</span>
                    </div>
                  )}
                  {whatsappNumber && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                      <MessageCircle size={13} className="text-emerald-500 flex-shrink-0" />
                      <span className="font-mono">{whatsappNumber}</span>
                    </div>
                  )}
                  {contact.city && (
                    <div className="flex items-center gap-2 text-xs text-neutral-600">
                      <MapPin size={13} className="text-neutral-400 flex-shrink-0" />
                      {contact.city}
                    </div>
                  )}
                </div>
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${normalizeWhatsApp(whatsappNumber)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-2 shrink-0 transition-colors"
                  >
                    <ExternalLink size={12} />
                    WhatsApp
                  </a>
                )}
              </div>
              {contact.notes && (
                <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-neutral-600 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Oportunidades</p>
                <p className="text-xl font-black text-[#1b2333] mt-1">{related.deals.length}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Abiertas</p>
                <p className="text-xl font-black text-amber-600 mt-1">{openDeals.length}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ganado</p>
                <p className="text-xl font-black text-emerald-600 mt-1">{formatCOP(wonAmount)}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tareas pend.</p>
                <p className="text-xl font-black text-rose-600 mt-1">{pendingTasks.length}</p>
              </div>
            </div>

            {related.company && (
              <div className="bg-white border border-gray-200 shadow-sm p-5">
                {sectionTitle(<Building2 size={13} />, 'Empresa')}
                <p className="text-sm font-black text-[#1b2333] uppercase">{related.company.name}</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-neutral-600">
                  {related.company.nit && <p><span className="text-neutral-400">NIT:</span> {related.company.nit}</p>}
                  {related.company.industry && <p><span className="text-neutral-400">Sector:</span> {related.company.industry}</p>}
                  {related.company.city && <p><span className="text-neutral-400">Ciudad:</span> {related.company.city}</p>}
                  {related.company.phone && <p><span className="text-neutral-400">Tel:</span> {related.company.phone}</p>}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 shadow-sm p-5">
              {sectionTitle(
                <Target size={13} />,
                'Oportunidades',
                related.deals.length > 0 ? (
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">{related.deals.length}</span>
                ) : undefined
              )}
              {loading ? (
                <div className="py-6 text-center">
                  <RefreshCw size={16} className="animate-spin inline-block text-[#d88193]" />
                </div>
              ) : related.deals.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">Sin oportunidades registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {related.deals.map((deal) => {
                    const meta = DEAL_STAGES.find((s) => s.key === deal.stage) || DEAL_STAGES[0];
                    return (
                      <li key={deal.id} className="flex flex-wrap items-center gap-2 border border-gray-100 px-3 py-2.5">
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-[#1b2333] truncate">{deal.title || 'Sin título'}</span>
                          <span className="block text-[11px] text-neutral-500 mt-0.5">{formatCOP(Number(deal.value_cop || 0))}</span>
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${meta.color}`}>{meta.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 shadow-sm p-5">
              {sectionTitle(<ListTodo size={13} />, 'Tareas')}
              {loading ? (
                <div className="py-6 text-center">
                  <RefreshCw size={16} className="animate-spin inline-block text-[#d88193]" />
                </div>
              ) : related.tasks.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">Sin tareas asignadas a este contacto.</p>
              ) : (
                <ul className="space-y-2">
                  {related.tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2.5">
                      {task.done ? (
                        <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle size={15} className="text-neutral-300 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${task.done ? 'text-neutral-400 line-through' : 'text-[#1b2333]'}`}>
                          {task.title}
                        </p>
                        {task.due_at && (
                          <p className={`text-[10px] mt-0.5 ${task.done ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            Vence: {formatDate(task.due_at)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 shadow-sm p-5">
              {sectionTitle(<StickyNote size={13} />, 'Línea de Tiempo')}
              {loading ? (
                <div className="py-6 text-center">
                  <RefreshCw size={16} className="animate-spin inline-block text-[#d88193]" />
                </div>
              ) : related.activities.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">Sin actividades registradas para este contacto.</p>
              ) : (
                <ul className="space-y-3">
                  {related.activities.map((activity) => {
                    const meta = ACTIVITY_TYPES.find((t) => t.key === activity.type) || ACTIVITY_TYPES[0];
                    return (
                      <li key={activity.id} className="border-l-2 border-gray-100 pl-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 ${meta.color}`}>{meta.label}</span>
                          <span className="text-[10px] text-neutral-400">{formatDate(activity.happened_at)}</span>
                        </div>
                        <p className="text-xs font-bold text-[#1b2333] mt-1">{activity.subject}</p>
                        {activity.content && (
                          <p className="text-[11px] text-neutral-600 mt-0.5 whitespace-pre-wrap">{activity.content}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold" role="alert">
                {error}
              </div>
            )}

            <div className="text-right">
              <button
                onClick={onClose}
                className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-[#1b2333] transition-colors"
              >
                Cerrar ficha
              </button>
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-300 pb-2">
              <Wallet size={11} /> Ush By Ushuaia — CRM Comercial
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}