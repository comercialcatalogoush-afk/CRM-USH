'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Save,
  RefreshCw,
  ExternalLink,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { CrmContact, CrmCompany } from '@/types/crm';
import Contact360Drawer from './Contact360Drawer';
import { crmErrorText } from '@/lib/crmErrors';

type Feedback = { type: 'success' | 'error'; msg: string } | null;

type ContactForm = {
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  city: string;
  company: string;
  company_id: string;
  tags: string;
  notes: string;
};

const EMPTY_FORM: ContactForm = {
  full_name: '',
  email: '',
  phone: '',
  whatsapp_number: '',
  city: '',
  company: '',
  company_id: '',
  tags: '',
  notes: '',
};

function normalizeWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('57') ? digits : `57${digits}`;
}

function normalizePhoneKey(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

function normalizeEmailKey(value?: string | null): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeTextKey(value?: string | null): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export default function ContactSection() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<CrmContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [warnDuplicate, setWarnDuplicate] = useState<CrmContact | null>(null);
  const [forceDuplicate, setForceDuplicate] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        supabase.from('crm_contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_companies').select('id,name').order('name', { ascending: true }),
      ]);
      if (contactsRes.error) throw contactsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      setContacts((Array.isArray(contactsRes.data) ? contactsRes.data : []) as CrmContact[]);
      setCompanies((Array.isArray(companiesRes.data) ? companiesRes.data : []) as CrmCompany[]);
    } catch (e) {
      const msg = crmErrorText(e, 'No se pudieron cargar los contactos.');
      setLoadError(msg);
      setFeedback({ type: 'error', msg: 'Error al cargar los contactos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [
        c.full_name,
        c.email,
        c.phone,
        c.whatsapp_number,
        c.city,
        c.company,
        Array.isArray(c.tags) ? c.tags.join(' ') : '',
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const withWhatsApp = contacts.filter((c) => (c.whatsapp_number || '').replace(/\D/g, '').length > 0).length;
  const withEmail = contacts.filter((c) => (c.email || '').trim().length > 0).length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFeedback(null);
    setForceDuplicate(false);
    setWarnDuplicate(null);
    setModalOpen(true);
  };

  const openEdit = (contact: CrmContact) => {
    setEditing(contact);
    setForm({
      full_name: contact.full_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp_number: contact.whatsapp_number || '',
      city: contact.city || '',
      company: contact.company || '',
      company_id: contact.company_id || '',
      tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
      notes: contact.notes || '',
    });
    setFeedback(null);
    setForceDuplicate(false);
    setWarnDuplicate(null);
    setModalOpen(true);
  };

  const setField = (field: keyof ContactForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const findDuplicate = (): CrmContact | null => {
    const emailKey = normalizeEmailKey(form.email);
    const phoneKey = normalizePhoneKey(form.phone) || normalizePhoneKey(form.whatsapp_number);
    const nameKey = normalizeTextKey(form.full_name);

    if (!emailKey && !phoneKey) return null;

    return (
      contacts.find((c) => {
        if (c.id === editing?.id) return false;
        if (emailKey && normalizeEmailKey(c.email) === emailKey) return true;
        const cPhone = normalizePhoneKey(c.phone) || normalizePhoneKey(c.whatsapp_number);
        if (phoneKey && cPhone && cPhone === phoneKey) return true;
        if (!emailKey && !phoneKey) {
          return normalizeTextKey(c.full_name) === nameKey && nameKey.length > 0;
        }
        return false;
      }) || null
    );
  };

  const saveContact = async () => {
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp_number: form.whatsapp_number.trim() || null,
      city: form.city.trim() || null,
      company: form.company.trim() || null,
      company_id: form.company_id || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: form.notes.trim() || null,
    };

    try {
      if (editing) {
        const { data, error } = await supabase
          .from('crm_contacts')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setContacts((prev) => prev.map((c) => (c.id === editing.id ? (data as CrmContact) : c)));
        }
        setFeedback({ type: 'success', msg: 'Contacto actualizado correctamente.' });
      } else {
        const { data, error } = await supabase
          .from('crm_contacts')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setContacts((prev) => [data as CrmContact, ...prev]);
        }
        setFeedback({ type: 'success', msg: 'Contacto creado correctamente.' });
      }
      setModalOpen(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Ocurrió un error al guardar el contacto.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.full_name.trim()) {
      setFeedback({ type: 'error', msg: 'El nombre es un campo obligatorio.' });
      return;
    }
    setSaving(true);
    setFeedback(null);

    if (!editing && !forceDuplicate) {
      const dup = findDuplicate();
      if (dup) {
        setWarnDuplicate(dup);
        setSaving(false);
        return;
      }
    }

    setForceDuplicate(false);
    await saveContact();
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const { error } = await supabase.from('crm_contacts').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: 'Contacto eliminado correctamente.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Ocurrió un error al eliminar el contacto.',
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="alert"
          className={`p-4 text-xs font-bold flex items-start gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span className="flex-shrink-0">{feedback.type === 'success' ? 'OK' : 'Error'}</span>
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Contactos</p>
            <p className="text-2xl font-black text-[#1b2333] mt-1">{contacts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Con WhatsApp</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{withWhatsApp}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Phone size={20} />
          </div>
        </div>

        <div className="bg-white p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Con Email</p>
            <p className="text-2xl font-black text-ush-pink mt-1">{withEmail}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-ush-pink">
            <Mail size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black uppercase text-[#1b2333] tracking-wide">Contactos CRM</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Gestiona tus clientes comerciales, etiquetas y canales de comunicación.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nombre, email, teléfono, ciudad o empresa…"
                className="pl-9 pr-3 py-2 text-xs border border-gray-300 w-64 sm:w-80 focus:outline-none focus:border-[#d88193]"
              />
            </div>
            <button
              onClick={loadContacts}
              disabled={loading}
              title="Refrescar lista"
              className="p-2 border border-gray-300 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-ush-navy hover:bg-[#d88193] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 shadow-sm transition-colors"
            >
              <Plus size={14} />
              Nuevo Contacto
            </button>
          </div>
        </div>

        {loadError && (
          <div
            className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold"
            role="alert"
          >
            {loadError}
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1b2333] text-white uppercase text-[10px]">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Contacto</th>
                <th className="p-3">Ciudad / Empresa</th>
                <th className="p-3">Tags</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-400">
                    <RefreshCw size={18} className="animate-spin inline-block mr-2 text-[#d88193]" />
                    Cargando contactos…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-400">
                    {contacts.length === 0
                      ? 'Aún no hay contactos registrados.'
                      : 'No hay contactos que coincidan con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-neutral-900 uppercase">{contact.full_name || 'Sin nombre'}</div>
                      {contact.notes && (
                        <div className="text-[10px] text-neutral-400 max-w-xs truncate">{contact.notes}</div>
                      )}
                    </td>

                    <td className="p-3 space-y-0.5">
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={11} className="text-neutral-400 flex-shrink-0" />
                          <span className="text-[11px] text-neutral-800 font-medium break-all">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-neutral-400 flex-shrink-0" />
                          <span className="text-[10px] text-neutral-500 font-mono">{contact.phone}</span>
                        </div>
                      )}
                      {(contact.whatsapp_number || contact.phone) && (
                        <a
                          href={`https://wa.me/${normalizeWhatsApp(contact.whatsapp_number ?? contact.phone ?? '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir WhatsApp"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-[10px]"
                        >
                          <ExternalLink size={10} />
                          WhatsApp
                        </a>
                      )}
                    </td>

                    <td className="p-3 text-[11px] text-neutral-600">
                      {contact.city ? (
                        <div className="flex items-center gap-1 font-semibold text-neutral-800">
                          <MapPin size={11} className="text-neutral-400 flex-shrink-0" />
                          {contact.city}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-neutral-300 flex-shrink-0" />
                          <span className="text-neutral-400">—</span>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center gap-1 mt-0.5 text-neutral-500">
                          <Building2 size={11} className="text-neutral-300 flex-shrink-0" />
                          {contact.company}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag, index) => (
                            <span
                              key={`${contact.id}-${index}`}
                              className="whitespace-nowrap bg-[#1b2333] text-white text-[10px] font-bold uppercase px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedContact(contact)}
                          title="Ver ficha 360 del contacto"
                          className="p-2 border border-gray-200 hover:bg-[#1b2333] hover:text-white text-neutral-700 transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(contact)}
                          title="Editar contacto"
                          className="p-2 border border-gray-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(contact)}
                          title="Eliminar contacto"
                          className="p-2 border border-gray-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-700 transition-colors"
                        >
                          <Trash2 size={13} />
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
          <div className="bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-gray-200">
            <div className="bg-[#1b2333] text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-base font-black uppercase tracking-wide">
                  {editing ? 'Editar Contacto' : 'Nuevo Contacto'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {editing ? `Editando: ${editing.full_name}` : 'Registra un nuevo contacto comercial.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                  setForm(EMPTY_FORM);
                }}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={setField('full_name')}
                  placeholder="Nombre y apellido del contacto"
                  className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={setField('email')}
                    placeholder="correo@ejemplo.com"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={setField('phone')}
                    placeholder="Ej: 3001234567"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={setField('whatsapp_number')}
                  placeholder="Número para WhatsApp"
                  className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={setField('city')}
                    placeholder="Ciudad del contacto"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Empresa (directorio)
                  </label>
                  <select
                    value={form.company_id}
                    onChange={(e) => {
                      const companyId = e.target.value;
                      const companyName = companies.find((c) => c.id === companyId)?.name || '';
                      setForm((prev) => ({ ...prev, company_id: companyId, company: companyName }));
                    }}
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193] bg-white"
                  >
                    <option value="">Ninguna / Otra…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || 'Sin nombre'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Otra empresa (texto libre)
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Nombre del negocio (si no está en el directorio)"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Tags (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={setField('tags')}
                    placeholder="Ej: mayorista, fidelizado, medellín"
                    className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  rows={3}
                  placeholder="Notas internas sobre este contacto"
                  className="w-full border border-gray-300 p-3 text-xs text-neutral-900 focus:outline-none focus:border-[#d88193]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditing(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="flex-1 border border-gray-300 hover:bg-neutral-50 text-neutral-700 font-bold py-3 text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#1b2333] hover:bg-[#d88193] text-white font-bold py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {editing ? 'Guardar Cambios' : 'Crear Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1b2333] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={18} className="text-[#d88193]" />
                <h3 className="text-base font-black uppercase tracking-wide">Eliminar contacto</h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-3 rounded-md">
                <Trash2 size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 leading-relaxed">
                  Esta acción <strong>es permanente</strong> e irreversible. Se eliminará de Supabase el contacto{' '}
                  <strong className="break-all">{deleteTarget.full_name}</strong>
                  {deleteTarget.email ? ` (${deleteTarget.email})` : ''} y todos sus datos.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full bg-[#1b2333] hover:bg-[#d88193] text-white font-bold py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Eliminando…' : 'Sí, Eliminar Contacto'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-full border border-gray-300 hover:bg-neutral-50 text-neutral-700 font-bold py-2.5 text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    {warnDuplicate && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-amber-500 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <h3 className="text-base font-black uppercase tracking-wide">Posible contacto duplicado</h3>
              </div>
              <button onClick={() => setWarnDuplicate(null)} className="p-1 text-white/80 hover:text-white rounded-md">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Ya existe un contacto con el mismo correo o teléfono/WhatsApp:{' '}
                <strong className="text-neutral-900">{warnDuplicate.full_name}</strong>
                {warnDuplicate.email ? ` (${warnDuplicate.email})` : ''}.
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Crearlo de nuevo puede duplicar la información. Puedes continuar o ver su ficha antes de decidir.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setWarnDuplicate(null);
                    setSelectedContact(warnDuplicate);
                    setForceDuplicate(true);
                  }}
                  className="w-full border border-gray-300 hover:bg-neutral-50 text-neutral-700 font-bold py-3 text-xs uppercase tracking-wider transition-colors"
                >
                  Ver ficha del contacto existente
                </button>
                <button
                  onClick={() => {
                    setForceDuplicate(true);
                    setWarnDuplicate(null);
                    setSaving(true);
                    setFeedback(null);
                    void saveContact();
                  }}
                  className="w-full bg-[#1b2333] hover:bg-[#d88193] text-white font-bold py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                  Continuar y crear de todos modos
                </button>
                <button
                  type="button"
                  onClick={() => setWarnDuplicate(null)}
                  className="w-full border border-gray-300 hover:bg-neutral-50 text-neutral-700 font-bold py-2.5 text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedContact && <Contact360Drawer contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  );
}