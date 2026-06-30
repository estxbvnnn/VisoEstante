// Acciones registradas en la colección audit_logs y su presentación.
export const AUDIT_ACTION_LABELS = {
  stock_updated: 'Stock actualizado',
  price_updated: 'Precio actualizado',
  product_scanned: 'Producto escaneado',
  alert_resolved: 'Alerta resuelta',
  sale_created: 'Venta registrada',
  product_sold: 'Vendido',
};

export const AUDIT_ACTION_ICONS = {
  stock_updated: '📦',
  price_updated: '💲',
  product_scanned: '📷',
  alert_resolved: '✅',
  sale_created: '🧾',
  product_sold: '🛒',
};

export function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] || action || 'Evento';
}

export function auditActionIcon(action) {
  return AUDIT_ACTION_ICONS[action] || '•';
}
