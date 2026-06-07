export const ALERT_TYPES = {
  LOW_STOCK: 'low_stock',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
};

export const ALERT_LABELS = {
  [ALERT_TYPES.LOW_STOCK]: 'Stock bajo',
  [ALERT_TYPES.EXPIRING_SOON]: 'Por vencer',
  [ALERT_TYPES.EXPIRED]: 'Vencido',
};

export const ALERT_SEVERITY = {
  WARNING: 'warning',
  CRITICAL: 'critical',
};
