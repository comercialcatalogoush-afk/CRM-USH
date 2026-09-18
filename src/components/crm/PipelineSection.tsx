'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, RefreshCw, Target, Search, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrmDeal, CrmContact, DealStage, DEAL_STAGES } from '@/types/crm';
import Contact360Drawer from './Contact360Drawer';
import { crmErrorText } from '@/lib/crmErrors';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

const PROBABILITY_MAP: Record<DealStage, number> = {
  new: 10,
  proposal: 40,
  negotiation: 70,
  won: 100,
  lost: 0,
};

export default function PipelineSection() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [newDeal, setNewDeal] = useState({
    contact_id: '',
    title: '',
    value_cop: '',
    stage: 'new' as DealStage,
    probability: '10',
  });

  const contactMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      if (c?.id) map.set(c.id, c.full_name || 'Sin nombre');
    });
    return map;
  }, [contacts]);

  const reload = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [contactsRes, dealsRes] = await Promise.all([
        supabase.from('crm_contacts').select('*'),
        supabase.from('crm_deals').select('*').order('created_at', { ascending: false }),
      ]);
      if (contactsRes.error) throw contactsRes.error;
      if (dealsRes.error) throw dealsRes.error;
      const loadedContacts = (contactsRes.data || []) as CrmContact[];
      const map = new Map<string, string>();
      loadedContacts.forEach((c) => {
        if (c?.id) map.set(c.id, c.full_name || 'Sin nombre');
      });
      const loadedDeals = ((dealsRes.data || []) as CrmDeal[]).map((d) => ({
        ...d,
        contact_name: d.contact_id ? map.get(d.contact_id) || 'Sin contacto' : 'Sin contacto',
      }));
      setContacts(loadedContacts);
      setDeals(loadedDeals);
    } catch (e) {
      console.error('Error cargando pipeline:', (e as any)?.message || e);
      setErrorMsg(crmErrorText(e, 'No se pudieron cargar las oportunidades. Intenta refrescar.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter(
      (d) =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.contact_name || '').toLowerCase().includes(q)
    );
  }, [deals, search]);

  const changeStage = async (deal: CrmDeal, next: DealStage) => {
    if (!deal?.id || next === deal.stage) return;
    const closed_at = next === 'won' || next === 'lost' ? new Date().toISOString() : null;
    try {
      setErrorMsg(null);
      const { error } = await supabase
        .from('crm_deals')
        .update({ stage: next, probability: PROBABILITY_MAP[next], closed_at })
        .eq('id', deal.id);
      if (error) throw error;
      await reload();
    } catch (e) {
      console.error('Error cambiando etapa:', e);
      setErrorMsg('No se pudo cambiar la etapa de la oportunidad.');
    }
  };

  const handleDrop = async (stage: DealStage, ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    if (!dragId) return;
    const deal = deals.find((d) => d.id === dragId);
    setDragId(null);
    if (deal) await changeStage(deal, stage);
  };

  const handleDelete = async (deal: CrmDeal) => {
    if (!window.confirm(`¿Eliminar la oportunidad "${deal.title || 'Sin título'}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      setErrorMsg(null);
      const { error } = await supabase.from('crm_deals').delete().eq('id', deal.id);
      if (error) throw error;
      await reload();
    } catch (e) {
      console.error('Error eliminando oportunidad:', e);
      setErrorMsg('No se pudo eliminar la oportunidad.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title.trim() || !newDeal.contact_id) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const stage = newDeal.stage;
      const closed_at = stage === 'won' || stage === 'lost' ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('crm_deals')
        .insert([
          {
            contact_id: newDeal.contact_id,
            title: newDeal.title.trim(),
            value_cop: Math.max(0, Number(newDeal.value_cop) || 0),
            stage,
            probability: Math.min(100, Math.max(0, Number(newDeal.probability) || 0)),
            closed_at,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setShowModal(false);
      setNewDeal({ contact_id: '', title: '', value_cop: '', stage: 'new', probability: '10' });
      await reload();
    } catch (err) {
      console.error('Error creando oportunidad:', err);
      setErrorMsg('No se pudo crear la oportunidad.');
    } finally {
      setSubmitting(false);
    }
  };

  const stageIndex = (key: DealStage) => DEAL_STAGES.findIndex((s) => s.key === key);

  if (loading && deals.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wider">
          <RefreshCw size={16} className="animate-spin text-[#d88193]" />
          Cargando pipeline…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Target size={16} className="text-[#d88193]" />
              <h2 className="text-base font-black uppercase text-[#1b2333] tracking-wide">
                Pipeline de Ventas
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Gestiona tus oportunidades por etapa: Nuevo, Cotización, Negociación, Ganado y Perdido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
                placeholder="Buscar oportunidad o contacto…"
                className="pl-9 pr-3 py-2 text-xs border border-gray-300 w-full sm:w-72 focus:outline-none focus:border-[#d88193]"
              />
            </div>
            <button
              onClick={reload}
              disabled={loading}
              title="Refrescar pipeline"
              className="p-2 border border-gray-300 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 transition-colors shadow-sm"
            >
              <Plus size={14} /> Nueva Oportunidad
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
        {DEAL_STAGES.map((stage) => {
          const columnDeals = filteredDeals.filter((d) => d.stage === stage.key);
          const totalValue = columnDeals.reduce((sum, d) => sum + (Number(d.value_cop) || 0), 0);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(stage.key, e)}
              className="bg-white border border-gray-200 shadow-sm flex flex-col min-h-[120px]"
            >
              <div className="bg-[#1b2333] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 flex-shrink-0 border ${stage.color.split(' ')[0]}`} />
                    <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-neutral-300 flex-shrink-0">
                    {columnDeals.length}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-neutral-400 mt-1 truncate">{formatCOP(totalValue)}</p>
              </div>

              <div className="p-2 space-y-2 flex-1">
                {columnDeals.length === 0 ? (
                  <div className="border border-dashed border-gray-200 p-4 text-center text-[10px] text-neutral-400 uppercase tracking-wider">
                    Sin oportunidades
                  </div>
                ) : (
                  columnDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => setDragId(deal.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`border border-gray-200 bg-white p-3 space-y-2 cursor-grab active:cursor-grabbing ${
                        dragId === deal.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black text-[#1b2333] uppercase leading-snug break-words">
                          {deal.title || 'Sin título'}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {deal.contact_id && (
                            <button
                              onClick={() => {
                                const contact = contacts.find((c) => c.id === deal.contact_id);
                                setSelectedContact((contact as CrmContact) ?? null);
                              }}
                              title="Ver ficha 360 del contacto"
                              className="p-1 text-neutral-400 hover:text-[#1b2333]"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(deal)}
                            title="Eliminar oportunidad"
                            className="p-1 text-neutral-400 hover:text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">{deal.contact_name}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-[#1b2333]">{formatCOP(Number(deal.value_cop))}</span>
                        <span className="text-[10px] font-bold text-neutral-500">{Number(deal.probability) || 0}%</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100">
                        <button
                          onClick={() => changeStage(deal, DEAL_STAGES[Math.max(0, stageIndex(deal.stage) - 1)].key)}
                          disabled={stageIndex(deal.stage) <= 0}
                          title="Etapa anterior"
                          className="p-1 border border-gray-200 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          onClick={() => changeStage(deal, DEAL_STAGES[Math.min(DEAL_STAGES.length - 1, stageIndex(deal.stage) + 1)].key)}
                          disabled={stageIndex(deal.stage) >= DEAL_STAGES.length - 1}
                          title="Siguiente etapa"
                          className="p-1 border border-gray-200 text-neutral-500 hover:bg-[#1b2333] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md shadow-2xl border border-gray-200 rounded-xl">
            <div className="bg-[#1b2333] text-white p-5 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">Nueva Oportunidad</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Registra una oportunidad en el pipeline de ventas.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Contacto *
                </label>
                <select
                  required
                  value={newDeal.contact_id}
                  onChange={(e) => setNewDeal((s) => ({ ...s, contact_id: e.target.value }))}
                  className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                >
                  <option value="">Selecciona un contacto…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || 'Sin nombre'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={newDeal.title}
                  onChange={(e) => setNewDeal((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Ej. Pedido mayorista de jeans"
                  className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Valor (COP) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={newDeal.value_cop}
                  onChange={(e) => setNewDeal((s) => ({ ...s, value_cop: e.target.value }))}
                  placeholder="Ej. 1500000"
                  className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Etapa
                  </label>
                  <select
                    value={newDeal.stage}
                    onChange={(e) => {
                      const stage = e.target.value as DealStage;
                      setNewDeal((s) => ({ ...s, stage, probability: String(PROBABILITY_MAP[stage]) }));
                    }}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Probabilidad %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDeal.probability}
                    onChange={(e) => setNewDeal((s) => ({ ...s, probability: e.target.value }))}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border border-gray-300 text-neutral-600 hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider px-4 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} />
                  )}
                  {submitting ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && <Contact360Drawer contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  );
}