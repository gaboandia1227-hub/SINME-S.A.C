import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_proveedor, id_material, cantidad, precio_unitario } = body;

    // Generamos un código de orden automático con el año actual
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const codigo_orden = `OC-2026-${randomNum}`;
    const subtotal = cantidad * precio_unitario;

    // 1. Insertamos la Cabecera de la Orden
    const { data: orden, error: errorCabecera } = await supabase
      .from('ordenes_compra')
      .insert([{
        codigo_orden,
        id_proveedor,
        monto_total: subtotal,
        estado: 'Pendiente' // Queda pendiente de recepción en almacén
      }])
      .select()
      .single();

    if (errorCabecera) throw errorCabecera;

    // 2. Insertamos el Detalle de la Orden amarrado a la cabecera
    const { error: errorDetalle } = await supabase
      .from('detalle_ordenes_compra')
      .insert([{
        id_orden: orden.id_orden,
        id_material,
        cantidad_solicitada: cantidad,
        precio_compra_unitario: precio_unitario,
        subtotal: subtotal
      }]);

    if (errorDetalle) throw errorDetalle;

    return NextResponse.json({ success: true, codigo: codigo_orden });
} catch (error) {
    console.error("Error en BD:", error);
    return NextResponse.json({ error: 'Hubo un error al generar la orden' }, { status: 500 });
  }
}