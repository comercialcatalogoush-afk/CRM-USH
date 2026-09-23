'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Layers, Plus, Search, Filter, Users, Tag, MapPin, CheckCircle2,
  Trash2, Edit3, ArrowRight, Loader2, Sparkles, RefreshCw, MessageCircle, Mail
} from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  criteria_type: string;
  criteria_value: string;
  contact_count: number;
}

export default function SegmentosSection() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [customSegments, setCustomSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form para crear nuevo segmento
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'city' | 'channel' | 'status'>('city');
  const [newValue, setNewValue] = useState('');

  // Cargar contactos reales
  const loadRealContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('crm_contacts').select('*');
      setContacts(data || []);
    } catch (e) {
      console.error('Error cargando contactos para segmentos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealContacts();
  }, [loadRealContacts]);

  // Generar segmentos dinámicos 100% reales a partir de los contactos existentes
  const computedSegments = useMemo<Segment[]>(() => {
    if (contacts.length === 0) return [];

    const list: Segment[] = [];

    // 1. Contactos con WhatsApp activo
    const waCount = contacts.filter(c => (c.whatsapp_number || c.phone)).length;
    list.push({
      id: 'seg_wa',
      name: 'Clientes con WhatsApp Activo',
      description: 'Contactos mayoristas con línea directa vinculada a chat',
      criteria_type: 'Canal',
      criteria_value: 'WhatsApp',
      contact_count: waCount,
    });

    // 2. Contactos con Correo Electrónico
    const emailCount = contacts.filter(c => c.email && c.email.trim().length > 0).length;
    list.push({
      id: 'seg_email',
      name: 'Clientes con Correo Electrónico',
      description: 'Base de clientes disponibles para recepción de catálogos y promociones por email',
      criteria_type: 'Canal',
      criteria_value: 'Email',
      contact_count: emailCount,
    });

    // 3. Agrupación por ciudades reales
    const citiesMap = new Map<string, number>();
    contacts.forEach(c => {
      const city = (c.city || '').trim();
      if (city) {
        citiesMap.set(city, (citiesMap.get(city) || 0) + 1);
      }
    });

    citiesMap.forEach((count, city) => {
      list.push({
        id: `seg_city_${city.toLowerCase().replace(/\s+/g, '_')}`,
        name: `Región ${city}`,
        description: `Boutiques y almacenes mayoristas ubicados en ${city}`,
        criteria_type: 'Ciudad',
        criteria_value: city,
        contact_count: count,
      });
    });

    // 4. Sumar los segmentos personalizados creados por el usuario
    customSegments.forEach(cs => {
      // Calcular conteo real
      let matchCount = 0;
      if (cs.criteria_type === 'city') {
        matchCount = contacts.filter(c => (c.city || '').toLowerCase().includes(cs.criteria_value.toLowerCase())).length;
      } else {
        matchCount = contacts.filter(c => JSON.stringify(c).toLowerCase().includes(cs.criteria_value.toLowerCase())).length;
      }
      list.push({
        ...cs,
        contact_count: matchCount,
      });
    });

    return list;
  }, [contacts, customSegments]);

  const filtered = computedSegments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
    s.criteria_value.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const item: Segment = {
      id: String(Date.now()),
      name: newTitle.trim(),
      description: newDesc.trim() || null,
      criteria_type: newType === 'city' ? 'Ciudad' : 'Personalizado',
      criteria_value: newValue.trim() || 'General',
      contact_count: 0,
    };
    setCustomSegments([item, ...customSegments]);
    setNewTitle('');
    setNewDesc('');
    setNewValue('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setCustomSegments(customSegments.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Segmentos de Clientes</h2>
            <p className="text-xs text-gray-500">Segmentación automática basada en los datos reales de tu base de clientes</p>
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
          placeholder="Buscar segmento por nombre o criterio real..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
        <span className="text-xs text-gray-400 font-medium mr-2">{filtered.length} segmentos</span>
      </div>

      {/* Grid de Segmentos */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-violet-600" />
          <span className="text-sm">Calculando segmentos reales...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-sm select-none">
          <div className="w-16 h-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
            <Layers size={32} />
          </div>
          <h4 className="font-bold text-gray-800 text-base">No hay segmentos para mostrar</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Crea tu primer segmento para clasificar contactos por ciudad o preferencias.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus size={14} /> Crear primer segmento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(seg => (
            <div
              key={seg.id}
              className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold uppercase tracking-wider">
                    <Tag size={12} /> {seg.criteria_type}: {seg.criteria_value}
                  </span>
                  {seg.id.startsWith('1') && (
                    <button
                      onClick={() => handleDelete(seg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                      title="Eliminar segmento"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">{seg.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{seg.description || 'Segmento calculado en tiempo real'}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-800 font-bold text-sm">
                  <Users size={16} className="text-[#ff7a59]" />
                  <span>{seg.contact_count} {seg.contact_count === 1 ? 'contacto' : 'contactos'}</span>
                </div>
                <span className="text-xs text-[#ff7a59] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Datos reales <CheckCircle2 size={13} className="text-emerald-500" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear segmento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Crear nuevo segmento personalizado</h3>
            <form onSubmit={handleCreateSegment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del segmento</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Mayoristas del Eje Cafetero"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Clientes con entregas en Manizales, Salamina y Pereira"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Criterio</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                >
                  <option value="city">Ciudad / Región</option>
                  <option value="status">Palabra clave en datos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor a filtrar</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Salamina / Medellín / Bucaramanga"
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
