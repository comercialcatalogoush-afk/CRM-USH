// Extrae un mensaje legible de cualquier error (Supabase, red, JS) sin romper.
export function readableError(e: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  const obj = e as { message?: string; details?: string; hint?: string; code?: string };
  if (obj.message && obj.message.trim()) return obj.message;
  if (obj.details && obj.details.trim()) return obj.details;
  if (obj.hint && obj.hint.trim()) return obj.hint;
  try {
    const text = String(JSON.stringify(e));
    if (text && text !== '{}' && text !== 'undefined') return text;
  } catch (_) {}
  return fallback;
}

// Detección del caso más común al arrancar: las tablas del CRM aún no se crearon
// en Supabase (falta ejecutar supabase/crm_schema.sql en el SQL Editor).
const TABLE_MISSING_PATTERN = /does not exist|42P01|relation.*not exist|no existe|could not find the table|schema cache/i;

export function isTableMissingError(e: unknown): boolean {
  if (!e) return false;
  if (typeof e === 'string') return TABLE_MISSING_PATTERN.test(e);
  const obj = e as { message?: string; details?: string; hint?: string; code?: string };
  const haystack = [obj.message, obj.details, obj.hint, obj.code, String(e)].filter(Boolean).join(' ');
  return TABLE_MISSING_PATTERN.test(haystack);
}

// Mensaje final amigable para la UI: si faltan las tablas, instrucción clara.
export function crmErrorText(e: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (isTableMissingError(e)) {
    return 'Las tablas del CRM no están creadas en Supabase. Ejecuta supabase/crm_schema.sql en el SQL Editor de Supabase (Project → SQL Editor) y vuelve a intentar.';
  }
  return readableError(e, fallback);
}