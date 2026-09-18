'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Trash2, RefreshCw, Phone, Mail, MessageCircle, Calendar, StickyNote, Users2, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrmActivity, ACTIVITY_TYPES, ActivityType } from '@/types/crm';
import { crmErrorText } from '@/lib/crmErrors';

type ActivityWithNames = CrmActivity & {
  contact_name?: string;
  deal_title?: string;
};

type ActivityForm = {
  type: ActivityType;
  subject: string;
  content: string;
  contact_id: string;
  deal_id: string;
  happened_at: string;
};

type ContactOption = { id: string; full_name: string };
type DealOption = { id: string; title: string };

const TYPE_ICON_STYLES: Record<ActivityType, string> = {
  nota: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  llamada: 'bg-blue-100 text-blue-700 border-blue-200',
  correo: 'bg-amber-100 text-amber-700 border-amber-200',
  whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  reunion: 'bg-purple-100 text-purple-700 border-purple-200',
};

const renderTypeIcon = (type: ActivityType, className?: string) => {
  switch (type) {
    case 'llamada':
      return <Phone className={className} />;
    case 'correo':
      return <Mail className={className} />;
    case 'whatsapp':
      return <MessageCircle className={className} />;
    case 'reunion':
      return <Calendar className={className} />;
    default:
      return <StickyNote className={className} />;
  }
};

const formatHappened = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const nowToLocalInput = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ActivitySection(props: { userRole?: 'admin' | 'seller' }) {
  const { userRole = 'admin' } = props;
  const canDelete = userRole === 'admin';
  const [activities, setActivities] = useState<ActivityWithNames[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ActivityForm>({
    type: 'nota',
    subject: '',
    content: '',
    contact_id: '',
    deal_id: '',
    happened_at: nowToLocalInput(),
  });

  const contactMap = new Map<string, string>(contacts.map((c) => [c.id, c.full_name || 'Sin nombre']));
  const dealMap = new Map<string, string>(deals.map((d) => [d.id, d.title || 'Sin título']));

  const reload = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [activitiesRes, contactsRes, dealsRes] = await Promise.all([
        supabase.from('crm_activities').select('*').order('happened_at', { ascending: false }),
        supabase.from('crm_contacts').select('id,full_name'),
        supabase.from('crm_deals').select('id,title'),
      ]);
      if (activitiesRes.error) throw activitiesRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (dealsRes.error) throw dealsRes.error;

      const loadedContacts = (contactsRes.data || []) as ContactOption[];
      const loadedDeals = (dealsRes.data || []) as DealOption[];
      const cMap = new Map<string, string>();
      loadedContacts.forEach((c) => {
        if (c?.id) cMap.set(c.id, c.full_name || 'Sin nombre');
      });
      const dMap = new Map<string, string>();
      loadedDeals.forEach((d) => {
        if (d?.id) dMap.set(d.id, d.title || 'Sin título');
      });

      const loadedActivities = ((activitiesRes.data || []) as CrmActivity[]).map((a) => ({
        ...a,
        contact_name: a.contact_id ? cMap.get(a.contact_id) || undefined : undefined,
        deal_title: a.deal_id ? dMap.get(a.deal_id) || undefined : undefined,
      }));

      setContacts(loadedContacts);
      setDeals(loadedDeals);
      setActivities(loadedActivities);
    } catch (e) {
      console.error('Error cargando actividades:', (e as any)?.message || e);
      setErrorMsg(crmErrorText(e, 'No se pudieron cargar las actividades. Intenta refrescar.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setForm({
      type: 'nota',
      subject: '',
      content: '',
      contact_id: '',
      deal_id: '',
      happened_at: nowToLocalInput(),
    });
    setShowModal(true);
  };

  const setField = (field: keyof ActivityForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.subject.trim()) {
      setErrorMsg('El asunto es un campo obligatorio.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    const parsed = new Date(form.happened_at);
    const happenedIso = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();

    const payload = {
      type: form.type,
      subject: form.subject.trim(),
      content: form.content.trim() || null,
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
      happened_at: happenedIso,
    };

    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const created = data as CrmActivity;
        setActivities((prev) => [
          {
            ...created,
            contact_name: created.contact_id ? contactMap.get(created.contact_id) || undefined : undefined,
            deal_title: created.deal_id ? dealMap.get(created.deal_id) || undefined : undefined,
          },
          ...prev,
        ]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error guardando actividad:', err);
      setErrorMsg('No se pudo crear la actividad.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity: ActivityWithNames) => {
    if (!activity?.id) return;
    if (!window.confirm(`¿Eliminar la actividad "${activity.subject}"? Esta acción no se puede deshacer.`)) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase.from('crm_activities').delete().eq('id', activity.id);
      if (error) throw error;
      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
    } catch (e) {
      console.error('Error eliminando actividad:', e);
      setErrorMsg('No se pudo eliminar la actividad.');
    }
  };

  return (
    <section className="p-5 space-y-4">
      <div className="bg-white border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Seguimiento comercial
            </p>
            <h2 className="text-base font-black uppercase text-[#1b2333] tracking-wide">
              Línea de Tiempo de Actividades
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Registra llamadas, correos, WhatsApp, notas y reuniones.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-neutral-600 hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider px-3 py-2.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Actividad
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2"
          role="alert"
        >
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 border-2 border-[#1b2333] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-neutral-500">Cargando actividades…</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <StickyNote className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-600">
              Aún no hay actividades registradas. Registra la primera.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Actividad
            </button>
          </div>
        ) : (
          <ul className="mt-2 space-y-0">
            {activities.map((activity, idx) => {
              const meta = ACTIVITY_TYPES.find((t) => t.key === activity.type) || ACTIVITY_TYPES[0];
              const isLast = idx === activities.length - 1;
              return (
                <li key={activity.id} className="relative flex gap-4 pb-6 last:pb-2">
                  {!isLast && <div className="absolute left-[19px] top-11 bottom-0 w-px bg-gray-200" />}
                  <div
                    className={`h-10 w-10 rounded-full border flex items-center justify-center shrink-0 ${TYPE_ICON_STYLES[activity.type]}`}
                  >
                    {renderTypeIcon(activity.type, 'h-4 w-4')}
                  </div>
                  <div className="flex-1 min-w-0 border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">
                        {formatHappened(activity.happened_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#1b2333] leading-snug">{activity.subject}</p>
                    {activity.content && (
                      <p className="mt-1 text-xs text-neutral-600 whitespace-pre-wrap">{activity.content}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {activity.contact_name && (
                        <span className="inline-flex items-center gap-1 bg-[#1b2333] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                          <Users2 className="h-3 w-3 text-[#d88193]" />
                          sobre {activity.contact_name}
                        </span>
                      )}
                      {activity.deal_title && (
                        <span className="inline-flex items-center gap-1 bg-[#d88193] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                          <Target className="h-3 w-3" />
                          en {activity.deal_title}
                        </span>
                      )}
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(activity)}
                      title="Eliminar actividad"
                      className="self-start p-1.5 border border-gray-200 text-neutral-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative z-10 w-full max-w-lg bg-white border border-gray-200 shadow-2xl">
              <div className="bg-[#1b2333] text-white p-5 flex items-center justify-between rounded-t-xl">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Nueva Actividad</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Registra una llamada, correo, WhatsApp, nota o reunión.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.type}
                    onChange={setField('type')}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Asunto *
                  </label>
                  <input
                    value={form.subject}
                    onChange={setField('subject')}
                    placeholder="Ej: Llamada de seguimiento de cotización"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Contenido
                  </label>
                  <textarea
                    value={form.content}
                    onChange={setField('content')}
                    placeholder="Detalles de la actividad"
                    rows={3}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Contacto
                  </label>
                  <select
                    value={form.contact_id}
                    onChange={setField('contact_id')}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  >
                    <option value="">Sin contacto</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || 'Sin nombre'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Oportunidad
                  </label>
                  <select
                    value={form.deal_id}
                    onChange={setField('deal_id')}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  >
                    <option value="">Sin oportunidad</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title || 'Sin título'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Fecha y Hora
                  </label>
                  <input
                    type="datetime-local"
                    value={form.happened_at}
                    onChange={setField('happened_at')}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-gray-300 hover:bg-neutral-50 text-neutral-700 font-bold py-3 text-xs uppercase tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-[#1b2333] hover:bg-[#d88193] text-white font-bold py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Registrar Actividad'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}