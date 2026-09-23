import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/crm-wa-reset
 * Resetea la sesion de WhatsApp en crm_wa_sessions usando la service role key.
 * Solo accesible desde el panel admin del CRM.
 * Cambia el estado a "connecting" y borra el QR y el telefono para que
 * wa-sync detecte el estado y genere un nuevo codigo QR.
 */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Variables de entorno no configuradas" }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: sessions } = await supabaseAdmin
      .from("crm_wa_sessions")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const { error } = await supabaseAdmin
        .from("crm_wa_sessions")
        .update({
          status: "connecting",
          qr_secret: null,
          phone: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessions[0].id);

      if (error) {
        console.error("[crm-wa-reset] Error al actualizar sesion:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin
        .from("crm_wa_sessions")
        .insert({
          status: "connecting",
          qr_secret: null,
          phone: null,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("[crm-wa-reset] Error al insertar sesion:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, message: "Sesion reiniciada. Esperando nuevo QR de wa-sync." });
  } catch (e) {
    console.error("[crm-wa-reset] Error interno:", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
