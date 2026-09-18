'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import {
  MessageCircle, Smartphone, QrCode, RefreshCw, Search, Send,
  Inbox, CheckCheck, ChevronLeft, Loader2,
} from 'lucide-react';
import { CrmWaSession, CrmWaChat, CrmWaMessage, WaSessionStatus } from '@/types/wa';
import { crmErrorText } from '@/lib/crmErrors';

const SESSION_COLORS: Record<WaSessionStatus, string> = {
  disconnected: 'bg-neutral-200 text-neutral-700',
  connecting: 'bg-amber-100 text-amber-800',
  paired: 'bg-emerald-100 text-emerald-800',
  syncing: 'bg-sky-100 text-sky-800',
};

export default function WhatsappSection() {
  const [session, setSession] = useState<CrmWaSession | null>(null);
  const [chats, setChats] = useState<CrmWaChat[]>([]);
  const [messages, setMessages] = useState<CrmWaMessage[]>([]);
  const [activeChat, setActiveChat] = useState<CrmWaChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, chatsRes, contactsRes] = await Promise.all([
        supabase.from('crm_wa_sessions').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('crm_wa_chats').select('*').order('last_message_at', { ascending: false }),
        supabase.from('crm_contacts').select('id,full_name,whatsapp_number'),
      ]);
      if (sessRes.error) throw sessRes.error;
      if (chatsRes.error) throw chatsRes.error;
      if (contactsRes.error) throw contactsRes.error;
      const contacts = (Array.isArray(contactsRes.data) ? contactsRes.data : []) as { id: string; full_name: string; whatsapp_number: string | null }[];
      const nameMap = new Map<string, string>();
      contacts.forEach((c) => {
        if (c.whatsapp_number) nameMap.set(c.whatsapp_number.replace(/\D/g, ''), c.full_name);
      });
      const loadedChats = ((chatsRes.data || []) as CrmWaChat[]).map((ch) => ({
        ...ch,
        contact_name: ch.phone ? nameMap.get(ch.phone.replace(/\D/g, '')) : null,
      }));
      setSession((sessRes.data as CrmWaSession) || null);
      setChats(loadedChats);
    } catch (e) {
      setError(crmErrorText(e, 'No se pudieron cargar los chats de WhatsApp.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openChat = async (chat: CrmWaChat) => {
    setActiveChat(chat);
    setMessages([]);
    try {
      const { data, error: perr } = await supabase
        .from('crm_wa_messages')
        .select('*')
        .eq('chat_jid', chat.jid)
        .order('timestamp', { ascending: true });
      if (perr) throw perr;
      setMessages(((data || []) as CrmWaMessage[]).slice(-100));
    } catch (e) {
      setError(crmErrorText(e, 'No se pudieron cargar los mensajes.'));
    }
  };

  const sendMessage = async () => {
    if (!activeChat || !draft.trim()) return;
    const text = draft.trim();
    setSending(true);
    try {
      // Fase 1: se registra en la cola; el bridge local (whatmeow) lo entrega.
      const { error: serr } = await supabase.from('crm_wa_messages').insert({
        chat_jid: activeChat.jid,
        content: text,
        is_from_me: true,
        timestamp: new Date().toISOString(),
        media_type: null,
      });
      if (serr) throw serr;
      setDraft('');
      await openChat(activeChat);
    } catch (e) {
      setError(crmErrorText(e, 'No se pudo enviar el mensaje.'));
    } finally {
      setSending(false);
    }
  };

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [chats, search]);

  const statusLabel = session ? (session.status === 'connecting' ? 'Sincronizar WhatsApp' : 'WhatsApp conectado') : 'WhatsApp';
  const statusHint = !session
    ? 'Conecta el WhatsApp del negocio para ver sus conversaciones en el CRM.'
    : session.status === 'connecting'
    ? 'Escanea el código QR con el WhatsApp del negocio (Como en WhatsApp Web).'
    : session.status === 'paired' || session.status === 'syncing'
    ? 'Los chats se sincronizan automáticamente.'
    : 'El dispositivo no está conectado. Reintenta la vinculación.';

  const renderQrPanel = () => {
    if (session && (session.status === 'paired' || session.status === 'syncing')) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <CheckCheck size={30} />
          </div>
          <h2 className="text-lg font-black text-[#1b2333] uppercase">WhatsApp vinculado</h2>
          <p className="text-xs text-neutral-500 font-light mt-2 max-w-xs">
            Las conversaciones están sincronizadas con el CRM por número {session.phone || 'del negocio'}.
          </p>
          <button onClick={loadAll} className="mt-6 text-xs font-bold text-[#1b2333] border border-[#1b2333] px-4 py-2 hover:bg-[#1b2333] hover:text-white transition-all flex items-center gap-2">
            <RefreshCw size={13} /> Actualizar chats
          </button>
        </div>
      );
    }

    const qrValue = session?.qr_secret;
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-14 h-14 rounded-full bg-[#1b2333] text-white flex items-center justify-center mb-4 shadow-md">
          <QrCode size={26} />
        </div>
        <h2 className="text-lg font-black text-[#1b2333] uppercase">Vincula WhatsApp</h2>
        <p className="text-xs text-neutral-500 font-light mt-2 max-w-xs">
          Abre WhatsApp en el celular del negocio → Ajustes → Dispositivos vinculados → Vincular dispositivo y escanea el código.
        </p>
        <div className="bg-white border border-neutral-200 p-4 shadow-md mt-6">
          {qrValue ? (
            <QRCodeSVG value={qrValue} size={200} fgColor="#1b2333" level="M" />
          ) : (
            <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-neutral-300">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-[10px] mt-3 font-bold">Esperando código…</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-neutral-400 mt-4 font-light">
          El QR se genera automáticamente al iniciar la vinculación desde el puente WhatsApp.
        </p>
      </div>
    );
  };

  if (loading && !session) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center text-neutral-400">
        <Loader2 size={26} className="animate-spin mb-3" />
        <span className="text-xs font-bold">Cargando WhatsApp…</span>
      </div>
    );
  }

  if (error && !session && !chats.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-sm font-bold text-red-600 mb-2">No se pudo conectar con WhatsApp</p>
        <p className="text-xs text-neutral-500 font-light mb-4">{error}</p>
        <button onClick={loadAll} className="text-xs font-bold text-[#1b2333] border border-[#1b2333] px-4 py-2 hover:bg-[#1b2333] hover:text-white transition-all inline-flex items-center gap-2">
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1b2333] uppercase tracking-wide">{statusLabel}</h2>
            <p className="text-[10px] text-neutral-500 font-light">{statusHint}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-1 ${SESSION_COLORS[session?.status || 'disconnected']}`}>
            {session ? (session.status === 'connecting' ? 'Pendiente de escaneo' : 'En línea') : 'Sin sesión'}
          </span>
          <button onClick={loadAll} className="p-2 border border-gray-200 text-neutral-500 hover:bg-neutral-50" title="Actualizar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] min-h-[520px]">
        {/* Columna izquierda: lista de chats */}
        <div className="border-r border-gray-200 flex flex-col bg-neutral-50">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar chats…"
                className="w-full border border-gray-200 pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:border-ush-pink"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 flex flex-col items-center">
                <Inbox size={24} className="mb-2" />
                <p className="text-xs font-bold">Sin conversaciones</p>
                <p className="text-[10px] font-light">Los chats sincronizados aparecerán aquí.</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 hover:bg-white transition-all ${
                    activeChat?.jid === chat.jid ? 'bg-white shadow-inner' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#1b2333] text-white flex items-center justify-center shrink-0">
                    <Smartphone size={16} className="text-[#d88193]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1b2333] truncate">
                      {chat.contact_name || chat.name || (chat.phone ? `+${chat.phone}` : 'Chat sin nombre')}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-light truncate">{chat.phone ? `+${chat.phone}` : chat.jid}</p>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="bg-[#25D366] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {chat.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Columna derecha: QR / mensajes */}
        <div className="bg-neutral-50">
          {!activeChat ? (
            renderQrPanel()
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
                <button onClick={() => setActiveChat(null)} className="p-1.5 border border-gray-200 text-neutral-500 hover:bg-neutral-50 md:hidden">
                  <ChevronLeft size={14} />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#1b2333] text-white flex items-center justify-center">
                  <Smartphone size={15} className="text-[#d88193]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#1b2333] truncate">
                    {activeChat.contact_name || activeChat.name || (activeChat.phone ? `+${activeChat.phone}` : 'Chat')}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-light">
                    {messages.length} mensajes sincronizados
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#eae6df] p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-neutral-400 pt-10 text-xs font-light">
                    No hay mensajes sincronizados todavía.
                  </div>
                )}
                {messages.map((m) => {
                  const ts = m.timestamp ? new Date(m.timestamp) : null;
                  const time = ts ? ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={m.id} className={`flex ${m.is_from_me ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] px-3 py-2 shadow-sm ${
                          m.is_from_me
                            ? 'bg-[#dcf8c6] rounded-lg rounded-tr-none'
                            : 'bg-white rounded-lg rounded-tl-none'
                        }`}
                      >
                        <p className="text-[13px] text-neutral-800 whitespace-pre-wrap break-words">{m.content}</p>
                        <p className="text-[9px] text-neutral-400 text-right mt-1 font-light">{time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Escribe un mensaje… (se entrega vía el puente WhatsApp)"
                  className="flex-1 border border-gray-200 px-3 py-2.5 text-xs focus:outline-none focus:border-ush-pink"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  className="bg-[#25D366] text-white px-4 py-2.5 hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const waSectionMeta = {
  key: 'whatsapp' as const,
  label: 'WhatsApp Sync',
  icon: MessageCircle,
};