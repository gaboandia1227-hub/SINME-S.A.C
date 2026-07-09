import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

// El molde limpio fuera de la función
interface ProveedorData {
    id_proveedor: number;
    razon_social: string;
    calificacion_historica: number;
    whatsapp: string;
  }

export async function GET(request: Request) {
  // Capturamos el ID del material desde la URL (ej: /api/comparar?id=2)
  const { searchParams } = new URL(request.url);
  const id_material = searchParams.get('id');

  if (!id_material) {
    return NextResponse.json({ error: 'Falta el ID del material' }, { status: 400 });
  }

  // 1. Jalamos las cotizaciones vigentes de ese material, incluyendo los datos del proveedor
  const { data: cotizaciones, error } = await supabase
    .from('cotizaciones_items')
    .select(`
      precio_unitario,
      tiempo_entrega_dias,
      proveedores (
        id_proveedor,
        razon_social,
        calificacion_historica,
        whatsapp
      )
    `)
    .eq('id_material', id_material)
    // Filtramos para que solo tome precios que no han vencido
    .gte('fecha_vigencia', new Date().toISOString().split('T')[0]);

  if (error || !cotizaciones || cotizaciones.length === 0) {
    return NextResponse.json({ mensaje: 'No hay cotizaciones vigentes para este material' }, { status: 404 });
  }

  // 2. Encontramos los valores mínimos para la fórmula de normalización
  const precios = cotizaciones.map(c => Number(c.precio_unitario));
  const tiempos = cotizaciones.map(c => Number(c.tiempo_entrega_dias));
  
  const precioMin = Math.min(...precios);
  // Si el tiempo es 0 (inmediato), lo ajustamos a 0.1 para no dividir entre cero en la matemática
  const tiempoMin = Math.max(Math.min(...tiempos), 0.1); 

  // 3. Pesos del Algoritmo
  const W_PRECIO = 0.50; // 50%
  const W_TIEMPO = 0.30; // 30%
  const W_CALIF = 0.20;  // 20%

  // 4. Calculamos el Score final para cada proveedor
  const resultados = cotizaciones.map(cot => {
    // Le definimos el molde exacto en lugar de usar "any"
    // Usamos 'unknown' en medio para forzar a TypeScript a aceptar la conversión
    const prov = cot.proveedores as unknown as ProveedorData;
    
    const precio = Number(cot.precio_unitario);
    const tiempo = Math.max(Number(cot.tiempo_entrega_dias), 0.1);
    const calif = Number(prov.calificacion_historica);
      

    // Normalización (escala 0 a 100)
    const scorePrecio = (precioMin / precio) * 100;
    const scoreTiempo = (tiempoMin / tiempo) * 100;
    const scoreCalif = (calif / 5) * 100;

    // Fórmula Ponderada
    const scoreFinal = (scorePrecio * W_PRECIO) + (scoreTiempo * W_TIEMPO) + (scoreCalif * W_CALIF);

    return {
      id_proveedor: prov.id_proveedor,
      razon_social: prov.razon_social,
      whatsapp: prov.whatsapp,
      precio_ofrecido: precio,
      dias_entrega: cot.tiempo_entrega_dias,
      calificacion: calif,
      score_final: scoreFinal.toFixed(2) // Redondeamos a 2 decimales
    };
  });

  // 5. Ordenamos del puntaje más alto al más bajo y devolvemos la respuesta
  resultados.sort((a, b) => Number(b.score_final) - Number(a.score_final));

  return NextResponse.json(resultados);
}