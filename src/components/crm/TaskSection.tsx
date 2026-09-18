'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, X, Trash2, CheckCircle2, Circle, Clock, RefreshCw, Calendar, AlertTriangle, ListTodo } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrmTask, CrmContact, CrmDeal } from '@/types/crm';
import { crmErrorText } from '@/lib/crmErrors';

type TaskFilter = 'todas' | 'pendientes' | 'vencidas' | 'completadas';

type TaskForm = {
  title: string;
  description: string;
  due_at: string;
  contact_id: string;
  deal_id: string;
};

const EMPTY_FORM: TaskForm = {
  title: '',
  description: '',
  due_at: '',
  contact_id: '',
  deal_id: '',
};

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'vencidas', label: 'Vencidas' },
  { key: 'completadas', label: 'Completadas' },
];

const formatDue = (due?: string | null): string => {
  if (!due) return '';
  try {
    return new Date(due).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return due;
  }
};

const toLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TaskSection() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [contacts, setContacts] = useState<Pick<CrmContact, 'id' | 'full_name'>[]>([]);
  const [deals, setDeals] = useState<Pick<CrmDeal, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('todas');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CrmTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const contactMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      if (c?.id) map.set(c.id, c.full_name || 'Sin nombre');
    });
    return map;
  }, [contacts]);

  const dealMap = useMemo(() => {
    const map = new Map<string, string>();
    deals.forEach((d) => {
      if (d?.id) map.set(d.id, d.title || 'Sin título');
    });
    return map;
  }, [deals]);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [tasksRes, contactsRes, dealsRes] = await Promise.all([
        supabase.from('crm_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_contacts').select('id,full_name'),
        supabase.from('crm_deals').select('id,title'),
      ]);
      if (tasksRes.error) throw tasksRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (dealsRes.error) throw dealsRes.error;

      const loadedContacts = (contactsRes.data || []) as Pick<CrmContact, 'id' | 'full_name'>[];
      const loadedDeals = (dealsRes.data || []) as Pick<CrmDeal, 'id' | 'title'>[];
      const cMap = new Map<string, string>();
      loadedContacts.forEach((c) => {
        if (c?.id) cMap.set(c.id, c.full_name || 'Sin nombre');
      });
      const dMap = new Map<string, string>();
      loadedDeals.forEach((d) => {
        if (d?.id) dMap.set(d.id, d.title || 'Sin título');
      });

      const loadedTasks = ((tasksRes.data || []) as CrmTask[]).map((t) => ({
        ...t,
        contact_name: t.contact_id ? cMap.get(t.contact_id) || 'Sin nombre' : undefined,
        deal_title: t.deal_id ? dMap.get(t.deal_id) || 'Sin título' : undefined,
      }));

      setContacts(loadedContacts);
      setDeals(loadedDeals);
      setTasks(loadedTasks);
    } catch (e) {
      console.error('Error cargando tareas:', (e as any)?.message || e);
      setErrorMsg(crmErrorText(e, 'No se pudieron cargar las tareas. Intenta refrescar.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const counts = useMemo(() => {
    const now = new Date().toISOString();
    const pendientes = tasks.filter((t) => !t.done).length;
    const vencidas = tasks.filter((t) => !t.done && t.due_at && t.due_at < now).length;
    const completadas = tasks.filter((t) => t.done).length;
    return { todas: tasks.length, pendientes, vencidas, completadas };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const now = new Date().toISOString();
    if (filter === 'pendientes') return tasks.filter((t) => !t.done);
    if (filter === 'vencidas') return tasks.filter((t) => !t.done && t.due_at && t.due_at < now);
    if (filter === 'completadas') return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (task: CrmTask) => {
    setEditing(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      due_at: toLocalInput(task.due_at),
      contact_id: task.contact_id || '',
      deal_id: task.deal_id || '',
    });
    setShowModal(true);
  };

  const setField = (field: keyof TaskForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.title.trim()) {
      setErrorMsg('El título es un campo obligatorio.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    const payload: Partial<CrmTask> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
    };

    try {
      if (editing) {
        const { data, error } = await supabase
          .from('crm_tasks')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === editing.id
                ? {
                    ...(data as CrmTask),
                    contact_name: (data as CrmTask).contact_id
                      ? contactMap.get((data as CrmTask).contact_id || '') || 'Sin nombre'
                      : undefined,
                    deal_title: (data as CrmTask).deal_id
                      ? dealMap.get((data as CrmTask).deal_id || '') || 'Sin título'
                      : undefined,
                  }
                : t
            )
          );
        }
      } else {
        const { data, error } = await supabase
          .from('crm_tasks')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setTasks((prev) => [
            {
              ...(data as CrmTask),
              contact_name: (data as CrmTask).contact_id
                ? contactMap.get((data as CrmTask).contact_id || '') || 'Sin nombre'
                : undefined,
              deal_title: (data as CrmTask).deal_id
                ? dealMap.get((data as CrmTask).deal_id || '') || 'Sin título'
                : undefined,
            },
            ...prev,
          ]);
        }
      }
      setShowModal(false);
    } catch (e) {
      console.error('Error guardando tarea:', e);
      setErrorMsg(editing ? 'No se pudo actualizar la tarea.' : 'No se pudo crear la tarea.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task: CrmTask) => {
    if (!task?.id || togglingId === task.id) return;
    setTogglingId(task.id);
    setErrorMsg(null);
    const nextDone = !task.done;
    try {
      const { error } = await supabase
        .from('crm_tasks')
        .update({ done: nextDone, completed_at: nextDone ? new Date().toISOString() : null })
        .eq('id', task.id);
      if (error) throw error;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, done: nextDone, completed_at: nextDone ? new Date().toISOString() : null }
            : t
        )
      );
    } catch (e) {
      console.error('Error actualizando tarea:', e);
      setErrorMsg('No se pudo actualizar la tarea.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (task: CrmTask) => {
    if (!task?.id) return;
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`)) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', task.id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      console.error('Error eliminando tarea:', e);
      setErrorMsg('No se pudo eliminar la tarea.');
    }
  };

  const renderEmptyState = () => {
    if (filter === 'pendientes' || filter === 'vencidas') {
      return (
        <div className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-600">
            Todas las tareas están completadas
          </p>
          <p className="mt-1 text-[10px] text-neutral-400 uppercase tracking-wider">
            No hay tareas pendientes por vencimiento.
          </p>
        </div>
      );
    }
    return (
      <div className="p-8 text-center">
        <ListTodo className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-neutral-600">Sin tareas</p>
        <p className="mt-1 text-[10px] text-neutral-400 uppercase tracking-wider">
          Registra tu primera tarea o recordatorio.
        </p>
        <button
          onClick={openCreate}
          className="mt-4 inline-flex items-center gap-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 shadow-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Tarea
        </button>
      </div>
    );
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
              Tareas y Recordatorios
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Organiza seguimientos, llamadas y pendientes para cerrar más negocios.
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
              Nueva Tarea
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
                filter === f.key
                  ? 'bg-[#1b2333] text-white border-[#1b2333]'
                  : 'text-neutral-600 border-gray-200 hover:bg-neutral-50'
              }`}
            >
              {f.label}
              <span
                className={`px-1.5 py-0.5 text-[10px] font-black rounded-sm ${
                  filter === f.key ? 'bg-[#d88193] text-white' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-[#1b2333] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          renderEmptyState()
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredTasks.map((task) => {
              const now = new Date().toISOString();
              const isOverdue = !task.done && task.due_at && task.due_at < now;
              const rowStyle = task.done
                ? 'bg-neutral-50 opacity-70'
                : isOverdue
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-100';
              return (
                <li
                  key={task.id}
                  className={`flex items-start gap-3 p-4 border border-gray-200 ${rowStyle}`}
                >
                  <button
                    onClick={() => toggleDone(task)}
                    disabled={!task.done && togglingId === task.id}
                    title={task.done ? 'Marcar como pendiente' : 'Marcar como completada'}
                    className="mt-0.5 shrink-0 disabled:opacity-50"
                  >
                    {task.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : isOverdue ? (
                      <Circle className="h-5 w-5 text-red-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-neutral-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-wider">
                          <Clock className="h-3 w-3" />
                          Vencida
                        </span>
                      )}
                      <span
                        className={`text-sm font-bold text-[#1b2333] ${
                          task.done ? 'line-through text-neutral-500' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {task.description && (
                      <p
                        className={`mt-1 text-xs text-neutral-600 ${
                          task.done ? 'line-through text-neutral-400' : ''
                        }`}
                      >
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {task.due_at && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                            isOverdue ? 'text-red-600' : 'text-neutral-600'
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {formatDue(task.due_at)}
                        </span>
                      )}
                      {task.contact_name && (
                        <span className="inline-flex items-center bg-[#1b2333] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                          {task.contact_name}
                        </span>
                      )}
                      {task.deal_title && (
                        <span className="inline-flex items-center bg-[#d88193] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                          {task.deal_title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(task)}
                      className="p-1.5 border border-gray-200 text-neutral-500 hover:bg-[#1b2333] hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      title="Eliminar tarea"
                      className="p-1.5 border border-gray-200 text-neutral-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    {editing ? 'Editar Tarea' : 'Nueva Tarea'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {editing
                      ? 'Actualiza los datos de la tarea.'
                      : 'Registra una tarea o recordatorio de seguimiento.'}
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
                    Título *
                  </label>
                  <input
                    value={form.title}
                    onChange={setField('title')}
                    placeholder="Ej: Llamar a clientes mayoristas"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={form.description}
                    onChange={setField('description')}
                    placeholder="Detalles de la tarea"
                    rows={3}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Vencimiento
                  </label>
                  <input
                    type="datetime-local"
                    value={form.due_at}
                    onChange={setField('due_at')}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
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
                    ) : editing ? (
                      'Guardar Cambios'
                    ) : (
                      'Crear Tarea'
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