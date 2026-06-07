import { useAlerts } from '../../hooks/useAlerts';
import { Link } from 'react-router-dom';
import { formatChileanDate } from '../../utils/dateUtils';
import { formatCLP } from '../../utils/formatUtils';

export default function AlertBanner() {
  const { alerts, criticalCount } = useAlerts();

  if (alerts.length === 0) return null;

  const hasCritical = criticalCount > 0;

  return (
    <div
      className={`w-full border-b border-white/20 px-4 py-3 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]
        ${hasCritical ? 'bg-gradient-to-r from-rose-700 via-red-600 to-orange-500' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500'}
      `}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {hasCritical && (
            <span className="mt-1 inline-block h-3 w-3 shrink-0 animate-pulse rounded-full bg-white/95 shadow-[0_0_0_0_rgba(255,255,255,0.5)]" />
          )}
          <div className="min-w-0">
            <span className="block text-sm font-semibold tracking-wide">
              {hasCritical
                ? `⚠ ${criticalCount} alerta${criticalCount !== 1 ? 's' : ''} crítica${criticalCount !== 1 ? 's' : ''} activa${criticalCount !== 1 ? 's' : ''}`
                : `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''} activa${alerts.length !== 1 ? 's' : ''}`}
            </span>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/85">
              <span className="truncate">{alerts[0]?.message}</span>
              {alerts[0]?.productSnapshot?.category && <span>{alerts[0].productSnapshot.category}</span>}
              {alerts[0]?.productSnapshot?.expirationDate && (
                <span>Vence {formatChileanDate(alerts[0].productSnapshot.expirationDate)}</span>
              )}
              {typeof alerts[0]?.productSnapshot?.price === 'number' && (
                <span>{formatCLP(alerts[0].productSnapshot.price)}</span>
              )}
            </div>
          </div>
          <Link
            to="/alerts"
            className="shrink-0 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Ver alertas →
          </Link>
        </div>
      </div>
    </div>
  );
}
