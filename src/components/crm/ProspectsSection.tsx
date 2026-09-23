'use client';
import React, { useState } from 'react';
import {
  UserPlus, Plus, Search, Star, Phone, Mail, Building2, MapPin,
  CheckCircle, ArrowRight, MessageSquare, Tag, Filter, MoreVertical
} from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  score: number; // 1 to 5 stars
  stage: 'nuevo' | 'contactado' | 'calificado' | 'descartado';
  notes: string;
}

export default function ProspectsSection() {
  const [prospects, setProspects] = useState<Prospect[]>([
    {
      id: '1',
      name: 'Laura Gómez',
      company: 'Boutique D’Lujo',
      phone: '3124567890',
      email: 'contacto@dlujo.com',
      city: 'Medellín',
      score: 5,
      stage: 'calificado',
      notes: 'Interesada en lote inicial de 30 jeans flare y vaquero.',
    },
    {
      id: '2',
      name: 'Carlos Andrés Mendoza',
      company: 'Moda Urbana Jeans',
      phone: '3109876543',
      email: 'carlos@modaurbana.co',
      city: 'Bogotá',
      score: 4,
      stage: 'contactado',
      notes: 'Solicitó lista de precios al por mayor por WhatsApp.',
    },
    {
      id: '3',
      name: 'Andrea Restrepo',
      company: 'Tienda Pasarela',
      phone: '3187654321',
      email: 'pasarela.cali@gmail.com',
      city: 'Cali',
      score: 4,
      stage: 'calificado',
      notes: 'Quiere surtido con la colección juvenil TEENS.',
    },
    {
      id: '4',
      name: 'Felipe Jaramillo',
      company: 'Distribuidora Eje Cafetero',
      phone: '3151234567',
      email: 'felipe@distrieje.com',
      city: 'Pereira',
      score: 3,
      stage: 'nuevo',
      notes: 'Escribió por el botón de WhatsApp de la página web.',
    },
    {
      id: '5',
      name: 'Marcela Suárez',
      company: 'Almacén Chic',
      phone: '3203456789',
      email: 'marcela@almacenchic.com',
      city: 'Barranquilla',
      score: 2,
      stage: 'contactado',
      notes: 'Preguntó por tiempos de despacho y costos de flete.',
    },
  ]);

  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [pName, setPName] = useState('');
  const [pCompany, setPCompany] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pCity, setPCity] = useState('');
  const [pScore, setPScore] = useState(4);
  const [pNotes, setPNotes] = useState('');

  const filtered = prospects.filter(p => {
    if (selectedStage !== 'todos' && p.stage !== selectedStage) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    const item: Prospect = {
      id: String(Date.now()),
      name: pName.trim(),
      company: pCompany.trim() || 'Particular',
      phone: pPhone.trim(),
      email: pEmail.trim(),
      city: pCity.trim() || 'Colombia',
      score: pScore,
      stage: 'nuevo',
      notes: pNotes.trim() || 'Lead registrado desde CRM',
    };
    setProspects([item, ...prospects]);
    setPName('');
    setPCompany('');
    setPPhone('');
    setPEmail('');
    setPCity('');
    setPNotes('');
    setIsModalOpen(false);
  };

  const getStageBadge = (stage: Prospect['stage']) => {
    switch (stage) {
      case 'calificado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Calificado ⭐</span>;
      case 'contactado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">Contactado</span>;
      case 'nuevo':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Nuevo Lead</span>;
      case 'descartado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Descartado</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <UserPlus size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Prospectos & Leads de Ventas</h2>
            <p className="text-xs text-gray-500">Clasifica y da seguimiento a los compradores interesados antes de convertirlos en clientes fijos</p>
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
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex-1 flex items-center gap-2 px-2">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa, teléfono o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
          {['todos', 'nuevo', 'contactado', 'calificado'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStage(st)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors ${
                selectedStage === st
                  ? 'bg-[#33475b] text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Prospectos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div
            key={p.id}
            className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                {getStageBadge(p.stage)}
                <div className="flex items-center gap-0.5 text-amber-400">
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
                  <a href={`https://wa.me/57${p.phone}`} target="_blank" rel="noreferrer" className="text-[#25D366] font-semibold hover:underline">
                    +{p.phone}
                  </a>
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
              <a
                href={`https://wa.me/57${p.phone}?text=Hola%20${encodeURIComponent(p.name)},%20te%20escribo%20de%20Ush%20By%20Ushuaia`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageSquare size={13} /> Chat WhatsApp
              </a>
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
                  className="px-4 py-2 bg-[#ff7a59] hover:bg-[#e66343] text-white rounded-xl text-sm font-semibold"
                >
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
