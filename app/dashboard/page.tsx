"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

interface ResultadoAlgoritmoRow {
  id_proveedor: number;
  proveedor_nombre: string;
  whatsapp?: string | null;
  precio_unitario: number;
  tiempo_entrega_dias: number;
  calificacion_historica: number;
  score_final: number | string;
}

function formatNumber(value: number | string, decimals = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(decimals) : "0.00";
}

function formatCurrency(value: number | string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "S/. 0.00";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatWhatsapp(value?: string | null) {
  if (!value?.trim()) return "No disponible";
  return value.trim();
}

export default function DashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [resultados, setResultados] = useState<ResultadoAlgoritmoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifySession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setAuthenticated(true);
      setSessionChecked(true);
    }

    verifySession().catch(() => {
      router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body?.error || "Error al cargar la data del dashboard.");
        }

        const data = (await response.json()) as ResultadoAlgoritmoRow[];
        setResultados(data);
      } catch (fetchError) {
        setError((fetchError as Error).message || "No se pudo cargar el dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authenticated]);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-12 text-center shadow-lg shadow-slate-200/40">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0A2E50]">Cargando sesión</p>
            <p className="mt-4 text-sm text-slate-600">Verificando credenciales antes de ingresar al sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const totalProveedores = resultados.length;
  const mejorScore = resultados.length > 0 ? formatNumber(resultados[0].score_final) : "0.00";
  const promedioScore = resultados.length
    ? formatNumber(resultados.reduce((sum, row) => sum + Number(row.score_final), 0) / resultados.length)
    : "0.00";
  const fechaActual = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0A2E50]">
                CONSORCIO SINME S.A.C.
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">
                Dashboard de evaluación de proveedores
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Visualiza los proveedores evaluados por el algoritmo MCDM desde la vista SQL <span className="font-medium">resultado_algoritmo</span>. Mantén el control en decisiones de compras estratégicas y compara resultados en tiempo real.
              </p>
            </div>
            <div className="rounded-3xl border border-[#C59B63]/10 bg-[#C59B63]/5 px-5 py-4 text-right">
              <p className="text-sm text-slate-600">Actualizado</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{fechaActual}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#0A2E50]">Proveedores</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{totalProveedores}</p>
              <p className="mt-2 text-sm text-slate-600">Registros obtenidos desde la vista de evaluación.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#0A2E50]">Mejor score</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{mejorScore}</p>
              <p className="mt-2 text-sm text-slate-600">Puntaje máximo en la evaluación MCDM.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#0A2E50]">Promedio</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{promedioScore}</p>
              <p className="mt-2 text-sm text-slate-600">Valor promedio de score para los proveedores.</p>
            </article>
          </div>

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="mt-10 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-[#0A2E50] text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em] text-slate-100">Proveedor</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em] text-slate-100">Precio unitario</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em] text-slate-100">Tiempo entrega</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em] text-slate-100">Calificación</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em] text-slate-100">Score MCDM</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em] text-slate-100">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-500">
                      Cargando resultados...
                    </td>
                  </tr>
                ) : resultados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-500">
                      No se encontraron registros en la vista <span className="font-medium">resultado_algoritmo</span>.
                    </td>
                  </tr>
                ) : (
                  resultados.map((row) => (
                    <tr key={`${row.id_proveedor}-${row.proveedor_nombre}`}>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-900">
                        {row.proveedor_nombre}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {formatCurrency(row.precio_unitario)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {row.tiempo_entrega_dias} días
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {formatNumber(row.calificacion_historica, 1)} / 5.0
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-950">
                        {formatNumber(row.score_final)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {formatWhatsapp(row.whatsapp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
