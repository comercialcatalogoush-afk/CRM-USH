'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Layers, Plus, Search, Filter, Users, Tag, MapPin, CheckCircle2,
  Trash2, Edit3, ArrowRight, Loader2, Sparkles, RefreshCw
} from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  criteria_type: string;
  criteria_value: string;
  contact_count: number;
  created_at: string;
}

export default function SegmentosSection() {
  const [segments, setSegments] = useState<Segment[]>([
    {
      id: '1',
      name: 'Clientes Mayoristas Activos',
      description: 'Contactos con compras en los últimos 30 días',
      criteria_type: 'status',
      criteria_value: 'active_wholesale',
      contact_count: 24,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Bogotá y Cundinamarca',
      description: 'Boutiques y almacenes en la región central',
      criteria_type: 'city',
      criteria_value: 'Bogota',
      contact_count: 18,
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Clientes VIP (Más de 50 prendas)',
      description: 'Compradores de alto volumen para lanzamientos exclusivos',
      criteria_type: 'volume',
      criteria_value: 'vip',
      contact_count: 9,
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Prospectos WhatsApp sin pedido',
      description: 'Preguntaron por catálogo pero aún no compran',
      criteria_type: 'source',
      criteria_value: 'whatsapp_lead',
      contact_count: 32,
      created_at: new Date().toISOString(),
    },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('city');
  const [newValue, setNewValue] = useState('');

  const filtered = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: Segment = {
      id: String(Date.now()),
      name: newTitle.trim(),
      description: newDesc.trim() || null,
      criteria_type: newType,
      criteria_value: newValue.trim() || 'General',
      contact_count: Math.floor(Math.random() * 15) + 5,
      created_at: new Date().toISOString(),
    };
    setSegments([item, ...segments]);
    setNewTitle('');
    setNewDesc('');
    setNewValue('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Segmentos de Contactos</h2>
              <p className="text-xs text-gray-500">Agrupa tus clientes mayoristas por ciudad, volumen de compra y comportamiento</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} /> Crear segmento
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-sm">
        <Search size={18} className="text-gray-400 ml-1" />
        <input
          type="text"
          placeholder="Buscar segmento por nombre o criterio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
        <span className="text-xs text-gray-400 font-medium mr-2">{filtered.length} segmentos</span>
      </div>

      {/* Grid de Segmentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(seg => (
          <div
            key={seg.id}
            className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold uppercase tracking-wider">
                  <Tag size={12} /> {seg.criteria_type}
                </span>
                <button
                  onClick={() => handleDelete(seg.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                  title="Eliminar segmento"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">{seg.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{seg.description || 'Sin descripción'}</p>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm">
                <Users size={16} className="text-[#ff7a59]" />
                <span>{seg.contact_count} contactos</span>
              </div>
              <span className="text-xs text-[#ff7a59] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer">
                Ver contactos <ArrowRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear segmento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Crear nuevo segmento</h3>
            <form onSubmit={handleCreateSegment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del segmento</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Mayoristas Medellín"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Clientes con pedidos frecuentes de jeans flare"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Criterio de filtro</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                >
                  <option value="city">Ciudad o Departamento</option>
                  <option value="volume">Volumen de compra (VIP / Regular)</option>
                  <option value="status">Estado del cliente</option>
                  <option value="source">Origen del lead (WhatsApp / Web / Referido)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor del criterio</label>
                <input
                  type="text"
                  placeholder="Ej: Medellín / VIP / Activo"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
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
                  Guardar segmento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
