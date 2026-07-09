"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Ingrese correo y contraseña para continuar.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message || "No se pudo iniciar sesión. Verifica tus credenciales.");
      return;
    }

    if (!data.session) {
      setError("No se recibió sesión de Supabase. Intenta nuevamente.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px]">
            <div className="order-2 rounded-b-3xl bg-white p-8 sm:p-10 lg:order-1 lg:rounded-l-3xl lg:rounded-r-none lg:border-r lg:border-slate-100">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full bg-[#C59B63] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                  CONSORCIO SINME
                </span>
                <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0A2E50] sm:text-4xl">
                  Acceso al sistema logístico
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Ingresa tus credenciales corporativas para gestionar proveedores, materiales y evaluaciones MCDM.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                <div>
                  <label htmlFor="email" className="text-sm font-semibold text-slate-900">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="usuario@sinme.pe"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#C59B63] focus:ring-2 focus:ring-[#C59B63]/20"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-semibold text-slate-900">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#C59B63] focus:ring-2 focus:ring-[#C59B63]/20"
                  />
                </div>

                {error ? (
                  <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-3xl bg-[#0A2E50] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0A2E50]/10 transition hover:bg-[#092845] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Validando..." : "Iniciar Sesión"}
                </button>
              </form>

              <div className="mt-8 space-y-4 border-t border-slate-200 pt-6 text-sm text-slate-600">
                <p>
                  ¿Primera vez en el sistema? <span className="font-semibold text-slate-900">Solicita acceso a tu administrador.</span>
                </p>
                <p>
                  ¿Tienes problemas para acceder? <span className="font-semibold text-slate-900">Contacta al administrador de la plataforma.</span>
                </p>
              </div>
            </div>

            <div className="order-1 rounded-t-3xl bg-[#0A2E50] p-8 text-white lg:order-2 lg:rounded-r-3xl lg:rounded-l-none lg:p-10">
              <div className="flex h-full flex-col justify-center gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C59B63]/90">
                    Bienvenido
                  </p>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                    Control de compras y evaluación MCDM
                  </h2>
                </div>
                <div className="space-y-4 text-sm leading-7 text-slate-100/90">
                  <p>
                    Accede a un portal seguro diseñado para la toma de decisiones estratégicas en el sector metalmecánico.
                  </p>
                  <p>
                    Gestiona proveedores, revisa evaluaciones y optimiza tu cadena de suministro con una experiencia web moderna y profesional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
