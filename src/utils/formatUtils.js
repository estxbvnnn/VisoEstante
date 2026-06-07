/**
 * Formats a number as Chilean Peso (CLP).
 */
export function formatCLP(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a barcode string for display.
 */
export function formatBarcode(barcode) {
  if (!barcode) return '—';
  return barcode;
}

/**
 * Formats a stock quantity for display.
 */
export function formatStock(quantity) {
  if (quantity === null || quantity === undefined) return '—';
  return `${quantity} ud.`;
}
