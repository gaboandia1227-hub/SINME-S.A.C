import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    // 1. Supabase valida el hash de la contraseña por nosotros
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // 2. Extraer el rol de la metadata del usuario
    const userRole = data.user?.user_metadata?.role;

    return NextResponse.json({
      status: "success",
      token: data.session?.access_token, // JWT autogenerado por Supabase
      user: {
        email: data.user?.email,
        role: userRole
      }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}