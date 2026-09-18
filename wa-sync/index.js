// ============================================================
// USH BY USHUAIA — Servicio de sincronización WhatsApp del CRM
// Motor Baileys (multi-dispositivo, estilo WhatsApp Web).
//
// Responsabilidades:
//  1. Publicar el QR de vinculación en crm_wa_sessions.qr_secret
//     mientras la sesión está "connecting".
//  2. Persistir la sesión (auth/) y mantenerla vinculada.
//  3. Sincronizar chats y mensajes (nuevos + histórico) a
//     crm_wa_chats / crm_wa_messages.
//  4. Procesar la cola de salida del CRM (outgoing_status='queued')
//     y entregar los mensajes en WhatsApp.
//  5. Emparejar chats con contactos del CRM por número de teléfono.
//
// No toca el catálogo ni el bridge antiguo (whatsapp-b24-bridge).
// ============================================================

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import pino from 'pino';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────
const DEVICE_NAME = process.env.DEVICE_NAME || 'WhatsApp Ush CRM';
const OUTBOX_POLL_MS = (Number(process.env.OUTBOX_POLL_SECONDS) || 5) * 1000;
const STATUS_PORT = Number(process.env.STATUS_PORT) || 0;
const AUTH_DIR = path.join(__dirname, 'auth');
const LOG_PATH = path.join(__dirname, 'wa-sync.log');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[wa-sync] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
});

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SESSION_COLUMNS = ['id', 'status', 'qr_secret', 'phone', 'last_seen_at', 'updated_at'];
const HEARTBEAT_MS = 30_000;

// ── Utilidades ──────────────────────────────────────────────
function jidToPhone(jid) {
  if (!jid) return null;
  let p = jid.split('@')[0] || '';
  if (p.includes(':')) p = p.split(':')[0];
  return p.replace(/\D/g, '') || null;
}

function normalizePhone(p) {
  if (!p) return null;
  let d = String(p).replace(/\D/g, '');
  if (d.length === 10) d = '57' + d; // asume Colombia
  return d || null;
}

function isGroup(jid) {
  return !!jid && jid.endsWith('@g.us');
}

function extractText(msg) {
  if (!msg || !msg.message) return null;
  const m = msg.message;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.documentMessage?.caption) return m.documentMessage.caption;
  if (m.buttonsResponseMessage?.selectedButtonText) return m.buttonsResponseMessage.selectedButtonText;
  if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;
  return null;
}

function extractMediaType(msg) {
  if (!msg || !msg.message) return null;
  const m = msg.message;
  if (m.imageMessage) return 'image';
  if (m.videoMessage) return 'video';
  if (m.audioMessage) return 'audio';
  if (m.voiceMessage) return 'voice';
  if (m.documentMessage) return 'document';
  if (m.stickerMessage) return 'sticker';
  if (m.pttMessage) return 'voice';
  return null;
}

function extractMediaUrl(msg) {
  if (!msg || !msg.message) return null;
  const m = msg.message;
  return m.imageMessage?.url || m.videoMessage?.url || m.documentMessage?.url || m.audioMessage?.url || null;
}

function extractFilename(msg) {
  if (!msg || !msg.message) return null;
  const m = msg.message;
  return m.documentMessage?.fileName || m.imageMessage?.fileName || null;
}

// ── Accesos a Supabase ──────────────────────────────────────
async function upsertSession(patch) {
  const { data: rows, error } = await db.from('crm_wa_sessions').select('id').limit(1);
  if (error) throw new Error('crm_wa_sessions.select: ' + error.message);
  if (rows && rows.length) {
    const { error: uerr } = await db.from('crm_wa_sessions').update(patch).eq('id', rows[0].id);
    if (uerr) throw new Error('crm_wa_sessions.update: ' + uerr.message);
    return rows[0].id;
  }
  const { data: ins, error: ierr } = await db
    .from('crm_wa_sessions')
    .insert({ device_name: DEVICE_NAME, ...patch })
    .select('id')
    .single();
  if (ierr) throw new Error('crm_wa_sessions.insert: ' + ierr.message);
  return ins.id;
}

async function upsertChat(jid, data) {
  const { data: row, error } = await db.from('crm_wa_chats').upsert(
    { jid, ...data },
    { onConflict: 'jid' }
  ).select('id').maybeSingle();
  if (error) {
    // si el upsert falla por violación única concuerrencial, reintenta como update
    if (error.code === '23505') {
      const { data: row2, error: e2 } = await db.from('crm_wa_chats').update(data).eq('jid', jid).select('id').maybeSingle();
      if (e2) throw new Error('crm_wa_chats.update: ' + e2.message);
      return row2?.id;
    }
    throw new Error('crm_wa_chats.upsert: ' + error.message);
  }
  return row?.id;
}

async function insertMessage(row) {
  const { error } = await db.from('crm_wa_messages').insert(row);
  if (error && error.code !== '23505') {
    throw new Error('crm_wa_messages.insert: ' + error.message);
  }
}

// ── Emparejado de contactos ─────────────────────────────────
const phoneToContact = new Map();
let contactsLoadedAt = 0;

async function loadContacts(force = false) {
  const now = Date.now();
  if (!force && phoneToContact.size && now - contactsLoadedAt < 5 * 60_000) return;
  const { data, error } = await db
    .from('crm_contacts')
    .select('id, whatsapp_number, full_name')
    .not('whatsapp_number', 'is', null);
  if (error) throw new Error('crm_contacts.select: ' + error.message);
  phoneToContact.clear();
  for (const c of data || []) {
    const np = normalizePhone(c.whatsapp_number);
    if (np) phoneToContact.set(np, c);
  }
  contactsLoadedAt = now;
  log.info({ count: phoneToContact.size }, 'contactos emparejables cargados');
}

function matchPhone(phone) {
  const np = normalizePhone(phone);
  if (!np) return null;
  return phoneToContact.get(np) || null;
}

// ── Sincronización de mensajes ──────────────────────────────
async function processMessage(waMessage, opts = {}) {
  const { readReceipt, fromHistory } = opts;
  if (waMessage.key?.remoteJid && isJidBroadcast(waMessage.key.remoteJid)) return;
  if (waMessage.key?.fromMe && waMessage.key.id?.startsWith('USHCRM:OUT:')) return; // eco de salida propia

  const jid = waMessage.key?.remoteJid;
  if (!jid) return;

  const isFromMe = !!waMessage.key?.fromMe;
  const phone = jidToPhone(jid);
  const timestampMs = waMessage.messageTimestamp
    ? (typeof waMessage.messageTimestamp === 'number' ? waMessage.messageTimestamp * 1000 : new Date(waMessage.messageTimestamp).getTime())
    : Date.now();
  const createdAt = new Date(timestampMs).toISOString();

  // Chat: nombre por pushName o contacto del CRM.
  // Solo setea name si hay valor (evita borrar nombre que ya tiene el chat).
  const matched = matchPhone(phone);
  const chatName = waMessage.pushName || matched?.full_name || null;
  const chatPatch = {
    ...(chatName ? { name: chatName } : {}),
    phone: phone,
    contact_id: matched?.id || null,
    last_message_at: createdAt,
  };

  let lastUnread = 0;
  if (!isFromMe && !readReceipt) {
    const { data: row } = await db.from('crm_wa_chats').select('unread_count').eq('jid', jid).maybeSingle();
    lastUnread = (row?.unread_count || 0) + 1;
  }

  await upsertChat(jid, { ...chatPatch, unread_count: !isFromMe && !readReceipt ? lastUnread : undefined });

  const messageId = waMessage.key?.id || null;
  if (messageId) {
    await insertMessage({
      chat_jid: jid,
      message_id: `${isFromMe ? 'out' : 'in'}:${jid}:${messageId}`,
      sender_jid: isFromMe ? null : (waMessage.key?.participant || waMessage.key?.remoteJid || null),
      content: extractText(waMessage),
      media_type: extractMediaType(waMessage),
      media_url: extractMediaUrl(waMessage),
      filename: extractFilename(waMessage),
      is_from_me: isFromMe,
      timestamp: createdAt,
      outgoing_status: isFromMe ? 'sent' : null,
    });
  }

  log.info({ jid, isFromMe, fromHistory, media: extractMediaType(waMessage) }, 'mensaje procesado');
}

async function markChatRead(jid) {
  await db.from('crm_wa_chats').update({ unread_count: 0 }).eq('jid', jid);
}

// ── Cola de salida (CRM → WhatsApp) ─────────────────────────
async function processOutbox(sock) {
  const { data, error } = await db
    .from('crm_wa_messages')
    .select('*')
    .eq('outgoing_status', 'queued')
    .order('created_at')
    .limit(20);
  if (error) {
    log.error({ err: error.message }, 'outbox: error leyendo cola');
    return;
  }
  for (const row of data || []) {
    const jid = row.chat_jid;
    try {
      await db.from('crm_wa_messages').update({ outgoing_status: 'sending' }).eq('id', row.id);
      const sent = await sock.sendMessage(jid, { text: row.content || '' });
      const resultKey = sent?.key?.id || null;
      await db.from('crm_wa_messages').update({ outgoing_status: 'sent', error: null }).eq('id', row.id);
      await upsertChat(jid, { last_message_at: new Date().toISOString() });
      log.info({ id: row.id, jid, resultKey }, 'outbox: mensaje entregado');
    } catch (e) {
      log.error({ id: row.id, jid, err: e?.message }, 'outbox: fallo al enviar');
      await db.from('crm_wa_messages').update({ outgoing_status: 'failed', error: String(e?.message || e) }).eq('id', row.id);
    }
  }
}

// ── Mini servidor de estado local ───────────────────────────
let lastStatus = { status: 'starting', since: new Date().toISOString() };

function startStatusServer() {
  if (!STATUS_PORT) return;
  const server = createServer(async (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(lastStatus));
  });
  server.listen(STATUS_PORT, () => log.info({ port: STATUS_PORT }, 'servidor de estado local'));
}

// ── Núcleo Baileys ──────────────────────────────────────────
let sock = null;
let reconnectAttempt = 0;
let keepRunning = true;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startSocket(forceNew = false) {
  if (sock && !forceNew) return sock;
  try {
    sock?.end();
  } catch {}

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: process.env.LOG_LEVEL || 'info', base: null }),
    markOnlineOnConnect: true,
    syncFullHistory: true,
    browser: ['UshCRM', 'Chrome', '120.0.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;

    if (qr) {
      reconnectAttempt = 0;
      try {
        await upsertSession({ status: 'connecting', qr_secret: qr, phone: null, last_seen_at: null });
        lastStatus = { status: 'connecting', since: new Date().toISOString() };
        log.info('QR publicado en crm_wa_sessions');
      } catch (e) {
        log.error({ err: e.message }, 'no se pudo publicar el QR');
      }
    }

    if (connection === 'open') {
      reconnectAttempt = 0;
      const myPhone = sock.user?.id?.split('@')[0] || null;
      try {
        await upsertSession({ status: 'paired', qr_secret: null, phone: myPhone, last_seen_at: new Date().toISOString() });
        lastStatus = { status: 'paired', phone: myPhone, since: new Date().toISOString() };
        log.info({ phone: myPhone }, 'sesión WhatsApp vinculada');
        await loadContacts(true);
        // presentarse disponible como WhatsApp Web
        sock.sendPresenceUpdate('available');
      } catch (e) {
        log.error({ err: e.message }, 'no se pudo marcar sesión vinculada');
      }
      if (receivedPendingNotifications) {
        log.info('notificaciones pendientes recibidas');
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      log.warn({ code, attempt: reconnectAttempt }, 'conexión cerrada');
      const shouldReconnect =
        code !== DisconnectReason.loggedOut && keepRunning;
      await upsertSession({ status: 'disconnected', qr_secret: null }).catch((e) => log.error({ err: e.message }, 'no se pudo marcar desconexión'));

      if (shouldReconnect) {
        reconnectAttempt += 1;
        const wait = Math.min(1000 * 2 ** Math.min(reconnectAttempt, 6), 60_000);
        log.info({ wait }, 'reintentando reconexión');
        await delay(wait);
        startSocket(true);
      } else {
        log.fatal('sesión desvinculada (loggedOut) o proceso detenido');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages || []) {
      try {
        await processMessage(m);
      } catch (e) {
        log.error({ err: e.message }, 'error procesando mensaje');
      }
    }
  });

  // Historial inicial: copia los chats al vuelo para poblar la lista
  sock.ev.on('chats.upsert', async (chats) => {
    for (const ch of chats || []) {
      const jid = ch.id;
      if (!jid || isJidBroadcast(jid)) continue;
      const phone = jidToPhone(jid);
      const matched = matchPhone(phone);
      const ts = ch.conversationTimestamp ? new Date(Number(ch.conversationTimestamp) * 1000).toISOString() : null;
      try {
        await upsertChat(jid, {
          name: ch.name || ch.subject || ch.pushName || matched?.full_name || null,
          phone,
          contact_id: matched?.id || null,
          last_message_at: ts || undefined,
          unread_count: ch.unreadCount || 0,
        });
      } catch (e) {
        log.error({ jid, err: e.message }, 'error poblando chat desde historial');
      }
    }
  });

  sock.ev.on('chats.update', async (chats) => {
    for (const ch of chats || []) {
      const jid = ch.id;
      if (!jid) continue;
      const patch = {};
      if (ch.unreadCount !== undefined) patch.unread_count = ch.unreadCount;
      if (ch.lastMessageReceivedTimestamp) patch.last_message_at = new Date(Number(ch.lastMessageReceivedTimestamp)).toISOString();
      try {
        if (Object.keys(patch).length) await db.from('crm_wa_chats').update(patch).eq('jid', jid);
      } catch (e) {
        log.error({ jid, err: e.message }, 'error actualizando chat');
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    for (const u of updates || []) {
      if (!u.key?.remoteJid) continue;
      if (u.status) {
        // color de check: recibido/leído
        const status = u.status;
        if (status === 'READ' || status === 'PLAYED') {
          await markChatRead(u.key.remoteJid).catch(() => {});
        }
      }
    }
  });

  // ── Lote inicial de TODOS los chats al conectar (chats.set) ───────────────
  // Baileys entrega este evento con la lista completa de chats cuando la
  // sesión termina de sincronizar. Es la fuente más completa de conversaciones.
  sock.ev.on('chats.set', async ({ chats: allChats, isLatest }) => {
    log.info({ total: allChats?.length, isLatest }, 'chats.set: sincronización masiva');
    let ok = 0, fail = 0;
    for (const ch of allChats || []) {
      const jid = ch.id;
      if (!jid || isJidBroadcast(jid)) continue;
      const phone = jidToPhone(jid);
      const matched = matchPhone(phone);
      const ts = ch.conversationTimestamp
        ? new Date(Number(ch.conversationTimestamp) * 1000).toISOString()
        : null;
      const nombre = ch.name || ch.subject || ch.pushName || matched?.full_name || null;
      try {
        await upsertChat(jid, {
          ...(nombre ? { name: nombre } : {}),
          phone,
          contact_id: matched?.id || null,
          ...(ts ? { last_message_at: ts } : {}),
          unread_count: ch.unreadCount || 0,
        });
        ok++;
      } catch (e) {
        fail++;
        log.error({ jid, err: e.message }, 'chats.set: error guardando chat');
      }
    }
    log.info({ ok, fail, total: allChats?.length }, 'chats.set procesado');
  });

  // ── Libreta de contactos del teléfono (contacts.upsert) ─────────────────
  // Actualiza los nombres de chats existentes con el nombre del directorio
  // del teléfono. Clave para mostrar "María López" en vez de "+573001234567".
  sock.ev.on('contacts.upsert', async (contactList) => {
    let actualizados = 0;
    for (const c of contactList || []) {
      const phone = jidToPhone(c.id);
      // verifiedName = nombre verificado; notify = nombre push del teléfono
      const nombre = c.verifiedName || c.notify || c.name || null;
      if (!phone || !nombre) continue;
      try {
        // Solo actualiza si no tiene nombre aún
        await db
          .from('crm_wa_chats')
          .update({ name: nombre })
          .eq('phone', phone)
          .or('name.is.null,name.eq.');
        actualizados++;
      } catch (e) {
        // ignorar si el chat no existe
      }
    }
    if (actualizados > 0) log.info({ actualizados }, 'contacts.upsert: nombres actualizados');
  });

  // ── Actualización de contactos ya conocidos ────────────────────────────
  sock.ev.on('contacts.update', async (updates) => {
    for (const c of updates || []) {
      const phone = jidToPhone(c.id);
      const nombre = c.verifiedName || c.notify || c.name || null;
      if (!phone || !nombre) continue;
      try {
        await db.from('crm_wa_chats').update({ name: nombre }).eq('phone', phone);
      } catch (e) { /* ignorar */ }
    }
  });

  return sock;
}

// ── Heartbeat: mantener last_seen_at fresco ─────────────────
setInterval(async () => {
  if (sock?.user) {
    try {
      await upsertSession({ last_seen_at: new Date().toISOString() }).catch(() => {});
    } catch {}
  }
}, HEARTBEAT_MS);

// ── Arranque ────────────────────────────────────────────────
(async () => {
  log.info({ device: DEVICE_NAME }, 'wa-sync iniciando');
  startStatusServer();

  try {
    await loadContacts();
  } catch (e) {
    log.warn({ err: e.message }, 'no se cargaron contactos al arrancar');
  }

  await startSocket();

  setInterval(() => {
    if (sock?.user) {
      processOutbox(sock).catch(() => {});
    }
  }, OUTBOX_POLL_MS);

  // Señales de apagado
  const shutdown = () => {
    keepRunning = false;
    log.info('apagando wa-sync');
    try {
      sock?.logout();
    } catch {}
    setTimeout(() => process.exit(0), 500);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (process.env.WA_HEARTBEAT_PING) {
    log.info('env WA_HEARTBEAT_PING detectado (legacy canal) — ignorado por diseño');
  }
})();