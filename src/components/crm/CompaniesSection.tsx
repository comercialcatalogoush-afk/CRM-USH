'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, X, Mail, Phone, MapPin, Globe, Save, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrmCompany } from '@/types/crm';
import Company360Drawer from './Company360Drawer';
import { crmErrorText } from '@/lib/crmErrors';

type CompanyForm = {
  name: string;
  nit: string;
  industry: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
};

const EMPTY_FORM: CompanyForm = {
  name: '',
  nit: '',
  industry: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  notes: '',
};

export default function CompaniesSection() {
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [linkedContacts, setLinkedContacts] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmCompany | null>(null);
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CrmCompany | null>(null);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('crm_companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setCompanies((data as CrmCompany[]) || []);
      const { data: contacts, error: contactsErr } = await supabase
        .from('crm_contacts')
        .select('company_id');
      if (contactsErr) throw contactsErr;
      setLinkedContacts((contacts || []).filter((c: { company_id: string | null }) => !!c.company_id).length);
    } catch (e: any) {
      console.error('Error cargando empresas:', e?.message || e);
      setError(crmErrorText(e, 'No se pudieron cargar las empresas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (company: CrmCompany) => {
    setEditing(company);
    setForm({
      name: company.name || '',
      nit: company.nit || '',
      industry: company.industry || '',
      city: company.city || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      notes: company.notes || '',
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: form.name.trim(),
        nit: form.nit.trim() || null,
        industry: form.industry.trim() || null,
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error: err } = await supabase
          .from('crm_companies')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('crm_companies')
          .insert([payload])
          .select()
          .single();
        if (err) throw err;
      }
      setModalOpen(false);
      await loadCompanies();
    } catch (e: any) {
      console.error('Error guardando empresa:', e);
      setSaveError(e?.message || 'No se pudo guardar la empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company: CrmCompany) => {
    if (!window.confirm(`¿Eliminar la empresa "${company.name}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      const { error: err } = await supabase
        .from('crm_companies')
        .delete()
        .eq('id', company.id);
      if (err) throw err;
      await loadCompanies();
    } catch (e: any) {
      console.error('Error eliminando empresa:', e);
      setError(e?.message || 'No se pudo eliminar la empresa.');
    }
  };

  const filtered = companies.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.nit || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  const inputClass =
    'w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] font-medium';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1';

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2" role="alert">
          <span className="flex-shrink-0">{error}</span>
          <button onClick={loadCompanies} className="ml-auto text-neutral-400 hover:text-neutral-700 font-black flex items-center gap-1 uppercase tracking-wider">
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Empresas</p>
            <p className="text-2xl font-black text-[#1b2333] mt-1">{companies.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Con NIT</p>
            <p className="text-2xl font-black text-[#d88193] mt-1">
              {companies.filter((c) => c.nit && c.nit.trim()).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-[#d88193]">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Contactos Vinculados</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{linkedContacts}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Mail size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black uppercase text-[#1b2333] tracking-wide">
              Empresas
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Directorio de organizaciones, NIT y datos de contacto de cada empresa aliada.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa, NIT, industria o ciudad…"
                className="pl-9 pr-3 py-2 text-xs border border-gray-300 w-64 sm:w-80 focus:outline-none focus:border-[#d88193]"
              />
            </div>
            <button
              onClick={loadCompanies}
              disabled={loading}
              title="Refrescar lista"
              className="p-2 border border-gray-300 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openCreate}
              className="px-3 py-2 bg-[#1b2333] hover:bg-[#d88193] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Nueva Empresa
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1b2333] text-white uppercase text-[10px]">
              <tr>
                <th className="p-3">Empresa</th>
                <th className="p-3">Industria</th>
                <th className="p-3">Ciudad</th>
                <th className="p-3">Contacto</th>
                <th className="p-3">Sitio Web</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-400">
                    <RefreshCw size={18} className="animate-spin inline-block mr-2 text-[#d88193]" />
                    Cargando empresas…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-400">
                    {companies.length === 0 ? 'No hay empresas registradas aún.' : 'No se encontraron empresas con ese filtro.'}
                  </td>
                </tr>
              ) : (
                filtered.map((company) => (
                  <tr key={company.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-neutral-900 uppercase">{company.name}</div>
                      {company.nit && (
                        <span className="text-[10px] text-neutral-400 font-mono">NIT: {company.nit}</span>
                      )}
                    </td>

                    <td className="p-3 text-[11px] text-neutral-600">
                      {company.industry || <span className="text-neutral-400">—</span>}
                    </td>

                    <td className="p-3 text-[11px] text-neutral-600 flex items-center gap-1">
                      {company.city ? (
                        <>
                          <MapPin size={11} className="text-neutral-400 flex-shrink-0" />
                          {company.city}
                        </>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="p-3 space-y-0.5">
                      {company.email ? (
                        <div className="text-[11px] text-neutral-800 font-medium flex items-center gap-1 break-all">
                          <Mail size={11} className="text-neutral-400 flex-shrink-0" />
                          {company.email}
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Mail size={11} className="text-neutral-300 flex-shrink-0" />
                          Sin correo
                        </div>
                      )}
                      {company.phone && (
                        <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                          <Phone size={10} className="text-neutral-400 flex-shrink-0" />
                          {company.phone}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      {company.website ? (
                        <a
                          href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-neutral-800 font-medium flex items-center gap-1 hover:text-[#d88193] break-all"
                        >
                          <Globe size={11} className="text-neutral-400 flex-shrink-0" />
                          {company.website}
                        </a>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedCompany(company)}
                          title="Ver ficha 360 de la empresa"
                          className="p-2 border border-gray-200 hover:bg-[#1b2333] hover:text-white text-neutral-700 transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(company)}
                          title="Editar empresa"
                          className="px-2.5 py-1.5 bg-[#1b2333] hover:bg-[#d88193] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                          <Edit2 size={11} /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(company)}
                          title="Eliminar empresa"
                          className="px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={11} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-gray-200">
            <div className="bg-[#1b2333] text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-base font-black uppercase tracking-wide">
                  {editing ? 'Editar Empresa' : 'Nueva Empresa'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {editing ? editing.name : 'Registra una nueva organización en el directorio.'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {saveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nombre de la empresa"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>NIT</label>
                  <input
                    type="text"
                    value={form.nit}
                    onChange={(e) => setForm({ ...form, nit: e.target.value })}
                    placeholder="900.000.000-0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Industria</label>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="Textil, Retail, Distribución…"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Medellín"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="300 123 4567"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contacto@empresa.com"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Sitio Web</label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://www.empresa.com"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Anotaciones internas sobre la empresa…"
                    rows={4}
                    className={`${inputClass} resize-y`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-300 text-neutral-600 hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="px-4 py-2.5 bg-[#1b2333] hover:bg-[#d88193] disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                >
                  <Save size={14} /> {saving ? 'Guardando…' : 'Guardar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCompany && <Company360Drawer company={selectedCompany} onClose={() => setSelectedCompany(null)} />}
    </div>
  );
}