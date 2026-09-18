# wa-sync — Sincronización WhatsApp del CRM

Servicio local que vincula el WhatsApp del negocio al CRM (estilo WhatsApp Web)
usando Baileys (multi-dispositivo). Es un proceso independiente que corre en una
sola máquina; NO corre en Vercel.

## Lo que hace

1. Publica el **QR de vinculación** en `crm_wa_sessions.qr_secret` para que el
   panel web del CRM (`/crm`, pestaña WhatsApp) lo muestre y se escanee.
2. **Persiste la sesión** en `auth/` (no se sube al repo ni a Vercel).
3. **Sincroniza chats y mensajes** (nuevos + histórico) a
   `crm_wa_chats` y `crm_wa_messages`.
4. **Procesa la cola de salida**: los mensajes que el CRM envía
   (`outgoing_status = 'queued'`) se entregan por WhatsApp y se marcan `sent`.
5. **Empareja chats con contactos del CRM** por número de teléfono.

## Instalación (una sola vez)

```bash
cd wa-sync
npm install
copy .env.example .env   # completa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
```

> La clave de servicio NO se usa en la web; solo este servicio local.

## Uso

```bash
npm start          # servicio continuo (QR + sync + cola de salida)
node link.js       # vincular/escanea el QR (muestra QR en terminal)
node link.js status  # estado de la sesión en Supabase
node link.js logout  # desvincular el dispositivo
```

## Notas de operación

- El servicio debe quedar **corriendo** en la máquina donde vive la sesión
  (como el WhatsApp Web abierto en una pestaña).
- Si el teléfono rechaza la sesión, borra la carpeta `auth/` y vuelve a
  ejecutar `node link.js`.
- Los logs quedan en `wa-sync.log`.
- Estado local (opcional) en `http://localhost:3170` si `STATUS_PORT>0`.

## Seguridad

- `auth/` y `.env` están en `.gitignore`. Nunca subir esas credenciales.
- La tabla `crm_wa_*` solo acepta consultas de usuarios autenticados (RLS);
  este servicio usa la clave de servicio (bypass de RLS) porque es el puente.