import { IVA_RATE } from '../constants/tax';

/**
 * Utilidades de impuesto chileno (IVA 19%).
 *
 * Convención del proyecto: el campo `price` de un producto es el valor NETO
 * (sin IVA). A partir del neto se calcula el IVA y el precio bruto (final, el
 * que paga el cliente). El IVA se calcula siempre sobre el neto y se redondea a
 * pesos enteros, ya que el peso chileno (CLP) no usa decimales. Así se cumple
 * siempre: neto + iva = bruto.
 */

/** Redondea a pesos enteros (CLP no usa decimales). */
export function roundCLP(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Valor neto (sin IVA) redondeado a pesos. */
export function getNetPrice(net) {
  return roundCLP(net);
}

/** Monto de IVA correspondiente a un valor neto. */
export function getTaxAmount(net) {
  return roundCLP((Number(net) || 0) * IVA_RATE);
}

/** Precio bruto / final (neto + IVA), el que paga el cliente. */
export function getGrossPrice(net) {
  return getNetPrice(net) + getTaxAmount(net);
}

/**
 * Desglose completo de un valor neto.
 * @returns {{ net: number, tax: number, gross: number }}
 */
export function getPriceBreakdown(net) {
  const n = getNetPrice(net);
  const tax = getTaxAmount(net);
  return { net: n, tax, gross: n + tax };
}

/**
 * Desglose de IVA para una valoración total (ej. inventario), calculado sobre
 * el neto total para evitar acumular errores de redondeo por unidad.
 * @returns {{ net: number, tax: number, gross: number }}
 */
export function getTotalsBreakdown(totalNet) {
  return getPriceBreakdown(totalNet);
}
