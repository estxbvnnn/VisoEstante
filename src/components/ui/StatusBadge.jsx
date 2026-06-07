import { PRODUCT_STATUS } from '../../constants/productStatus';
import { getStatusColor, getStatusLabel } from '../../utils/statusUtils';

const STATUS_ICONS = {
  [PRODUCT_STATUS.VIGENTE]: '✓',
  [PRODUCT_STATUS.POR_VENCER]: '⚠',
  [PRODUCT_STATUS.VENCIDO]: '✕',
  [PRODUCT_STATUS.SIN_STOCK]: '○',
};

export default function StatusBadge({ status }) {
  const colorClass = getStatusColor(status);
  const label = getStatusLabel(status);
  const icon = STATUS_ICONS[status] || '?';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}
