'use client';
import React, { useState } from 'react';
import {
  Mail, Plus, Send, Clock, CheckCircle2, AlertCircle, Eye, MousePointer,
  Users, Sparkles, Filter, Search, ChevronRight, BarChart2
} from 'lucide-react';

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Lanzamiento Colección Denim Otoño',
      subject: '🔥 Nuevas referencias de jeans tiro alto disponibles para mayoristas',
      status: 'sent',
      recipients_count: 85,
      open_rate: '48.2%',
      click_rate: '22.1%',
      date: '2026-09-15',
    },
    {
      id: '2',
      name: 'Promo Mayorista Especial: Pack Surtido',
      subject: '📦 Descuento exclusivo del 10% en pedidos superiores a 12 unidades',
      status: 'sent',
      recipients_count: 110,
      open_rate: '54.0%',
      click_rate: '28.5%',
      date: '2026-09-08',
    },
    {
      id: '3',
      name: 'Reposición Stock Jeans Cargo & Vaquero',
      subject: 'Llegaron reposiciones de las referencias más vendidas',
      status: 'scheduled',
      recipients_count: 94,
      open_rate: '-',
      click_rate: '-',
      date: '2026-09-25 (Programado)',
    },
    {
      id: '4',
      name: 'Boletín Tendencias Moda Juvenil TEENS',
      subject: 'Descubre las prendas que están marcando tendencia',
      status: 'draft',
      recipients_count: 60,
      open_rate: '-',
      click_rate: '-',
      date: 'Borrador',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cSubject, setCSubject] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    const newCamp: Campaign = {
      id: String(Date.now()),
      name: cName.trim(),
      subject: cSubject.trim() || 'Sin asunto',
      status: 'draft',
      recipients_count: 50,
      open_rate: '-',
      click_rate: '-',
      date: 'Borrador',
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
            <p className="text-xs text-gray-500">Envía catálogos, promociones y novedades a tu base de clientes mayoristas</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Crear campaña
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tasa promedio de apertura</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-0.5">51.1%</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <MousePointer size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tasa promedio de clics</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-0.5">25.3%</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Contactos alcanzados</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-0.5">195</h4>
          </div>
        </div>
      </div>

      {/* Tabla de Campañas */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Historial de Campañas</h3>
          <span className="text-xs text-gray-500">{campaigns.length} campañas creadas</span>
        </div>
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
                  placeholder="Ej: Catálogo Primavera 2026"
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Descubre la nueva colección con precios mayoristas"
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
                  Crear campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
