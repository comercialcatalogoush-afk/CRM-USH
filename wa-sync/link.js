// ============================================================
// USH BY USHUAIA — Herramienta de vinculación del servicio
// wa-sync (QR para vincular el WhatsApp del negocio al CRM).
//
// Uso:
//   node link.js            inicia sesión y publica QR en consola
//                           (el QR también va a crm_wa_sessions)
//   node link.js status     muestra el estado guardado en Supabase
//   node link.js logout     desvincula la sesión (requiere sesión activa)
// ============================================================

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import pino from 'pino';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, 'auth');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[link] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const log = pino({ level: 'info', base: null, timestamp: pino.stdTimeFunctions.isoTime });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const command = process.argv[2] || 'start';

async function showStatus() {
  const { data, error } = await db.from('crm_wa_sessions').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return console.error('Error leyendo estado:', error.message);
  if (!data) return console.log('No hay sesión guardada todavía.');
  console.log(JSON.stringify(data, null, 2));
}

async function doLogout() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }) });
  let ended = false;

  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'open' && !ended) {
      ended = true;
      try {
        await sock.logout();
        console.log('Sesión desvinculada en WhatsApp.');
      } catch (e) {
        console.log('Error al desvincular:', e.message);
      }
      try {
        await db.from('crm_wa_sessions').update({ status: 'disconnected', qr_secret: null }).eq('status', 'paired');
        console.log('Estado en Supabase actualizado a disconnected.');
      } catch (e) {
        console.log('No se pudo actualizar Supabase:', e.message);
      }
      process.exit(0);
    }
    if (u.connection === 'close' && !ended) {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        ended = true;
        console.log('La sesión ya estaba desvinculada.');
        process.exit(0);
      }
    }
  });

  setTimeout(() => {
    if (!ended) {
      ended = true;
      console.log('Sin conexión activa para desvincular. Si había una sesión previa, ree-intenta o bórrala de auth/.');
      process.exit(1);
    }
  }, 15_000);
}

class QrTerminal {
  static render(qr) {
    const qrcode = require('qrcode-terminal');
    qrcode.generate(qr, { small: true });
  }
}

async function doStart() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['UshCRM', 'Chrome', '120.0.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      const dream = `\\n\\n  ╔══════════════════════════════════════════════════════╗\\n  ║  ESCANEA ESTE QR CON WHATSAPP del negocio:              ║\\n  ║  WhatsApp > Ajustes > Dispositivos vinculados >          ║\\n  ║  Vincular dispositivo > escanear.                         ║\\n  ╚══════════════════════════════════════════════════════╝\\n\\n  El código QR tambien queda publicado en crm_wa_sessions    \\n  para mostrarlo en el panel web del CRM.\\n\\n`;
      console.log(dream);
      QrTerminal.render(qr);
      try {
        const { data } = await db.from('crm_wa_sessions').select('id').limit(1);
        const patch = { status: 'connecting', qr_secret: qr };
        if (data?.length) await db.from('crm_wa_sessions').update(patch).eq('id', data[0].id);
        else await db.from('crm_wa_sessions').insert({ device_name: process.env.DEVICE_NAME || 'WhatsApp Ush CRM', ...patch });
        console.log('QR publicado en crm_wa_sessions ✅');
      } catch (e) {
        console.log('No se pudo publicar el QR en Supabase:', e.message);
      }
    }

    if (connection === 'open') {
      log.info('¡Vinculado correctamente! La sesión queda persistida.');
      try {
        const phone = sock.user?.id?.split('@')[0] || null;
        await db.from('crm_wa_sessions').update({ status: 'paired', qr_secret: null, phone, last_seen_at: new Date().toISOString() }).eq('status', 'connecting').or(`status.eq.disconnected`);
        console.log('Supabase actualizado: sesión vinculada ✅');
      } catch (e) {
        console.log('No se pudo actualizar Supabase:', e.message);
      }
      process.exit(0);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('Sesión desvinculada en el teléfono. Vuelve a ejecutar "node link.js" para vincular de nuevo.');
        process.exit(0);
      }
    }
  });
}

switch (command) {
  case 'status':
    await showStatus();
    break;
  case 'logout':
    await doLogout();
    break;
  default:
    await doStart();
    break;
}