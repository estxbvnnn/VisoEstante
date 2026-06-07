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
 * Returns a human-readable expiry label.
 */
export function getExpiryLabel(days) {
  if (days === null || days === undefined) return 'Sin fecha';
  if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
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
