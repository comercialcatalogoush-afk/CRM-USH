import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) return NextResponse.json({ sugerencias: [], mensajesSugeridos: [] });
  
  let body: {
    jid?: string;
    mensajes?: Array<{ content: string | null; is_from_me: boolean; timestamp: string | null }>;
    modo?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ sugerencias: [], mensajesSugeridos: [] }); }

  const { mensajes = [], modo = 'simple' } = body;
  if (!mensajes.length) return NextResponse.json({ sugerencias: [], mensajesSugeridos: [] });

  const historial = mensajes.slice(-40).map(m => {
    const rol = m.is_from_me ? 'Ush (nosotros)' : 'Cliente';
    const ts = m.timestamp ? new Date(m.timestamp).toLocaleDateString('es-CO') : '';
    return `[${ts}] ${rol}: ${m.content || '[archivo/media]'}`;
  }).join('\n');

  // Mensajes del negocio como referencia de tono
  const misOwnMsgs = mensajes.filter(m => m.is_from_me && m.content).slice(-20).map(m => m.content).join(' | ');

  const prompt = `Eres el asistente de ventas mayoristas de Ush By Ushuaia, marca colombiana de ropa.

HISTORIAL DE CONVERSACIÓN:
${historial}

TONO DE LA MARCA (mensajes anteriores enviados por nosotros):
${misOwnMsgs || 'cordial, profesional, directo'}

Genera respuesta JSON con DOS partes:
1. "sugerencias": array de máximo 3 análisis accionables de la conversación
2. "mensajesSugeridos": array de exactamente 3 mensajes cortos LISTOS PARA ENVIAR al cliente (imita el tono de la marca, máx 2 oraciones cada uno)

Responde SOLO con JSON válido sin markdown:
{
  "sugerencias": [
    {"tipo":"seguimiento|oportunidad|tono|alerta|accion","icono":"emoji","titulo":"Título corto","descripcion":"Descripción útil de máx 20 palabras"}
  ],
  "mensajesSugeridos": ["Mensaje 1 listo para enviar", "Mensaje 2", "Mensaje 3"]
}

Reglas mensajesSugeridos:
- Deben ser naturales, no genéricos ("Hola, te comento que..." en vez de "Estimado cliente...")
- Basados en el contexto real de la conversación
- En español colombiano casual pero profesional
- Si el cliente preguntó algo, responde esa pregunta específica
`;

  try {
    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1000 },
      }),
    });
    if (!resp.ok) return NextResponse.json({ sugerencias: [], mensajesSugeridos: [] });
    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    let parsed = { sugerencias: [], mensajesSugeridos: [] };
    try { parsed = JSON.parse(cleaned); } catch { /* ignore */ }
    return NextResponse.json({
      sugerencias: Array.isArray(parsed.sugerencias) ? parsed.sugerencias.slice(0, 3) : [],
      mensajesSugeridos: Array.isArray(parsed.mensajesSugeridos) ? parsed.mensajesSugeridos.slice(0, 3) : [],
    });
  } catch (e) {
    return NextResponse.json({ sugerencias: [], mensajesSugeridos: [] });
  }
}
