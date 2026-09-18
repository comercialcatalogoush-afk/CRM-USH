import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ruta de sugerencias IA para el CRM WhatsApp.
// Recibe los últimos mensajes de un chat y retorna sugerencias contextuales
// usando la API de Gemini. Solo accesible desde el servidor (usa service role).

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Tipos de sugerencia que puede generar la IA
export type AiSuggestionType = 'seguimiento' | 'oportunidad' | 'tono' | 'alerta' | 'accion';

export interface AiSuggestion {
  tipo: AiSuggestionType;
  icono: string;
  titulo: string;
  descripcion: string;
  accion?: string; // texto del CTA opcional
}

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 503 });
  }

  let body: { jid?: string; mensajes?: Array<{ content: string; is_from_me: boolean; timestamp: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { jid, mensajes } = body;
  if (!jid || !mensajes?.length) {
    return NextResponse.json({ sugerencias: [] });
  }

  // Construir el historial de conversación para el prompt
  const historial = mensajes
    .slice(-30) // últimos 30 mensajes
    .map((m) => {
      const rol = m.is_from_me ? 'Ush (nosotros)' : 'Cliente';
      const ts = m.timestamp ? new Date(m.timestamp).toLocaleDateString('es-CO') : '';
      return `[${ts}] ${rol}: ${m.content || '[archivo/media]'}`;
    })
    .join('\n');

  const prompt = `Eres el asistente de CRM de Ush By Ushuaia, una marca de ropa mayorista colombiana.
Analiza esta conversación de WhatsApp con un cliente y genera máximo 3 sugerencias accionables
para el equipo de ventas. Responde SOLO con JSON válido, sin markdown.

CONVERSACIÓN:
${historial}

Formato de respuesta (array JSON):
[
  {
    "tipo": "seguimiento|oportunidad|tono|alerta|accion",
    "icono": "emoji apropiado",
    "titulo": "Título corto (máx 8 palabras)",
    "descripcion": "Descripción específica y útil (máx 25 palabras)",
    "accion": "Texto del botón opcional (máx 5 palabras)"
  }
]

Reglas:
- "seguimiento": si el cliente no ha respondido en más de 24h o hay una promesa sin cumplir
- "oportunidad": si el cliente mencionó interés en productos, precios o pedidos
- "tono": si el cliente parece indeciso, molesto o muy entusiasta
- "alerta": si hay urgencia, reclamo o situación crítica
- "accion": próximo paso concreto recomendado
- Sé específico con los datos de la conversación. No generes sugerencias genéricas.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
        }),
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[crm-ai] Gemini error:', err);
      return NextResponse.json({ sugerencias: [] });
    }

    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Limpiar posible markdown envolvente
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    let sugerencias: AiSuggestion[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      sugerencias = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      console.error('[crm-ai] No se pudo parsear JSON de Gemini:', cleaned);
    }

    return NextResponse.json({ sugerencias });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[crm-ai] Error llamando Gemini:', msg);
    return NextResponse.json({ sugerencias: [] });
  }
}
