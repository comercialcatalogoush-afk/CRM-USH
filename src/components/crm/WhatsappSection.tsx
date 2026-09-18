'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Loader2,
  Inbox,
  Smartphone,
  ChevronLeft,
  Clock,
  Lightbulb,
  X,
  TrendingUp,
  AlertCircle,
  Zap,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrmWaChat, CrmWaMessage } from '@/types/wa';

// ── Tipos de sugerencias IA ──────────────────────────────────────────────────
type AiSuggestionType = 'seguimiento' | 'oportunidad' | 'tono' | 'alerta' | 'accion';
interface AiSuggestion {
  tipo: AiSuggestionType;
  icono: string;
  titulo: string;
  descripcion: string;
  accion?: string;
}

// Icono y color según tipo de sugerencia
const SUGGESTION_STYLE: Record<AiSuggestionType, { bg: string; border: string; text: string; Icon: LucideIcon }> = {
  seguimiento: { bg: 'bg-sky-50',     border: 'border-sky-200',    text: 'text-sky-700',    Icon: Clock },
  oportunidad: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', Icon: TrendingUp },
  tono:        { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   Icon: Target },
  alerta:      { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     Icon: AlertCircle },
  accion:      { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  Icon: Zap },
};

// ── Componente WhatsApp Sync ─────────────────────────────────────────────────
export function WhatsappSection() {
  const [chats, setChats]             = useState<CrmWaChat[]>([]);
  const [messages, setMessages]       = useState<CrmWaMessage[]>([]);
  const [activeChat, setActiveChat]   = useState<CrmWaChat | null>(null);
  const [search, setSearch]           = useState('');
  const [draft, setDraft]             = useState('');
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [qrData, setQrData]           = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('disconnected');
  const [sessionPhone, setSessionPhone]   = useState<string | null>(null);
  const [totalChats, setTotalChats]   = useState(0);

  // Panel de sugerencias IA
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [sugLoading, setSugLoading]   = useState(false);
  const [sugOpen, setSugOpen]         = useState(true);
  const [sugError, setSugError]       = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Sesión
      const { data: sessions } = await supabase
        .from('crm_wa_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      const session = sessions?.[0];
      if (session) {
        setQrData(session.qr_secret || null);
        setSessionStatus(session.status || 'disconnected');
        setSessionPhone(session.phone || null);
      }

      // Chats — ordenados por último mensaje, todos
      const { data: chatRows, count } = await supabase
        .from('crm_wa_chats')
        .select('*, crm_contacts(full_name)', { count: 'exact' })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(200);

      setTotalChats(count || 0);
      setChats(
        (chatRows || []).map((c: CrmWaChat & { crm_contacts?: { full_name: string } | null }) => ({
          ...c,
          contact_name: c.crm_contacts?.full_name ?? null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Autodesplazamiento de mensajes ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Polling de mensajes nuevos ─────────────────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    const id = setInterval(async () => {
      const { data } = await supabase
        .from('crm_wa_messages')
        .select('*')
        .eq('chat_jid', activeChat.jid)
        .order('timestamp')
        .limit(200);
      if (data) setMessages(data);
    }, 5000);
    return () => clearInterval(id);
  }, [activeChat]);

  // ── Sugerencias IA ────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (chat: CrmWaChat, msgs: CrmWaMessage[]) => {
    if (msgs.length < 3) { setSuggestions([]); return; }
    setSugLoading(true);
    setSugError('');
    try {
      const resp = await fetch('/api/crm-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: chat.jid,
          mensajes: msgs.map((m) => ({
            content: m.content,
            is_from_me: m.is_from_me,
            timestamp: m.timestamp,
          })),
        }),
      });
      const data = await resp.json();
      setSuggestions(data.sugerencias || []);
    } catch (e) {
      setSugError('No se pudieron cargar las sugerencias.');
      setSuggestions([]);
    } finally {
      setSugLoading(false);
    }
  }, []);

  // ── Abrir chat ─────────────────────────────────────────────────────────────
  const openChat = useCallback(async (chat: CrmWaChat) => {
    setActiveChat(chat);
    setSuggestions([]);
    setSugOpen(true);
    setSugError('');

    const { data } = await supabase
      .from('crm_wa_messages')
      .select('*')
      .eq('chat_jid', chat.jid)
      .order('timestamp')
      .limit(200);

    const msgs = data || [];
    setMessages(msgs);

    // Marcar leído
    await supabase
      .from('crm_wa_chats')
      .update({ unread_count: 0 })
      .eq('jid', chat.jid);

    // Sugerencias IA automáticas si hay suficientes mensajes
    if (msgs.length >= 3) {
      fetchSuggestions(chat, msgs);
    }
  }, [fetchSuggestions]);

  // ── Envío de mensaje ───────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeChat || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      await supabase.from('crm_wa_messages').insert({
        chat_jid: activeChat.jid,
        content: text,
        is_from_me: true,
        outgoing_status: 'queued',
        timestamp: new Date().toISOString(),
      });
      // Recargar mensajes
      const { data } = await supabase
        .from('crm_wa_messages')
        .select('*')
        .eq('chat_jid', activeChat.jid)
        .order('timestamp')
        .limit(200);
      setMessages(data || []);
    } finally {
      setSending(false);
    }
  };

  // ── QR ────────────────────────────────────────────────────────────────────
  const renderQrPanel = () => {
    if (sessionStatus === 'paired') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <MessageCircle size={28} className="text-[#25D366]" />
          </div>
          <p className="text-sm font-black text-[#1b2333] uppercase tracking-wide">Vinculado</p>
          <p className="text-xs text-neutral-500 font-light">
            WhatsApp conectado{sessionPhone ? <> · <span className="font-mono">+{sessionPhone}</span></> : ''}.
          </p>
          <p className="text-[10px] text-neutral-400">Selecciona un chat para ver la conversación.</p>
        </div>
      );
    }
    if (sessionStatus === 'connecting' && qrData) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-4 text-center">
          <p className="text-xs font-black text-[#1b2333] uppercase tracking-wide">Escanea con WhatsApp</p>
          <img src={qrUrl} alt="QR WhatsApp" className="w-48 h-48 border border-gray-200 shadow-sm" />
          <p className="text-[10px] text-neutral-500 font-light max-w-xs">
            Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
        <Smartphone size={28} className="text-neutral-300" />
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Sin vincular</p>
        <p className="text-[10px] text-neutral-400 font-light max-w-xs">
          Inicia el proceso wa-sync en tu computador para obtener el código QR.
        </p>
        <button
          onClick={loadAll}
          className="mt-2 text-[10px] font-bold uppercase tracking-widest border border-gray-200 px-4 py-2 text-neutral-500 hover:bg-neutral-50 flex items-center gap-2"
        >
          <RefreshCw size={12} /> Verificar estado
        </button>
      </div>
    );
  };

  // ── Filtro ────────────────────────────────────────────────────────────────
  const filteredChats = chats.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.contact_name || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  });

  // ── Nombre a mostrar ───────────────────────────────────────────────────────
  const chatDisplayName = (c: CrmWaChat) =>
    c.contact_name || c.name || (c.phone ? `+${c.phone}` : 'Chat sin nombre');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-[#1b2333] flex items-center gap-2">
            <MessageCircle size={16} className="text-[#25D366]" />
            WhatsApp Sync
          </h2>
          <p className="text-[10px] text-neutral-400 font-light mt-0.5">
            {sessionStatus === 'paired'
              ? `Vinculado${sessionPhone ? ` · +${sessionPhone}` : ''} · ${totalChats} chats sincronizados`
              : 'Vincula tu WhatsApp para sincronizar conversaciones.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm border ${
              sessionStatus === 'paired'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : sessionStatus === 'connecting'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-neutral-100 border-neutral-200 text-neutral-500'
            }`}
          >
            {sessionStatus === 'paired' ? 'Activo' : sessionStatus === 'connecting' ? 'Conectando' : 'Desconectado'}
          </span>
          <button onClick={loadAll} className="p-2 border border-gray-200 text-neutral-500 hover:bg-neutral-50" title="Actualizar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] min-h-[580px]">
        {/* ── Lista de chats ─────────────────────────────────────────────── */}
        <div className="border-r border-gray-200 flex flex-col bg-neutral-50">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o número…"
                className="w-full border border-gray-200 pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:border-ush-pink"
              />
            </div>
            {totalChats > 0 && (
              <p className="text-[10px] text-neutral-400 mt-1.5 font-light text-center">
                {filteredChats.length} de {totalChats} conversaciones
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-neutral-300" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 flex flex-col items-center">
                <Inbox size={24} className="mb-2" />
                <p className="text-xs font-bold">Sin conversaciones</p>
                <p className="text-[10px] font-light">
                  {search ? 'Sin resultados para esa búsqueda.' : 'Los chats sincronizados aparecerán aquí.'}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 hover:bg-white transition-all ${
                    activeChat?.jid === chat.jid ? 'bg-white shadow-inner border-l-2 border-l-[#d88193]' : ''
                  }`}
                >
                  {/* Avatar con inicial */}
                  <div className="w-10 h-10 rounded-full bg-[#1b2333] text-white flex items-center justify-center shrink-0 text-sm font-black">
                    {chatDisplayName(chat).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1b2333] truncate">
                      {chatDisplayName(chat)}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-light truncate">
                      {chat.phone ? `+${chat.phone}` : chat.jid}
                    </p>
                  </div>
                  {(chat.unread_count ?? 0) > 0 && (
                    <span className="bg-[#25D366] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {chat.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Panel derecho: QR o mensajes ───────────────────────────────── */}
        <div className="bg-neutral-50 flex flex-col">
          {!activeChat ? (
            renderQrPanel()
          ) : (
            <div className="flex flex-col h-full">
              {/* Header del chat activo */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
                <button
                  onClick={() => setActiveChat(null)}
                  className="p-1.5 border border-gray-200 text-neutral-500 hover:bg-neutral-50 md:hidden"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#1b2333] text-white flex items-center justify-center text-sm font-black">
                  {chatDisplayName(activeChat).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#1b2333] truncate">
                    {chatDisplayName(activeChat)}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-light">
                    {activeChat.phone ? `+${activeChat.phone}` : activeChat.jid} · {messages.length} mensajes
                  </p>
                </div>
                {/* Botón sugerencias IA */}
                <button
                  onClick={() => {
                    setSugOpen((v) => !v);
                    if (!suggestions.length && !sugLoading && messages.length >= 3) {
                      fetchSuggestions(activeChat, messages);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    sugOpen
                      ? 'bg-violet-50 border-violet-200 text-violet-700'
                      : 'bg-white border-gray-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                  title="Sugerencias IA"
                >
                  <Lightbulb size={12} />
                  IA
                </button>
              </div>

              {/* Panel de sugerencias IA (colapsable) */}
              {sugOpen && (
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                      <Lightbulb size={11} className="text-violet-400" />
                      Sugerencias IA · Gemini
                    </p>
                    <button onClick={() => setSugOpen(false)} className="text-neutral-300 hover:text-neutral-500">
                      <X size={12} />
                    </button>
                  </div>

                  {sugLoading && (
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 py-2">
                      <Loader2 size={12} className="animate-spin" />
                      Analizando conversación…
                    </div>
                  )}

                  {!sugLoading && sugError && (
                    <p className="text-[10px] text-red-500">{sugError}</p>
                  )}

                  {!sugLoading && !sugError && suggestions.length === 0 && messages.length < 3 && (
                    <p className="text-[10px] text-neutral-400 font-light">
                      Se necesitan al menos 3 mensajes para generar sugerencias.
                    </p>
                  )}

                  {!sugLoading && suggestions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {suggestions.map((s, i) => {
                        const style = SUGGESTION_STYLE[s.tipo] || SUGGESTION_STYLE.accion;
                        const Icon = style.Icon;
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2 p-2.5 border rounded-sm ${style.bg} ${style.border}`}
                          >
                            <span className="text-base mt-0.5 shrink-0">{s.icono}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>
                                {s.titulo}
                              </p>
                              <p className="text-[10px] text-neutral-600 font-light mt-0.5">
                                {s.descripcion}
                              </p>
                            </div>
                            {s.accion && (
                              <button
                                className={`shrink-0 text-[9px] font-bold uppercase px-2 py-1 border ${style.border} ${style.text} hover:opacity-80`}
                                onClick={() => setDraft(s.accion || '')}
                              >
                                {s.accion}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={() => fetchSuggestions(activeChat, messages)}
                        className="text-[9px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1 self-end font-bold uppercase tracking-wider"
                      >
                        <RefreshCw size={9} /> Regenerar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto bg-[#eae6df] p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-neutral-400 pt-10 text-xs font-light">
                    No hay mensajes sincronizados todavía.
                  </div>
                )}
                {messages.map((m) => {
                  const ts = m.timestamp ? new Date(m.timestamp) : null;
                  const time = ts
                    ? ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const isImage = m.media_type === 'image' && m.media_url;
                  return (
                    <div key={m.id} className={`flex ${m.is_from_me ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] px-3 py-2 shadow-sm ${
                          m.is_from_me
                            ? 'bg-[#dcf8c6] rounded-lg rounded-tr-none'
                            : 'bg-white rounded-lg rounded-tl-none'
                        }`}
                      >
                        {/* Nombre del remitente en chats de grupo */}
                        {!m.is_from_me && m.sender_jid && (
                          <p className="text-[9px] font-bold text-[#d88193] mb-0.5">
                            {jidToDisplayName(m.sender_jid)}
                          </p>
                        )}
                        <p className="text-[13px] text-neutral-800 whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                        {isImage ? (
                          <img
                            src={m.media_url!}
                            alt={m.content || 'Imagen de WhatsApp'}
                            className="max-h-64 w-auto rounded-md mt-1.5 object-contain"
                            loading="lazy"
                          />
                        ) : m.media_type && !m.content ? (
                          <p className="text-[11px] text-neutral-500 font-light mt-0.5">
                            [{m.media_type === 'document' ? m.filename : m.media_type}]
                          </p>
                        ) : null}
                        <p className="text-[9px] text-neutral-400 text-right mt-1 font-light flex items-center justify-end gap-1">
                          {time}
                          {m.is_from_me && m.outgoing_status === 'failed' ? (
                            <span className="text-red-500 font-bold" title={m.error || 'Falló'}>✗</span>
                          ) : m.is_from_me && m.outgoing_status === 'sent' ? (
                            <span className="text-sky-600">✓✓</span>
                          ) : m.is_from_me && (m.outgoing_status === 'queued' || m.outgoing_status === 'sending') ? (
                            <Clock size={10} className="text-neutral-400" />
                          ) : null}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Caja de escritura */}
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
                  placeholder="Escribe un mensaje… (Enter para enviar)"
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

// Convierte jid en nombre legible para mensajes de grupo
function jidToDisplayName(jid: string): string {
  if (!jid) return '';
  const phone = jid.split('@')[0].split(':')[0];
  return phone.replace(/\D/g, '') ? `+${phone}` : jid;
}

export const waSectionMeta = {
  key: 'whatsapp' as const,
  label: 'WhatsApp Sync',
  icon: MessageCircle,
};
