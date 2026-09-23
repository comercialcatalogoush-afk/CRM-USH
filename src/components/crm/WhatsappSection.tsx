'use client';
import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  Search, Send, Loader2, Smile, Paperclip, Mic, MoreVertical, ArrowLeft,
  Check, CheckCheck, Clock, Image as ImageIcon, FileText, AlertCircle, X, RefreshCw,
  MessageCircle, Smartphone, Reply, Copy, CornerUpLeft, Zap, Play, Pause,
  Volume2, Phone, UserCheck, ExternalLink, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrmWaChat, CrmWaMessage } from '@/types/wa';
import { QRCodeSVG } from 'qrcode.react';

export type ChatWithContact = CrmWaChat & {
  contact_name?: string | null;
  contact_email?: string | null;
  contact_city?: string | null;
};

export type AiSuggestion = {
  tipo: string;
  icono: string;
  titulo: string;
  descripcion: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return d.toLocaleDateString('es-CO', { weekday: 'long' });
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function fmtLastTime(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diff === 1) return 'Ayer';
  if (diff < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' });
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric' });
}

interface DateGroup {
  date: string;
  msgs: CrmWaMessage[];
}

function groupByDate(messages: CrmWaMessage[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let lastDate = '';
  for (const m of messages) {
    const d = m.timestamp ? new Date(m.timestamp).toDateString() : 'Sin fecha';
    if (d !== lastDate) {
      groups.push({ date: m.timestamp ? fmtDate(m.timestamp) : 'Sin fecha', msgs: [] });
      lastDate = d;
    }
    groups[groups.length - 1].msgs.push(m);
  }
  return groups;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

const AV_COLORS = [
  'bg-emerald-600', 'bg-sky-600', 'bg-violet-600', 'bg-rose-600',
  'bg-amber-600', 'bg-teal-600', 'bg-pink-600', 'bg-indigo-600'
];

function avatarColor(jid: string): string {
  let h = 0;
  for (let i = 0; i < jid.length; i++) h = jid.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

// ─── Tick de estado WhatsApp ────────────────────────────────────────────────
function MsgTick({ status }: { status?: string | null }) {
  if (status === 'queued') return <span title="En cola"><Clock size={12} className="text-gray-400" /></span>;
  if (status === 'sending') return <span title="Enviando"><Check size={12} className="text-gray-400" /></span>;
  if (status === 'sent') return <span title="Entregado"><CheckCheck size={13} className="text-[#53bdeb]" /></span>;
  if (status === 'failed') return <span title="Error de envío"><AlertCircle size={12} className="text-red-400" /></span>;
  return <span title="Leído"><CheckCheck size={13} className="text-[#53bdeb]" /></span>;
}

// ─── Burbuja de mensaje estilo WhatsApp Web ─────────────────────────────────
function MessageBubble({
  msg,
  onReply,
}: {
  msg: CrmWaMessage;
  onReply: (m: CrmWaMessage) => void;
}) {
  const [hover, setHover] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isMe = msg.is_from_me;

  const renderContent = () => {
    if (msg.media_type === 'image') {
      return (
        <div className="rounded-lg overflow-hidden mb-1">
          {msg.media_url ? (
            <img
              src={msg.media_url}
              alt={msg.filename || 'Imagen recibida'}
              className="max-w-[280px] max-h-[220px] object-cover rounded-md cursor-pointer hover:opacity-95"
            />
          ) : (
            <div className="w-56 h-36 bg-black/10 flex flex-col items-center justify-center rounded-lg gap-2">
              <ImageIcon size={32} className="text-gray-400" />
              <span className="text-[11px] text-gray-500 font-medium">Foto adjunta</span>
            </div>
          )}
          {msg.content && <p className="text-[13.5px] mt-1.5 leading-snug">{msg.content}</p>}
        </div>
      );
    }

    if (msg.media_type === 'audio' || msg.media_type === 'voice') {
      return (
        <div className="flex items-center gap-3 min-w-[220px] py-1">
          <button
            onClick={() => setIsPlayingAudio(p => !p)}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-transform active:scale-95 ${isMe ? 'bg-emerald-600' : 'bg-[#25D366]'}`}
          >
            {isPlayingAudio ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-1 h-4">
              {[40, 70, 30, 90, 60, 80, 45, 100, 75, 50, 85, 60, 40, 95, 70, 50].map((h, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full ${isMe ? 'bg-emerald-700/60' : 'bg-gray-400'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between items-center mt-1 text-[10.5px] text-gray-500">
              <span>{isPlayingAudio ? '0:07' : '0:18'}</span>
              <Mic size={11} className={isMe ? 'text-emerald-700' : 'text-gray-400'} />
            </div>
          </div>
        </div>
      );
    }

    if (msg.media_type === 'document') {
      return (
        <div className="flex items-center gap-3 bg-black/5 rounded-lg p-2.5 min-w-[200px] mb-1">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <FileText size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{msg.filename || 'Documento adjunto'}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">PDF · 1.2 MB</p>
          </div>
        </div>
      );
    }

    if (!msg.content) {
      return (
        <span className="italic opacity-60 text-xs flex items-center gap-1">
          <AlertCircle size={12} /> {msg.media_type ? `[${msg.media_type}]` : '[Mensaje sin texto]'}
        </span>
      );
    }

    return <p className="text-[13.5px] leading-[1.4] whitespace-pre-wrap break-words">{msg.content}</p>;
  };

  return (
    <div
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5 group`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative max-w-[75%] sm:max-w-[65%]">
        {hover && (
          <div
            className={`absolute top-1 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} flex items-center gap-1 z-10 bg-white/95 backdrop-blur-sm shadow-md rounded-full px-1.5 py-0.5 border border-gray-100`}
          >
            <button
              onClick={() => onReply(msg)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Responder"
            >
              <CornerUpLeft size={13} />
            </button>
            <button
              onClick={() => {
                if (msg.content) navigator.clipboard.writeText(msg.content);
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Copiar texto"
            >
              <Copy size={13} />
            </button>
          </div>
        )}
        <div
          className={`px-3 py-2 rounded-2xl shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${
            isMe
              ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-sm'
              : 'bg-white text-gray-900 rounded-tl-sm border border-gray-100'
          }`}
        >
          {renderContent()}
          <div className="flex items-center gap-1 justify-end mt-1 select-none">
            <span className="text-[10.5px] text-gray-500">{fmtTime(msg.timestamp)}</span>
            {isMe && <MsgTick status={msg.outgoing_status} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL: WhatsappSection ──────────────────────────────────
interface WhatsappSectionProps {
  initialJid?: string | null;
  onJidConsumed?: () => void;
}

export function WhatsappSection({ initialJid, onJidConsumed }: WhatsappSectionProps = {}) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('disconnected');
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatWithContact[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [totalChats, setTotalChats] = useState<number>(0);
  const [chatSearch, setChatSearch] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [activeChat, setActiveChat] = useState<ChatWithContact | null>(null);
  const [messages, setMessages] = useState<CrmWaMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState<boolean>(false);
  const [msgSearch, setMsgSearch] = useState<string>('');
  const [showMsgSearch, setShowMsgSearch] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<CrmWaMessage | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiTextSuggestions, setAiTextSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiPanel, setAiPanel] = useState<boolean>(true);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Carga sesión actual
  const loadSession = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('crm_wa_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      const s = data?.[0];
      if (s) {
        setQrData(s.qr_secret || null);
        setSessionStatus(s.status || 'disconnected');
        setSessionPhone(s.phone || null);
      }
    } catch (e) {
      console.error('Error cargando sesión WA:', e);
    }
  }, []);

  // Carga lista de chats con datos de contacto CRM enlazado
  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const [chatsRes, contactsRes] = await Promise.all([
        supabase
          .from('crm_wa_chats')
          .select('*, crm_contacts(full_name, email, city)', { count: 'exact' })
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(400),
        supabase
          .from('crm_contacts')
          .select('id, full_name, phone, whatsapp_number, email, city')
          .limit(500),
      ]);

      const phoneMap = new Map<string, { full_name: string; email: string | null; city: string | null }>();
      (contactsRes.data || []).forEach((ct: any) => {
        const raw = (ct.whatsapp_number || ct.phone || '').replace(/\D/g, '');
        if (raw) {
          const info = { full_name: ct.full_name, email: ct.email, city: ct.city };
          phoneMap.set(raw, info);
          if (raw.startsWith('57') && raw.length > 10) {
            phoneMap.set(raw.slice(2), info);
          } else if (raw.length === 10) {
            phoneMap.set(`57${raw}`, info);
          }
        }
      });

      setTotalChats(chatsRes.count || 0);
      const mapped: ChatWithContact[] = (chatsRes.data || []).map((c: any) => {
        const cleanDigits = (c.phone || c.jid || '').replace(/\D/g, '');
        const matched = c.crm_contacts || phoneMap.get(cleanDigits) || (cleanDigits.startsWith('57') ? phoneMap.get(cleanDigits.slice(2)) : phoneMap.get(`57${cleanDigits}`));
        return {
          ...c,
          contact_name: matched?.full_name ?? c.name ?? null,
          contact_email: matched?.email ?? null,
          contact_city: matched?.city ?? null,
        };
      });
      setChats(mapped);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
    loadChats();
  }, [loadSession, loadChats]);

  // Sondeo de QR mientras se vincula
  useEffect(() => {
    if (sessionStatus === 'paired') return;
    const iv = setInterval(async () => {
      await loadSession();
      if (sessionStatus === 'paired') loadChats();
    }, 2500);
    return () => clearInterval(iv);
  }, [sessionStatus, loadSession, loadChats]);

  // Realtime en chats
  useEffect(() => {
    const ch = supabase
      .channel('wa_chats_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_wa_chats' }, loadChats)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadChats]);

  // Realtime de mensajes en el chat activo
  useEffect(() => {
    if (!activeChat) return;
    const ch = supabase
      .channel(`wa_msgs_${activeChat.jid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_wa_messages', filter: `chat_jid=eq.${activeChat.jid}` },
        async () => {
          const { data } = await supabase
            .from('crm_wa_messages')
            .select('*')
            .eq('chat_jid', activeChat.jid)
            .order('timestamp', { ascending: true })
            .limit(500);
          if (data) setMessages(data as CrmWaMessage[]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeChat]);

  // Auto-scroll al final al recibir o enviar
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Petición de sugerencias IA (estilo Vixies / WhatsApp AI)
  const fetchAiSuggestions = useCallback(async (chat: ChatWithContact, msgs: CrmWaMessage[]) => {
    if (msgs.length < 2) return;
    setAiLoading(true);
    try {
      const resp = await fetch('/api/crm-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: chat.jid,
          mensajes: msgs.slice(-30).map(m => ({
            content: m.content,
            is_from_me: m.is_from_me,
            timestamp: m.timestamp,
          })),
          modo: 'completo',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAiSuggestions(data.sugerencias || []);
        setAiTextSuggestions(data.mensajesSugeridos || []);
      }
    } catch (e) {
      console.warn('Error cargando sugerencias IA:', e);
      setAiSuggestions([]);
      setAiTextSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Abrir chat
  const openChat = useCallback(
    async (chat: ChatWithContact) => {
      setActiveChat(chat);
      setReplyTo(null);
      setShowMsgSearch(false);
      setMsgSearch('');
      setAiSuggestions([]);
      setAiTextSuggestions([]);
      setMobileView('chat');
      setLoadingMsgs(true);
      try {
        const { data } = await supabase
          .from('crm_wa_messages')
          .select('*')
          .eq('chat_jid', chat.jid)
          .order('timestamp', { ascending: true })
          .limit(500);

        const msgs = (data || []) as CrmWaMessage[];
        setMessages(msgs);

        // Limpiar contador no leídos
        await supabase.from('crm_wa_chats').update({ unread_count: 0 }).eq('jid', chat.jid);
        setChats(prev => prev.map(c => (c.jid === chat.jid ? { ...c, unread_count: 0 } : c)));

        // Llamar IA con el contexto
        fetchAiSuggestions(chat, msgs);
      } finally {
        setLoadingMsgs(false);
      }
    },
    [fetchAiSuggestions]
  );

  // Selección o apertura automática cuando viene initialJid desde Contactos
  useEffect(() => {
    if (!initialJid || loadingChats) return;

    const targetDigits = initialJid.replace(/\D/g, '');
    const target = chats.find(c => {
      if (c.jid === initialJid) return true;
      const cDigits = (c.phone || c.jid || '').replace(/\D/g, '');
      return cDigits === targetDigits || (cDigits.endsWith(targetDigits) && targetDigits.length >= 10);
    });

    if (target) {
      openChat(target);
      onJidConsumed?.();
    } else {
      const cleanJid = initialJid.includes('@') ? initialJid : `${targetDigits}@s.whatsapp.net`;
      const nowIso = new Date().toISOString();
      const syntheticChat: ChatWithContact = {
        id: `synth_${targetDigits || Date.now()}`,
        jid: cleanJid,
        name: null,
        phone: targetDigits || null,
        contact_id: null,
        unread_count: 0,
        last_message_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        contact_name: null,
        contact_email: null,
        contact_city: null,
      };
      openChat(syntheticChat);
      onJidConsumed?.();
    }
  }, [initialJid, loadingChats, chats, openChat, onJidConsumed]);

  // Enviar mensaje
  const sendMessage = useCallback(async () => {
    if (!activeChat || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    setReplyTo(null);
    try {
      await supabase.from('crm_wa_messages').insert({
        chat_jid: activeChat.jid,
        content: text,
        is_from_me: true,
        outgoing_status: 'queued',
        timestamp: new Date().toISOString(),
      });
      const { data } = await supabase
        .from('crm_wa_messages')
        .select('*')
        .eq('chat_jid', activeChat.jid)
        .order('timestamp', { ascending: true })
        .limit(500);
      if (data) setMessages(data as CrmWaMessage[]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [activeChat, draft, sending]);

  // Filtros de búsqueda
  const filteredChats = useMemo(() => {
    return chats.filter(c => {
      if (chatFilter === 'unread' && (!c.unread_count || c.unread_count <= 0)) return false;
      if (chatFilter === 'groups' && !c.jid.endsWith('@g.us')) return false;

      if (!chatSearch) return true;
      const q = chatSearch.toLowerCase();
      const n = (c.contact_name || c.name || '').toLowerCase();
      const p = (c.phone || '').toLowerCase();
      return n.includes(q) || p.includes(q);
    });
  }, [chats, chatSearch, chatFilter]);

  const filteredMessages = useMemo(() => {
    if (!msgSearch) return messages;
    const q = msgSearch.toLowerCase();
    return messages.filter(m => (m.content || '').toLowerCase().includes(q));
  }, [messages, msgSearch]);

  const messageGroups = useMemo(() => groupByDate(filteredMessages), [filteredMessages]);

  const displayName = (c: ChatWithContact) => {
    if (c.contact_name) return c.contact_name;
    if (c.name && !c.name.startsWith('+') && !c.name.includes('@')) return c.name;
    if (c.phone) return `+${c.phone}`;
    if (c.jid) {
      const num = c.jid.replace(/@.*$/, '');
      if (/^\d+$/.test(num)) return `+${num}`;
      return num;
    }
    return 'Sin nombre';
  };

  // Render lado derecho
  const renderRightPanel = () => {
    if (!activeChat) {
      if (sessionStatus === 'connecting' && qrData) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] p-8 gap-6 text-center">
            <div className="p-6 bg-white rounded-3xl shadow-xl border border-gray-200/80">
              <QRCodeSVG value={qrData} size={240} level="M" includeMargin />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="font-bold text-gray-800 text-lg">Vincula tu WhatsApp con UshCRM</h3>
              <p className="text-sm text-gray-600">
                Abre WhatsApp en tu teléfono → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong> y apunta tu cámara a este código.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 font-medium pt-2">
                <RefreshCw size={12} className="animate-spin" />
                El código QR se renueva automáticamente cada 20 segundos
              </div>
            </div>
          </div>
        );
      }

      if (sessionStatus === 'paired') {
        return (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-center p-8 gap-5 select-none">
            <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-100">
              <MessageCircle size={48} className="text-[#25D366]" />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-gray-800 text-2xl tracking-tight">WhatsApp Web para UshCRM</h2>
              <p className="text-sm text-gray-500 max-w-sm">
                Envía y recibe mensajes con tus clientes mayoristas en tiempo real, con sugerencias automáticas de IA.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Conectado y activo {sessionPhone ? `· +${sessionPhone}` : ''}
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-center p-8 gap-4">
          <Smartphone size={56} className="text-gray-300" />
          <div className="space-y-1">
            <h3 className="font-bold text-gray-700 text-lg">Servicio de WhatsApp detenido</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Ejecuta el servicio <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs">wa-sync</code> para conectar tu WhatsApp.
            </p>
          </div>
          <button
            onClick={() => {
              loadSession();
              loadChats();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full text-sm font-semibold shadow-sm transition-all"
          >
            <RefreshCw size={15} /> Verificar conexión
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#efeae2]">
        {/* Header conversación */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200/90 flex-shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              onClick={() => {
                setActiveChat(null);
                setMobileView('list');
              }}
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div
              onClick={() => setShowInfo(s => !s)}
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer shadow-sm ${avatarColor(
                activeChat.jid
              )}`}
            >
              {initials(displayName(activeChat))}
            </div>
            <div className="min-w-0 cursor-pointer" onClick={() => setShowInfo(s => !s)}>
              <div className="flex items-center gap-2">
                <p className="font-bold text-[14.5px] text-gray-900 truncate">{displayName(activeChat)}</p>
                {activeChat.contact_name && (
                  <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    CRM
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-500 truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {activeChat.phone ? `+${activeChat.phone}` : 'WhatsApp Directo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMsgSearch(s => !s)}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              title="Buscar en la conversación"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setAiPanel(s => !s)}
              className={`p-2 hover:bg-gray-200 rounded-full transition-colors ${
                aiPanel ? 'text-violet-600 bg-violet-100/70' : 'text-gray-600'
              }`}
              title="Asistente de IA (Vixies)"
            >
              <Sparkles size={18} />
            </button>
            <button
              onClick={() => setShowInfo(s => !s)}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              title="Información del contacto"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        {/* Buscador dentro del chat */}
        {showMsgSearch && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0 animate-in fade-in slide-in-from-top-1">
            <Search size={15} className="text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar mensajes..."
              value={msgSearch}
              onChange={e => setMsgSearch(e.target.value)}
              className="flex-1 text-[13px] outline-none placeholder-gray-400"
            />
            {msgSearch && (
              <span className="text-[11px] text-gray-400 font-medium">
                {filteredMessages.length} coincidencia(s)
              </span>
            )}
            <button
              onClick={() => {
                setShowMsgSearch(false);
                setMsgSearch('');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={15} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Contenido principal: Mensajes + Drawer Info */}
        <div className="flex flex-1 overflow-hidden relative">
          <div
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: '#efeae2',
            }}
          >
            {loadingMsgs ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
                <span className="text-xs">Cargando mensajes...</span>
              </div>
            ) : messageGroups.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-gray-600 shadow-sm border border-gray-100">
                  Sin mensajes en esta conversación
                </div>
              </div>
            ) : (
              messageGroups.map(({ date, msgs }) => (
                <div key={date}>
                  <div className="flex justify-center my-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-600 text-[11px] font-semibold px-3 py-1 rounded-lg shadow-sm border border-gray-200/60 uppercase tracking-wide">
                      {date}
                    </span>
                  </div>
                  {msgs.map(m => (
                    <MessageBubble
                      key={m.id}
                      msg={m}
                      onReply={targetMsg => {
                        setReplyTo(targetMsg);
                        inputRef.current?.focus();
                      }}
                    />
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Drawer Lateral Información del Contacto */}
          {showInfo && (
            <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto flex-shrink-0 animate-in slide-in-from-right-2 duration-200 z-20">
              <div className="p-6 bg-[#f0f2f5] text-center border-b border-gray-200">
                <div
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-md ${avatarColor(
                    activeChat.jid
                  )}`}
                >
                  {initials(displayName(activeChat))}
                </div>
                <h4 className="font-bold text-gray-900 mt-3 text-base">{displayName(activeChat)}</h4>
                {activeChat.phone && (
                  <p className="text-xs text-gray-500 font-mono mt-0.5">+{activeChat.phone}</p>
                )}
                {activeChat.phone && (
                  <a
                    href={`https://wa.me/${activeChat.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-[#25D366] text-white rounded-full text-xs font-semibold hover:bg-[#1ebe5d] transition-colors"
                  >
                    <ExternalLink size={12} /> Abrir en App
                  </a>
                )}
              </div>

              <div className="p-5 space-y-4 text-xs">
                {activeChat.contact_name && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Contacto en CRM
                    </span>
                    <p className="font-semibold text-gray-800 text-sm mt-0.5">{activeChat.contact_name}</p>
                  </div>
                )}
                {activeChat.contact_email && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Correo electrónico
                    </span>
                    <p className="text-gray-700 font-medium mt-0.5">{activeChat.contact_email}</p>
                  </div>
                )}
                {activeChat.contact_city && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Ciudad
                    </span>
                    <p className="text-gray-700 font-medium mt-0.5">{activeChat.contact_city}</p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    Total de mensajes
                  </span>
                  <p className="text-gray-800 font-semibold mt-0.5">{messages.length} mensajes guardados</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    Última actividad
                  </span>
                  <p className="text-gray-800 font-medium mt-0.5">{fmtDate(activeChat.last_message_at)}</p>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="w-full mt-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Ocultar detalles
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* Panel Inteligente de Sugerencias IA (Vixies / WhatsApp AI) */}
        {aiPanel && (
          <div className="border-t border-violet-100 bg-gradient-to-r from-violet-50/90 via-indigo-50/90 to-purple-50/90 px-4 py-2.5 flex-shrink-0 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-violet-600 animate-pulse" />
                <span className="text-[11px] font-bold text-violet-800 uppercase tracking-wider">
                  Sugerencias IA (Aprende de chats anteriores)
                </span>
                {aiLoading && <Loader2 size={12} className="animate-spin text-violet-500" />}
              </div>
              <button
                onClick={() => activeChat && fetchAiSuggestions(activeChat, messages)}
                disabled={aiLoading}
                className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} />
                Regenerar
              </button>
            </div>

            {/* Chips de sugerencias directas para enviar */}
            {aiTextSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {aiTextSuggestions.map((txt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDraft(txt);
                      inputRef.current?.focus();
                    }}
                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-violet-600 border border-violet-200 hover:border-violet-600 rounded-full text-[12px] text-gray-800 hover:text-white transition-all shadow-sm max-w-full truncate text-left"
                    title="Clic para usar este mensaje"
                  >
                    <span className="text-violet-500 group-hover:text-white">💬</span>
                    <span className="truncate">{txt}</span>
                  </button>
                ))}
              </div>
            ) : (
              !aiLoading && (
                <p className="text-[11px] text-violet-600/70 italic mb-1">
                  Escribe o presiona Regenerar para que la IA lea el contexto y sugiera respuestas automáticas.
                </p>
              )
            )}

            {/* Sugerencias de acción o intención */}
            {aiSuggestions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-1 pb-0.5">
                {aiSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 bg-white/95 border border-violet-100 rounded-xl px-2.5 py-1.5 shadow-sm text-left max-w-[220px]"
                  >
                    <div className="flex items-center gap-1 font-semibold text-[11px] text-violet-900 truncate">
                      <span>{s.icono}</span>
                      <span className="truncate">{s.titulo}</span>
                    </div>
                    <p className="text-[10.5px] text-gray-500 leading-tight line-clamp-2 mt-0.5">
                      {s.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Barra de respuesta citada (Reply) */}
        {replyTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#f0f2f5] border-t border-gray-200 flex-shrink-0">
            <div className="flex-1 pl-3 border-l-4 border-emerald-600">
              <span className="text-[11px] font-bold text-emerald-700">
                {replyTo.is_from_me ? 'Tú' : displayName(activeChat)}
              </span>
              <p className="text-[12px] text-gray-600 truncate">{replyTo.content || '[Archivo adjunto]'}</p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Input box estilo WhatsApp Web */}
        <footer className="flex items-end gap-2 px-3 py-2.5 bg-[#f0f2f5] border-t border-gray-200/60 flex-shrink-0">
          <button
            className="p-2.5 hover:bg-gray-200 rounded-full text-gray-600 transition-colors flex-shrink-0"
            title="Emojis"
          >
            <Smile size={22} />
          </button>
          <button
            className="p-2.5 hover:bg-gray-200 rounded-full text-gray-600 transition-colors flex-shrink-0"
            title="Adjuntar documento o imagen"
          >
            <Paperclip size={22} />
          </button>
          <div className="flex-1 bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-200/50">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Escribe un mensaje"
              className="w-full outline-none resize-none text-[14px] text-gray-800 placeholder-gray-400 leading-snug max-h-[120px] overflow-y-auto"
              style={{ height: '24px' }}
            />
          </div>
          {draft.trim() ? (
            <button
              onClick={sendMessage}
              disabled={sending}
              className="p-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full flex-shrink-0 transition-transform active:scale-95 shadow-sm disabled:opacity-50"
              title="Enviar mensaje"
            >
              {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          ) : (
            <button
              className="p-2.5 hover:bg-gray-200 rounded-full text-gray-600 transition-colors flex-shrink-0"
              title="Mensaje de voz"
            >
              <Mic size={22} />
            </button>
          )}
        </footer>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f0f2f5] overflow-hidden">
      {/* ═══ PANEL IZQUIERDO: LISTA DE CHATS ════════════════════════════════ */}
      <div
        className={`flex flex-col bg-white border-r border-gray-200 w-full md:w-[380px] lg:w-[420px] flex-shrink-0 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header panel */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-b border-gray-200/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${avatarColor(
                'ushbyushuaia'
              )}`}
            >
              U
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">WhatsApp Business</h2>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sessionStatus === 'paired' ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
                <span className={sessionStatus === 'paired' ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                  {sessionStatus === 'paired' ? 'En línea' : 'Sin sincronizar'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                loadSession();
                loadChats();
              }}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              title="Refrescar chats"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {/* Buscador + Filtros */}
        <div className="p-2.5 bg-white border-b border-gray-100 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-1.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar o empezar un chat nuevo"
              value={chatSearch}
              onChange={e => setChatSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
            />
            {chatSearch && (
              <button onClick={() => setChatSearch('')} className="p-0.5 hover:bg-gray-200 rounded-full">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>

          {/* Filtros estilo WhatsApp Web moderno: Todos / No leídos / Grupos */}
          <div className="flex items-center gap-1.5 px-0.5">
            <button
              onClick={() => setChatFilter('all')}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                chatFilter === 'all'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setChatFilter('unread')}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                chatFilter === 'unread'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              No leídos
            </button>
            <button
              onClick={() => setChatFilter('groups')}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                chatFilter === 'groups'
                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              Grupos
            </button>
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loadingChats ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Loader2 size={22} className="animate-spin text-emerald-600" />
              <span className="text-xs">Sincronizando chats...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
              <MessageCircle size={28} className="opacity-40" />
              <span>{chatSearch ? 'No se encontraron chats' : 'No hay conversaciones disponibles'}</span>
            </div>
          ) : (
            filteredChats.map(chat => {
              const isActive = activeChat?.jid === chat.jid;
              const name = displayName(chat);
              return (
                <button
                  key={chat.jid}
                  onClick={() => openChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] transition-colors text-left ${
                    isActive ? 'bg-[#f0f2f5]' : ''
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm ${avatarColor(
                      chat.jid
                    )}`}
                  >
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[14px] text-gray-900 truncate">{name}</span>
                      <span
                        className={`text-[11px] flex-shrink-0 ml-2 ${
                          chat.unread_count > 0 ? 'text-[#25D366] font-bold' : 'text-gray-400'
                        }`}
                      >
                        {fmtLastTime(chat.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] text-gray-500 truncate flex-1">
                        {chat.contact_city ? `📍 ${chat.contact_city} · ` : ''}
                        {chat.phone ? `+${chat.phone}` : chat.jid}
                      </p>
                      {chat.unread_count > 0 && (
                        <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 bg-[#25D366] text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {totalChats > 0 && (
          <footer className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400 text-center font-medium bg-gray-50/50">
            {totalChats} conversaciones registradas
          </footer>
        )}
      </div>

      {/* ═══ PANEL DERECHO: CONVERSACIÓN O ESTADO ═══════════════════════════ */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          mobileView === 'list' && !activeChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {renderRightPanel()}
      </div>
    </div>
  );
}
