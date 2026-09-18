# ush-crm

CRM comercial interno de Ush By Ushuaia.

Construido como proyecto y dominio independiente del catálogo digital
(Next.js 14+ / App Router / TypeScript estricto / Tailwind + Supabase).

## Módulos

- **Panel de Control**: KPIs (contactos, empresas, oportunidades, valor en pipeline, tasa de conversión, tareas, contactos con WhatsApp).
- **Contactos**: ficha completa con empresa vinculada (selector del directorio o texto libre), etiquetas y ficha 360.
- **Empresas**: directorio con ficha 360 (contactos, oportunidades, tareas y actividad vinculadas).
- **Pipeline de Ventas**: etapas por columnas con ficha 360 del contacto.
- **Tareas** y **Línea de Tiempo**: pendientes, vencidas y registro de actividad.
- **WhatsApp Sync (fase 1)**: vinculación por código QR como WhatsApp Web, chats sincronizados y panel de conversación. Las tablas de sesión/chats/mensajes viven en Supabase (`crm_wa_*`); el puente local (canal whatmeow) publica el QR y las conversaciones y entrega los mensajes.

## Despliegue

- Producción: https://ush-crm.vercel.app (proyecto Vercel `ush-crm`, rama `main`)
- Repositorio: https://github.com/comercialcatalogoush-afk/ush-crm

## Variables de entorno

Copia `.env.example` a `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key
- `NEXT_PUBLIC_ADMIN_EMAIL` — correo del administrador (login del CRM)

## Base de datos

- `supabase/crm_schema.sql` — tablas del CRM (`crm_companies`, `crm_contacts`, `crm_deals`, `crm_tasks`, `crm_activities`) con RLS solo para usuarios autenticados.
- `supabase/crm_whatsapp_schema.sql` — sincronización WhatsApp (`crm_wa_sessions`, `crm_wa_chats`, `crm_wa_messages`).

Ejecutar cada archivo una sola vez en el SQL Editor de Supabase (idempotente: usa `IF NOT EXISTS`).