'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Send, Clock, CheckCircle2, AlertCircle, Eye, MousePointer,
  Users, Sparkles, Filter, Search, ChevronRight, BarChart2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'sent' | 'scheduled' | 'draft';
  recipients_count: number;
  open_rate: string;
  click_rate: string;
  date: string;
}

export default function MarketingSection() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactsWithEmail, setContactsWithEmail] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cSubject, setCSubject] = useState('');

  // Cargar datos reales de contactos para ver alcance potencial de correos
  const loadRealData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await supabase
        .from('crm_contacts')
        .select('id, email', { count: 'exact' })
        .not('email', 'is', null)
        .neq('email', '');
      
      setContactsWithEmail(count || 0);
    } catch (e) {
      console.error('Error cargando contactos para marketing:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    const newCamp: Campaign = {
      id: String(Date.now()),
      name: cName.trim(),
      subject: cSubject.trim() || 'Sin asunto',
      status: 'draft',
      recipients_count: contactsWithEmail,
      open_rate: '0%',
      click_rate: '0%',
      date: new Date().toLocaleDateString('es-CO'),
    };
    setCampaigns([newCamp, ...campaigns]);
    setCName('');
    setCSubject('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff7a59] flex items-center justify-center font-bold">
            <Mail size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Campañas de Correo & Marketing</h2>
            <p className="text-xs text-gray-500">Envía catálogos, promociones y novedades a tu base de clientes mayoristas con email</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Crear campaña
        </button>
      </div>

      {/* KPI Cards Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tasa de apertura</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-0.5">
              {campaigns.length > 0 ? '0%' : 'Sin envíos'}
            </h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <MousePointer size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tasa de clics</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-0.5">
              {campaigns.length > 0 ? '0%' : 'Sin envíos'}
            </h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Contactos con correo real</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : contactsWithEmail}
            </h4>
          </div>
        </div>
      </div>

      {/* Tabla de Campañas */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Historial de Campañas</h3>
          <span className="text-xs text-gray-500">{campaigns.length} campañas creadas</span>
        </div>
        
        {campaigns.length === 0 ? (
          <div className="p-12 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-[#ff7a59] flex items-center justify-center mx-auto mb-3">
              <Mail size={32} />
            </div>
            <h4 className="font-bold text-gray-800 text-base">Aún no hay campañas de correo creadas</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Crea tu primera campaña para notificar a los {contactsWithEmail} clientes mayoristas registrados con correo electrónico.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Plus size={14} /> Redactar primera campaña
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f5f8fa] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Campaña</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Destinatarios</th>
                  <th className="py-3 px-4">Apertura</th>
                  <th className="py-3 px-4">Clics</th>
                  <th className="py-3 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(camp => (
                  <tr key={camp.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900 text-sm">{camp.name}</p>
                      <p className="text-xs text-gray-500 truncate max-w-md">{camp.subject}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {camp.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                          <CheckCircle2 size={12} /> Enviada
                        </span>
                      )}
                      {camp.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-semibold">
                          <Clock size={12} /> Programada
                        </span>
                      )}
                      {camp.status === 'draft' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                          Borrador
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{camp.recipients_count}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{camp.open_rate}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{camp.click_rate}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 font-medium">{camp.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva campaña de correo</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre interno</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Catálogo Mayorista Nueva Temporada"
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Nuevas referencias disponibles para pedido mayorista"
                  value={cSubject}
                  onChange={e => setCSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold"
                >
                  Crear borrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
