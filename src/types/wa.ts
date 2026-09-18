// Tipos de la sincronización WhatsApp del CRM (fase 1, estilo WhatsApp Web).

export type WaSessionStatus = 'disconnected' | 'connecting' | 'paired' | 'syncing';

export const WA_SESSION_LABELS: Record<WaSessionStatus, string> = {
  disconnected: 'Sin vincular',
  connecting: 'Escané el código QR',
  paired: 'Vinculado',
  syncing: 'Sincronizando',
};

export type CrmWaSession = {
  id: string;
  device_name: string;
  phone: string | null;
  status: WaSessionStatus;
  qr_secret: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmWaChat = {
  id: string;
  jid: string;
  name: string | null;
  phone: string | null;
  contact_id: string | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string | null;
};

export type CrmWaMessage = {
  id: string;
  chat_jid: string;
  message_id: string | null;
  sender_jid: string | null;
  content: string | null;
  media_type: string | null;
  media_url: string | null;
  filename: string | null;
  is_from_me: boolean;
  timestamp: string | null;
  created_at: string;
  outgoing_status?: 'queued' | 'sending' | 'sent' | 'failed' | null;
  error?: string | null;
};

export const WA_OUTGOING_LABELS: Record<string, string> = {
  queued: 'En cola',
  sending: 'Enviando…',
  sent: 'Entregado',
  failed: 'Falló el envío',
};