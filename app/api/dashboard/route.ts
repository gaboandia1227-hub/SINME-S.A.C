import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("resultado_algoritmo")
    .select(
      "id_proveedor, proveedor_nombre, whatsapp, precio_unitario, tiempo_entrega_dias, calificacion_historica, score_final"
    )
    .order("score_final", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "No se pudo leer la vista resultado_algoritmo." },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
