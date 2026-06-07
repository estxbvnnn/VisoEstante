import { PRODUCT_STATUS, STATUS_LABELS, STATUS_COLORS } from '../constants/productStatus';
import { getDaysToExpiry } from './dateUtils';

/**
 * Calculates the product status based on expiration date, stock levels.
 */
export function calculateProductStatus(expirationDate, currentStock, minStock) {
  if (currentStock === 0) return PRODUCT_STATUS.SIN_STOCK;
  const days = getDaysToExpiry(expirationDate);
  if (days !== null && days < 0) return PRODUCT_STATUS.VENCIDO;
  if (days !== null && days <= 30) return PRODUCT_STATUS.POR_VENCER;
  return PRODUCT_STATUS.VIGENTE;
}

/**
 * Returns Tailwind CSS color classes for a given status.
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Returns a human-readable label for a given status.
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || 'Desconocido';
}
