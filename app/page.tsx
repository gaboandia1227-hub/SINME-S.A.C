"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ── Interfaces ────────────────────────────────────────────────
interface Material {
  id?: number | string;
  id_material: number | string;
  sku_codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
}

interface ResultadoAlgoritmo {
  id_proveedor: number;
  proveedor_nombre: string;
  whatsapp?: string;
  precio_unitario: number;
  tiempo_entrega_dias: number;
  calificacion_historica: number;
  score_final: string;
}

// ── Helpers ───────────────────────────────────────────────────
function stockPct(m: Material) {
  if (m.stock_minimo === 0) return 100;
  return Math.min(100, Math.round((m.stock_actual / m.stock_minimo) * 100));
}

function stockColor(pct: number) {
  if (pct >= 80) return "#10b981";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

function stars(n: number) {
  const safeN = Number(n) || 0;
  return "★".repeat(Math.round(safeN)) + "☆".repeat(5 - Math.round(safeN));
}

function normalizeMaterial(row: any): Material {
  const idValue = row?.id_material ?? row?.id ?? 0;
  return {
    id: idValue,
    id_material: idValue,
    sku_codigo: row?.sku_codigo ?? row?.sku ?? "",
    nombre: row?.nombre ?? row?.descripcion ?? "Sin nombre",
    stock_actual: Number(row?.stock_actual ?? 0),
    stock_minimo: Number(row?.stock_minimo ?? 0),
    unidad_medida: row?.unidad_medida ?? "",
  };
}

export default function DashboardSinme() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [despachando, setDespachando] = useState<number | string | null>(null);
  const [showDespachoModal, setShowDespachoModal] = useState(false);
  const [materialSeleccionado, setMaterialSeleccionado] = useState<Material | null>(null);
  const [plantaDestino, setPlantaDestino] = useState("Adecor");
  const [cantidadDespacho, setCantidadDespacho] = useState(1);
  const [despachoError, setDespachoError] = useState("");

  // Modal proveedor
  const [modalMaterial, setModalMaterial] = useState<Material | null>(null);
  const [proveedores, setProveedores] = useState<ResultadoAlgoritmo[]>([]);
  const [loadingProv, setLoadingProv] = useState(false);

  // Modal OC
  const [ocProveedor, setOcProveedor] = useState<ResultadoAlgoritmo | null>(null);
  const [ocMaterial, setOcMaterial] = useState<Material | null>(null);
  const [ocNumero] = useState(() => `OC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`);

  // ── Fetch materiales ────────────────────────────────────────
  async function fetchMateriales() {
    const { data, error } = await supabase
      .from("materiales")
      .select("*");

    if (!error && data) {
      const materialesNormalizados = data.map(normalizeMaterial).sort((a, b) => Number(a.id_material) - Number(b.id_material));
      setMateriales(materialesNormalizados);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchMateriales();
  }, []);

  // ── Fetch proveedores para un material ─────────────────────
  async function abrirModal(m: Material) {
    setModalMaterial(m);
    setProveedores([]);
    setLoadingProv(true);

    const { data, error } = await supabase
      .from("resultado_algoritmo")
      .select("*")
      .eq("id_material", m.id_material)
      .limit(10);

    if (!error && data) {
      setProveedores(data as ResultadoAlgoritmo[]);
    } else {
      console.warn("No se pudieron cargar los proveedores:", error?.message);
      setProveedores([]);
    }

    setLoadingProv(false);
  }

  function cerrarModal() {
    setModalMaterial(null);
    setProveedores([]);
  }

  function generarOC(prov: ResultadoAlgoritmo) {
    setOcProveedor(prov);
    setOcMaterial(modalMaterial);
    cerrarModal();
  }

  function abrirModalDespacho(material: Material) {
    setMaterialSeleccionado(material);
    setPlantaDestino("Adecor");
    setCantidadDespacho(1);
    setDespachoError("");
    setShowDespachoModal(true);
  }

  function cerrarModalDespacho() {
    setShowDespachoModal(false);
    setMaterialSeleccionado(null);
    setDespachoError("");
  }

  async function despacharAPlanta(material: Material, cantidad_a_restar: number, planta_destino: string) {
    if (material.stock_actual <= 0) return;
    if (cantidad_a_restar <= 0) {
      setDespachoError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (cantidad_a_restar > material.stock_actual) {
      setDespachoError("No puedes despachar más de lo disponible.");
      return;
    }

    setDespachando(material.id_material ?? material.id ?? null);
    setDespachoError("");

    const nuevoStock = material.stock_actual - cantidad_a_restar;
    const recordId = material.id_material ?? material.id;
    const { error } = await supabase
      .from("materiales")
      .update({ stock_actual: nuevoStock })
      .eq("id", recordId);

    setDespachando(null);

    if (error) {
      console.error(`Error al despachar a ${planta_destino}:`, error);
      setDespachoError("No se pudo actualizar el stock. Intenta de nuevo.");
      return;
    }

    await fetchMateriales();
    cerrarModalDespacho();
  }

  // ── KPIs ────────────────────────────────────────────────────
  const totalCatalogo = materiales.length;
  const quiebres = materiales.filter((m) => m.stock_actual < m.stock_minimo).length;
  const saludPct =
    totalCatalogo === 0
      ? 100
      : Math.round(((totalCatalogo - quiebres) / totalCatalogo) * 100);

  const today = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ── OC helpers ─────────────────────────────────────────────
  const ocSubtotal = ocProveedor && ocMaterial
    ? Number(ocProveedor.precio_unitario) || 0
    : 0;
  const ocIgv = Math.round(ocSubtotal * 0.18 * 100) / 100;
  const ocTotal = Math.round((ocSubtotal + ocIgv) * 100) / 100;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ background: "#f0f4f8", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        background: "#0A2E50", height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "#C59B63", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 18, color: "#fff",
          }}>S</div>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 500, letterSpacing: 0.3 }}>
            CONSORCIO SINME S.A.C.
          </span>
        </div>
        <div style={{
          background: "#064e3b", border: "1px solid #10b981",
          borderRadius: 20, padding: "4px 12px",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "#10b981",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          Server Operational
        </div>
      </nav>

      <div style={{ padding: "20px 24px" }}>

        {/* ── KPI CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
          {/* Catálogo */}
          <div style={cardStyle}>
            <div style={{ ...iconBox, background: "#eff6ff" }}>
              <svg width="22" height="22" fill="none" stroke="#3b82f6" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div>
              <div style={kpiLabel}>Catálogo</div>
              <div style={kpiValue}>{loading ? "—" : totalCatalogo}</div>
              <div style={kpiSub}>SKUs registrados</div>
            </div>
          </div>

          {/* Quiebres */}
          <div style={cardStyle}>
            <div style={{ ...iconBox, background: "#fef2f2" }}>
              <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div style={kpiLabel}>Quiebres de Stock</div>
              <div style={{ ...kpiValue, color: quiebres > 0 ? "#ef4444" : "#10b981" }}>
                {loading ? "—" : quiebres}
              </div>
              <div style={kpiSub}>Requieren atención</div>
            </div>
          </div>

          {/* Salud */}
          <div style={cardStyle}>
            <div style={{ ...iconBox, background: "#f0fdf4" }}>
              <svg width="22" height="22" fill="none" stroke="#10b981" strokeWidth="1.8" viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={kpiLabel}>Salud General</div>
              <div style={{ ...kpiValue, color: "#10b981" }}>{loading ? "—" : `${saludPct}%`}</div>
              <div style={{ background: "#e2e8f0", borderRadius: 4, height: 6, marginTop: 6 }}>
                <div style={{ width: `${saludPct}%`, height: 6, borderRadius: 4, background: "#10b981", transition: "width 0.6s" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── TABLA ── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "0.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#0f172a" }}>Monitor de Tuberías y Soldadura</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {loading ? "Cargando..." : `${totalCatalogo} productos · ${quiebres} con quiebre`}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              Cargando materiales...
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["SKU", "Material", "Stock visual", "Cantidad", "Mínimo", "Acción"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 500, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", borderBottom: "0.5px solid #e2e8f0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materiales.map((m) => {
                  const pct = stockPct(m);
                  const color = stockColor(pct);
                  const isLow = m.stock_actual < m.stock_minimo;
                  return (
                    <tr key={m.id_material} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: 4 }}>
                          {m.sku_codigo}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: "#0f172a" }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{m.unidad_medida}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ width: 120, height: 8, background: "#e2e8f0", borderRadius: 4 }}>
                          <div style={{ width: `${pct}%`, height: 8, borderRadius: 4, background: color, transition: "width 0.5s" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{pct}%</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: isLow ? "#ef4444" : "#334155", fontWeight: isLow ? 500 : 400 }}>
                        {m.stock_actual} {m.unidad_medida}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 12 }}>
                        {m.stock_minimo} {m.unidad_medida}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {isLow ? (
                            <button
                              onClick={() => abrirModal(m)}
                              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
                            >
                              Evaluar Proveedores
                            </button>
                          ) : (
                            <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                              Nivel Óptimo
                            </span>
                          )}
                          <button
                            onClick={() => abrirModalDespacho(m)}
                            disabled={despachando === m.id_material || m.stock_actual <= 0}
                            style={{
                              background: despachando === m.id_material ? "#94a3b8" : "#0A2E50",
                              color: "#fff",
                              border: "none",
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "4px 10px",
                              borderRadius: 6,
                              cursor: m.stock_actual <= 0 ? "not-allowed" : "pointer",
                            }}
                          >
                            {despachando === m.id_material ? "Despachando..." : "Despachar a Planta"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODAL DESPACHO A PLANTA ── */}
      {showDespachoModal && materialSeleccionado && (
        <div
          onClick={cerrarModalDespacho}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: 420, maxWidth: "95vw", overflow: "hidden" }}
          >
            <div style={{ background: "#0A2E50", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>Despacho a Planta</div>
                <div style={{ color: "#93a8c0", fontSize: 12, marginTop: 2 }}>{materialSeleccionado.sku_codigo} · {materialSeleccionado.nombre}</div>
              </div>
              <button onClick={cerrarModalDespacho} style={{ background: "none", border: "none", color: "#93a8c0", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#64748b" }}>
                  Planta destino
                  <select
                    value={plantaDestino}
                    onChange={(e) => setPlantaDestino(e.target.value)}
                    style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13 }}
                  >
                    <option value="Adecor">Adecor</option>
                    <option value="Rintisa">Rintisa</option>
                    <option value="Famesa">Famesa</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#64748b" }}>
                  Cantidad a despachar
                  <input
                    type="number"
                    min={1}
                    max={materialSeleccionado.stock_actual}
                    value={cantidadDespacho}
                    onChange={(e) => setCantidadDespacho(Number(e.target.value))}
                    style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </label>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Stock actual: <strong>{materialSeleccionado.stock_actual} {materialSeleccionado.unidad_medida}</strong>
                </div>
                {despachoError && (
                  <div style={{ color: "#b91c1c", fontSize: 12 }}>{despachoError}</div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={cerrarModalDespacho}
                  style={{ background: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => despacharAPlanta(materialSeleccionado, cantidadDespacho, plantaDestino)}
                  disabled={despachando === materialSeleccionado.id_material}
                  style={{ background: "#0A2E50", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  {despachando === materialSeleccionado.id_material ? "Despachando..." : `Enviar a ${plantaDestino}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ANÁLISIS ALGORÍTMICO ── */}
      {modalMaterial && (
        <div
          onClick={cerrarModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "95vw", overflow: "hidden" }}
          >
            <div style={{ background: "#0A2E50", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>Análisis Algorítmico</div>
                <div style={{ color: "#93a8c0", fontSize: 12, marginTop: 2 }}>{modalMaterial.sku_codigo} · {modalMaterial.nombre}</div>
              </div>
              <button onClick={cerrarModal} style={{ background: "none", border: "none", color: "#93a8c0", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 16 }}>
              {loadingProv ? (
                <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 14 }}>Calculando ranking...</div>
              ) : proveedores.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 14 }}>Sin proveedores registrados para este ítem.</div>
              ) : (
                proveedores.map((p, i) => (
                  <div
                    key={p.id_proveedor}
                    style={{
                      border: i === 0 ? "2px solid #C59B63" : "0.5px solid #e2e8f0",
                      background: i === 0 ? "#fffbf5" : "#fff",
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    {i === 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#C59B63", color: "#fff", fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, marginBottom: 8 }}>
                        🏆 Ganador del Algoritmo
                      </div>
                    )}
                    <div style={{ fontWeight: 500, fontSize: 14, color: "#0f172a", marginBottom: 6 }}>{p.proveedor_nombre}</div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "#0A2E50", marginBottom: 6 }}>
                      S/ {Number(p.precio_unitario)?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 3 }}>
                      <span>Entrega estimada</span>
                      <span style={{ fontWeight: 500, color: "#0f172a" }}>{p.tiempo_entrega_dias} días hábiles</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 3 }}>
                      <span>Calificación</span>
                      <span style={{ color: "#f59e0b", fontWeight: 500 }}>{stars(p.calificacion_historica)} {Number(p.calificacion_historica)?.toFixed(1) || "0.0"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                      <span>Score algoritmo</span>
                      <span style={{ fontWeight: 500, color: "#0f172a" }}>{p.score_final}</span>
                    </div>
                    {i === 0 && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <a
                          href={`https://wa.me/${(p.whatsapp || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 500, cursor: "pointer", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          WhatsApp
                        </a>
                        <button
                          onClick={() => generarOC(p)}
                          style={{ flex: 2, background: "#0A2E50", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                        >
                          Generar OC
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ORDEN DE COMPRA ── */}
      {ocProveedor && ocMaterial && (
        <div
          onClick={() => setOcProveedor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* OC header */}
            <div style={{ background: "#0A2E50", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#C59B63", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "#fff" }}>S</div>
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>Consorcio Sinme S.A.C.</div>
                  <div style={{ color: "#93a8c0", fontSize: 11, marginTop: 2 }}>RUC: 20601234567 · Ayacucho, Perú</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#93a8c0", letterSpacing: "0.5px" }}>Orden de Compra</div>
                <div style={{ fontSize: 17, fontWeight: 500, color: "#C59B63", marginTop: 2 }}>{ocNumero}</div>
                <div style={{ fontSize: 11, color: "#93a8c0", marginTop: 2 }}>Fecha: {today}</div>
              </div>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Parties */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Emisor", name: "Consorcio Sinme S.A.C.", detail: "RUC: 20601234567\nAv. Mariscal Cáceres 1240\nAyacucho, Huamanga" },
                  { label: "Proveedor", name: ocProveedor.proveedor_nombre, detail: `WhatsApp: ${ocProveedor.whatsapp || 'No registrado'}\nEntrega: ${ocProveedor.tiempo_entrega_dias} días hábiles` },
                ].map((p) => (
                  <div key={p.label} style={{ background: "#f8fafc", border: "0.5px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>{p.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "pre-line", lineHeight: 1.6 }}>{p.detail}</div>
                  </div>
                ))}
              </div>

              {/* Item */}
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "0.5px solid #e2e8f0" }}>
                Detalle del pedido
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {["SKU", "Descripción", "Cant.", "P. Unit.", "Total"].map((h) => (
                      <th key={h} style={{ textAlign: h === "SKU" || h === "Descripción" ? "left" : "right", padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "#64748b", borderBottom: "0.5px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{ocMaterial.sku_codigo}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ fontWeight: 500, color: "#0f172a" }}>{ocMaterial.nombre}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{ocMaterial.unidad_medida}</div>
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right" }}>{ocMaterial.stock_minimo} {ocMaterial.unidad_medida}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right" }}>
                      S/ {((Number(ocProveedor?.precio_unitario) || 0) / (Number(ocMaterial?.stock_minimo) || 1))?.toFixed(2) || "0.00"}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 500 }}>
                      S/ {Number(ocProveedor?.precio_unitario)?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <div style={{ width: 240 }}>
                  {[
                    { label: "Subtotal", val: `S/ ${ocSubtotal?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}` },
                    { label: "IGV (18%)", val: `S/ ${ocIgv?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}` },
                  ].map((r) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#64748b" }}>
                      <span>{r.label}</span><span>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500, color: "#0A2E50", borderTop: "1px solid #0A2E50", marginTop: 6, paddingTop: 8 }}>
                    <span>Total a pagar</span>
                    <span>S/ {ocTotal?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}</span>
                  </div>
                </div>
              </div>

              {/* Cláusulas */}
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 8 }}>Condiciones</div>
              <div style={{ background: "#f8fafc", border: "0.5px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                {[
                  ["Forma de pago", "50% adelanto, 50% contra entrega conforme."],
                  ["Plazo de entrega", `${ocProveedor.tiempo_entrega_dias} días hábiles desde confirmación.`],
                  ["Garantía", "12 meses contra defectos de fabricación."],
                  ["Penalidad", "1% del monto total por cada día hábil de retraso."],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 11, color: "#64748b", padding: "3px 0", lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 500, color: "#334155" }}>{k}: </span>{v}
                  </div>
                ))}
              </div>

              {/* Firmas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                {[
                  { name: "Ing. Carlos Mendoza Palomino", role: "Jefe de Logística · Consorcio Sinme S.A.C." },
                  { name: "Representante Legal", role: ocProveedor.proveedor_nombre },
                ].map((s) => (
                  <div key={s.name} style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #334155", paddingTop: 8, marginTop: 32 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.role}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "0.5px solid #e2e8f0", paddingTop: 16 }}>
                <button
                  onClick={() => setOcProveedor(null)}
                  style={{ background: "#fff", color: "#0A2E50", border: "1px solid #0A2E50", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  Cerrar
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ background: "#0A2E50", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  Imprimir OC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: "0.5px solid #e2e8f0",
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const iconBox: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const kpiLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 4,
};

const kpiValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 500,
  color: "#0f172a",
};

const kpiSub: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};
