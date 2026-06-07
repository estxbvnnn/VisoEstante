export function parseNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseNonNegativeNumber(value) {
  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isFutureOrToday(date) {
  if (!date) return false;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return normalized >= today;
}
