'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  Users,
  Target,
  RefreshCw,
  StickyNote,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { crmErrorText } from '@/lib/crmErrors';
import { CrmCompany, CrmContact, CrmDeal, CrmActivity, CrmTask, DEAL_STAGES, ACTIVITY_TYPES } from '@/types/crm';

type Props = {
  company: CrmCompany | null;
  onClose: () => void;
};

type Related = {
  contacts: CrmContact[];
  deals: CrmDeal[];
  tasks: CrmTask[];
  activities: CrmActivity[];
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

const EMPTY_RELATED: Related = { contacts: [], deals: [], tasks: [], activities: [] };

export default function Company360Drawer({ company, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<Related>(EMPTY_RELATED);

  useEffect(() => {
    if (!company) {
      setRelated(EMPTY_RELATED);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setRelated(EMPTY_RELATED);
      try {
        const contactsRes = await supabase
          .from('crm_contacts')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (contactsRes.error) throw contactsRes.error;
        const loadedContacts = (Array.isArray(contactsRes.data) ? contactsRes.data : []) as CrmContact[];
        const contactIds = loadedContacts.map((c) => c.id);

        let dealsData: CrmDeal[] = [];
        let tasksData: CrmTask[] = [];
        let activitiesData: CrmActivity[] = [];

        if (contactIds.length > 0) {
          const [dealsRes, tasksRes, activitiesRes] = await Promise.all([
            supabase.from('crm_deals').select('*').in('contact_id', contactIds).order('created_at', { ascending: false }),
            supabase
              .from('crm_tasks')
              .select('*')
              .in('contact_id', contactIds)
              .order('due_at', { ascending: false }),
            supabase
              .from('crm_activities')
              .select('*')
              .in('contact_id', contactIds)
              .order('happened_at', { ascending: false }),
          ]);
          if (dealsRes.error) throw dealsRes.error;
          if (tasksRes.error) throw tasksRes.error;
          if (activitiesRes.error) throw activitiesRes.error;
          dealsData = (Array.isArray(dealsRes.data) ? dealsRes.data : []) as CrmDeal[];
          tasksData = (Array.isArray(tasksRes.data) ? tasksRes.data : []) as CrmTask[];
          activitiesData = (Array.isArray(activitiesRes.data) ? activitiesRes.data : []) as CrmActivity[];
        }

        if (!cancelled) {
          setRelated({
            contacts: loadedContacts,
            deals: dealsData,
            tasks: tasksData,
            activities: activitiesData,
          });
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Error cargando ficha de empresa:', (e as any)?.message || e);
          setError(crmErrorText(e, 'No se pudo cargar la información de la empresa.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  if (!company) return null;

  const contactMap = new Map<string, string>();
  related.contacts.forEach((c) => {
    if (c?.id) contactMap.set(c.id, c.full_name || 'Sin nombre');
  });
  const openDeals = related.deals.filter((d) => d.stage !== 'lost' && d.stage !== 'won');
  const wonAmount = related.deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + Number(d.value_cop || 0), 0);
  const pendingTasks = related.tasks.filter((t) => !t.done);

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
          aria-label="Ficha 360 de la empresa"
        >
          <div className="bg-[#1b2333] text-white p-6 sticky top-0 z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#d88193]">Ficha 360° Empresa</p>
              <h3 className="text-lg font-black uppercase tracking-wide mt-1 break-words">{company.name}</h3>
              {company.industry && (
                <span className="inline-block mt-2 bg-white/10 text-[10px] font-bold uppercase px-2 py-0.5 border border-white/20">
                  {company.industry}
                </span>
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
              <div className="space-y-1.5">
                {company.nit && (
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Building2 size={13} className="text-neutral-400 flex-shrink-0" />
                    <span className="font-mono text-neutral-500">NIT {company.nit}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2 text-xs text-neutral-700 break-all">
                    <Mail size={13} className="text-neutral-400 flex-shrink-0" />
                    <span className="font-medium">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Phone size={13} className="text-neutral-400 flex-shrink-0" />
                    <span className="font-mono">{company.phone}</span>
                  </div>
                )}
                {company.city && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <MapPin size={13} className="text-neutral-400 flex-shrink-0" />
                    {company.city}
                  </div>
                )}
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-neutral-800 font-medium hover:text-[#d88193] break-all"
                  >
                    <Globe size={13} className="text-neutral-400 flex-shrink-0" />
                    {company.website}
                  </a>
                )}
              </div>
              {company.notes && (
                <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-neutral-600 whitespace-pre-wrap">
                  {company.notes}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contactos</p>
                <p className="text-xl font-black text-[#1b2333] mt-1">{related.contacts.length}</p>
              </div>
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
                <p className="text-sm font-black text-emerald-600 mt-1 leading-tight">{formatCOP(wonAmount)}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 shadow-sm p-5">
              {sectionTitle(
                <Users size={13} />,
                'Contactos de la Empresa',
                related.contacts.length > 0 ? (
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">{related.contacts.length}</span>
                ) : undefined
              )}
              {loading ? (
                <div className="py-6 text-center">
                  <RefreshCw size={16} className="animate-spin inline-block text-[#d88193]" />
                </div>
              ) : related.contacts.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">Sin contactos vinculados a esta empresa.</p>
              ) : (
                <ul className="space-y-2">
                  {related.contacts.map((contact) => (
                    <li key={contact.id} className="flex items-center gap-2 border border-gray-100 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1b2333] truncate">{contact.full_name || 'Sin nombre'}</p>
                        {contact.city && <p className="text-[10px] text-neutral-500 truncate">{contact.city}</p>}
                      </div>
                      {contact.whatsapp_number && (
                        <span className="text-[10px] text-emerald-600 font-mono flex-shrink-0">WA ✓</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 shadow-sm p-5">
              {sectionTitle(
                <Target size={13} />,
                'Oportunidades de sus Contactos',
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
                    const cname = deal.contact_id ? contactMap.get(deal.contact_id) : undefined;
                    return (
                      <li key={deal.id} className="flex flex-wrap items-center gap-2 border border-gray-100 px-3 py-2.5">
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-[#1b2333] truncate">{deal.title || 'Sin título'}</span>
                          <span className="block text-[11px] text-neutral-500 mt-0.5">
                            {formatCOP(Number(deal.value_cop || 0))}
                            {cname ? ` · ${cname}` : ''}
                          </span>
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${meta.color}`}>{meta.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 shadow-sm p-5">
              {sectionTitle(<StickyNote size={13} />, 'Actividades de sus Contactos')}
              {loading ? (
                <div className="py-6 text-center">
                  <RefreshCw size={16} className="animate-spin inline-block text-[#d88193]" />
                </div>
              ) : related.activities.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">Sin actividades para los contactos de esta empresa.</p>
              ) : (
                <ul className="space-y-3">
                  {related.activities.slice(0, 12).map((activity) => {
                    const meta = ACTIVITY_TYPES.find((t) => t.key === activity.type) || ACTIVITY_TYPES[0];
                    const cname = activity.contact_id ? contactMap.get(activity.contact_id) : undefined;
                    return (
                      <li key={activity.id} className="border-l-2 border-gray-100 pl-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 ${meta.color}`}>{meta.label}</span>
                          <span className="text-[10px] text-neutral-400">{formatDate(activity.happened_at)}</span>
                          {cname && <span className="text-[10px] text-neutral-400">· {cname}</span>}
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