'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Plus, Search, Star, Phone, Mail, Building2, MapPin,
  CheckCircle, ArrowRight, MessageSquare, Tag, Filter, MoreVertical, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Prospect {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  score: number;
  stage: 'nuevo' | 'contactado' | 'calificado' | 'descartado';
  notes: string;
}

interface ProspectsSectionProps {
  onOpenWaChat?: (jid: string) => void;
}

export default function ProspectsSection({ onOpenWaChat }: ProspectsSectionProps = {}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [pName, setPName] = useState('');
  const [pCompany, setPCompany] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pCity, setPCity] = useState('');
  const [pScore, setPScore] = useState(5);
  const [pNotes, setPNotes] = useState('');

  // Cargar contactos reales de Supabase que funcionen como prospectos / leads
  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        const mapped: Prospect[] = data.map((c: any) => ({
          id: c.id,
          name: c.full_name || 'Sin nombre',
          company: c.company || 'Comercial Independiente',
          phone: c.whatsapp_number || c.phone || '',
          email: c.email || '',
          city: c.city || 'Colombia',
          score: 5,
          stage: 'contactado',
          notes: c.notes || 'Contacto registrado en CRM',
        }));
        setProspects(mapped);
      }
    } catch (e) {
      console.error('Error cargando prospectos reales:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  const filtered = prospects.filter(p => {
    if (filterStage !== 'all' && p.stage !== filterStage) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    setSaving(true);
    try {
      const cleanPhone = pPhone.replace(/\D/g, '');
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({
          full_name: pName.trim(),
          company: pCompany.trim() || null,
          phone: cleanPhone || null,
          whatsapp_number: cleanPhone || null,
          email: pEmail.trim() || null,
          city: pCity.trim() || null,
          notes: pNotes.trim() ? `[Score ${pScore}⭐] ${pNotes.trim()}` : null,
        })
        .select()
        .single();

      if (data) {
        const newP: Prospect = {
          id: data.id,
          name: data.full_name,
          company: data.company || 'Comercial Independiente',
          phone: data.whatsapp_number || data.phone || '',
          email: data.email || '',
          city: data.city || 'Colombia',
          score: pScore,
          stage: 'nuevo',
          notes: pNotes.trim(),
        };
        setProspects([newP, ...prospects]);
      }
      setPName('');
      setPCompany('');
      setPPhone('');
      setPEmail('');
      setPCity('');
      setPNotes('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creando prospecto:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenWhatsApp = (phoneStr: string) => {
    const raw = phoneStr.replace(/\D/g, '');
    if (!raw) return;
    const fullDigits = raw.startsWith('57') ? raw : `57${raw}`;
    const jid = `${fullDigits}@s.whatsapp.net`;
    if (onOpenWaChat) {
      onOpenWaChat(jid);
    } else {
      window.open(`https://wa.me/${fullDigits}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
            <UserPlus size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Gestión de Prospectos & Leads</h2>
            <p className="text-xs text-gray-500">Contactos calificados con potencial de compra mayorista vinculados a WhatsApp</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Nuevo prospecto
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-sm">
          <Search size={18} className="text-gray-400 ml-1" />
          <input
            type="text"
            placeholder="Buscar prospecto por nombre, tienda, ciudad o WhatsApp..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200/80 shadow-sm overflow-x-auto">
          {['all', 'nuevo', 'contactado', 'calificado'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStage(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all select-none ${
                filterStage === st
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st === 'all' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Prospectos */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-[#ff7a59]" />
          <span className="text-sm">Cargando prospectos reales...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-sm select-none">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <UserPlus size={32} />
          </div>
          <h4 className="font-bold text-gray-800 text-base">No hay prospectos que coincidan</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Registra nuevos prospectos para hacerles seguimiento comercial e iniciar chat en WhatsApp.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus size={14} /> Registrar primer prospecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      p.stage === 'calificado'
                        ? 'bg-emerald-50 text-emerald-700'
                        : p.stage === 'contactado'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {p.stage}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={i < p.score ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-base">{p.name}</h3>
                <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5 mt-0.5 mb-3">
                  <Building2 size={13} className="text-gray-400" /> {p.company}
                </p>

                <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-gray-400" />
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(p.phone)}
                      className="text-[#25D366] font-semibold hover:underline"
                    >
                      +{p.phone}
                    </button>
                  </div>
                  {p.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-gray-400" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-gray-400" />
                    <span>{p.city}</span>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-gray-500 italic bg-amber-50/60 border border-amber-100/80 p-2.5 rounded-xl mb-4 leading-relaxed">
                    "{p.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(p.phone)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <MessageSquare size={13} /> Chat WhatsApp
                </button>
                <button
                  onClick={() => {
                    setProspects(prospects.map(it => it.id === p.id ? { ...it, stage: 'calificado' } : it));
                  }}
                  className="text-xs font-semibold text-[#ff7a59] hover:underline"
                >
                  Calificar lead →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar nuevo prospecto</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre completo</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Juliana Castro"
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Empresa / Negocio</label>
                  <input
                    type="text"
                    placeholder="Ej: Boutique Sol"
                    value={pCompany}
                    onChange={e => setPCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ciudad</label>
                  <input
                    type="text"
                    placeholder="Ej: Medellín"
                    value={pCity}
                    onChange={e => setPCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">WhatsApp</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: 3001234567"
                    value={pPhone}
                    onChange={e => setPPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Ej: boutique@gmail.com"
                    value={pEmail}
                    onChange={e => setPEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Puntuación / Interés</label>
                <select
                  value={pScore}
                  onChange={e => setPScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ff7a59]"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 estrellas (Listo para comprar)</option>
                  <option value={4}>⭐⭐⭐⭐ 4 estrellas (Muy interesado)</option>
                  <option value={3}>⭐⭐⭐ 3 estrellas (Interés medio)</option>
                  <option value={2}>⭐⭐ 2 estrellas (Solo preguntó precio)</option>
                  <option value={1}>⭐ 1 estrella (Bajo interés)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notas iniciales</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre lo que busca o cómo contactó"
                  value={pNotes}
                  onChange={e => setPNotes(e.target.value)}
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
                  disabled={saving}
                  className="px-4 py-2 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Registrar prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
