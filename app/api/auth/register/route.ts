import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { email, password, nombreCompleto, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // 1. Crear el usuario en Supabase Auth
    // Supabase encripta la clave automáticamente.
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nombre_completo: nombreCompleto,
          role: role // Aquí guardamos si es 'admin' o 'worker'
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      status: "success", 
      message: "Usuario creado exitosamente en Supabase",
      user: data.user 
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}