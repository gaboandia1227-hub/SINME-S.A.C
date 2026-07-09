import { describe, test, expect } from "@jest/globals";

// Interfaces réplicas para las pruebas
interface Material {
  id_material: number;
  sku_codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
}

// ── TRAEMOS LAS FUNCIONES EXACTAS DE TU FRONTEND ─────────────────
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

// ── SUITE DE PRUEBAS UNITARIAS ───────────────────────────────────
describe("Pruebas Unitarias - Sistema de Inventario CONSORCIO SINME S.A.C.", () => {

  // 1. Pruebas para el cálculo del porcentaje de stock
  describe("Función: stockPct() - Análisis de Valores Límite", () => {
    test("Debería retornar 100 si el stock mínimo es 0 (Evita división entre cero)", () => {
      const materialFalso: Material = {
        id_material: 1, sku_codigo: "TEST-01", nombre: "Tubo",
        stock_actual: 10, stock_minimo: 0, unidad_medida: "Unidades"
      };
      expect(stockPct(materialFalso)).toBe(100);
    });

    test("Debería calcular el porcentaje correcto a la mitad del stock mínimo", () => {
      const materialFalso: Material = {
        id_material: 2, sku_codigo: "TEST-02", nombre: "Platina",
        stock_actual: 20, stock_minimo: 40, unidad_medida: "Unidades"
      };
      expect(stockPct(materialFalso)).toBe(50);
    });

    test("Debería truncar el resultado en 100 si el stock actual supera al mínimo", () => {
      const materialFalso: Material = {
        id_material: 3, sku_codigo: "TEST-03", nombre: "Electrodo",
        stock_actual: 80, stock_minimo: 40, unidad_medida: "Cajas"
      };
      expect(stockPct(materialFalso)).toBe(100);
    });
  });

  // 2. Pruebas para las alertas visuales de colores
  describe("Función: stockColor() - Partición de Equivalencia", () => {
    test("Debería retornar Verde (#10b981) en el límite exacto de 80%", () => {
      expect(stockColor(80)).toBe("#10b981");
    });

    test("Debería retornar Ámbar (#f59e0b) justo un punto abajo del límite (79%)", () => {
      expect(stockColor(79)).toBe("#f59e0b");
    });

    test("Debería retornar Ámbar (#f59e0b) en el límite inferior de 40%", () => {
      expect(stockColor(40)).toBe("#f59e0b");
    });

    test("Debería retornar Rojo (#ef4444) justo un punto abajo de la alerta crítica (39%)", () => {
      expect(stockColor(39)).toBe("#ef4444");
    });
  });

  // 3. Pruebas para las estrellas de reputación de proveedores
  describe("Función: stars() - Formateo de Calificación", () => {
    test("Debería renderizar 5 estrellas llenas para una calificación perfecta de 5", () => {
      expect(stars(5)).toBe("★★★★★");
    });

    test("Debería redondear hacia arriba una calificación decimal de 4.6 a 5 estrellas", () => {
      expect(stars(4.6)).toBe("★★★★★");
    });

    test("Debería redondear hacia abajo una calificación decimal de 3.4 a 3 estrellas llenas y 2 vacías", () => {
      expect(stars(3.4)).toBe("★★★☆☆");
    });

    test("Debería manejar correctamente un valor de 0 o inválido devolviendo 5 estrellas vacías", () => {
      expect(stars(0)).toBe("☆☆☆☆☆");
    });
  });
});