export const PRODUCT_STATUS = {
  VIGENTE: 'vigente',
  POR_VENCER: 'por_vencer',
  VENCIDO: 'vencido',
  SIN_STOCK: 'sin_stock',
};

export const STATUS_LABELS = {
  [PRODUCT_STATUS.VIGENTE]: 'Vigente',
  [PRODUCT_STATUS.POR_VENCER]: 'Por vencer',
  [PRODUCT_STATUS.VENCIDO]: 'Vencido',
  [PRODUCT_STATUS.SIN_STOCK]: 'Sin stock',
};

export const STATUS_COLORS = {
  [PRODUCT_STATUS.VIGENTE]: 'bg-green-100 text-green-800',
  [PRODUCT_STATUS.POR_VENCER]: 'bg-yellow-100 text-yellow-800',
  [PRODUCT_STATUS.VENCIDO]: 'bg-red-100 text-red-800',
  [PRODUCT_STATUS.SIN_STOCK]: 'bg-gray-100 text-gray-800',
};
