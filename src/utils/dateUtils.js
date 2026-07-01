import { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firebase Timestamp or JS Date to a JS Date object.
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
}

/**
 * Returns the number of days until expiry (negative if already expired).
 */
export function getDaysToExpiry(expirationDate) {
  const expiry = toDate(expirationDate);
  if (!expiry) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry - now;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns a human-readable expiry label (e.g. "Vencido hace 58 días" instead
 * of a raw negative number). Pass `compact: true` for tight table cells,
 * which shortens "días"/"día" to "d" (e.g. "Vencido hace 58d").
 */
export function getExpiryLabel(days, compact = false) {
  if (days === null || days === undefined) return compact ? '—' : 'Sin fecha';
  if (days === 0) return 'Vence hoy';
  if (days === 1 && !compact) return 'Vence mañana';
  const abs = Math.abs(days);
  const amount = compact ? `${abs}d` : `${abs} día${abs !== 1 ? 's' : ''}`;
  return days < 0 ? `Vencido hace ${amount}` : `Vence en ${amount}`;
}

/**
 * Formats a date as DD/MM/YYYY (Chilean format).
 */
export function formatChileanDate(date) {
  const d = toDate(date);
  if (!d) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
