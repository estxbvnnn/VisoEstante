import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import AlertBanner from '../components/alerts/AlertBanner';
import Badge from '../components/ui/Badge';
import KpiCard from '../components/ui/KpiCard';
import DonutChart from '../components/ui/DonutChart';
import { ALERT_TYPES, ALERT_LABELS, ALERT_SEVERITY } from '../constants/alertTypes';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { formatChileanDate } from '../utils/dateUtils';
import { formatCLP } from '../utils/formatUtils';
import { exportAlertsToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';

export default function Alerts() {
  const { alerts, resolvedAlerts, loading, resolveAlert } = useAlerts();
  const { userData } = useAuth();
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('active'); // 'active' | 'resolved'
  const [resolving, setResolving] = useState(null);

  const filtered =
    filter === 'all' ? alerts : alerts.filter((a) => a.type === filter);
  const canExport = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(userData?.role);

  const criticalCount = alerts.filter((a) => a.severity === ALERT_SEVERITY.CRITICAL).length;
  const warningCount = alerts.filter((a) => a.severity === ALERT_SEVERITY.WARNING).length;
  const lowStockCount = alerts.filter((a) => a.type === ALERT_TYPES.LOW_STOCK).length;
  const expiringCount = alerts.filter((a) => a.type === ALERT_TYPES.EXPIRING_SOON).length;
  const expiredCount = alerts.filter((a) => a.type === ALERT_TYPES.EXPIRED).length;
  const typeDonut = [
    { label: 'Stock bajo', value: lowStockCount, color: '#3b82f6' },
    { label: 'Por vencer', value: expiringCount, color: '#f59e0b' },
    { label: 'Vencido', value: expiredCount, color: '#f43f5e' },
  ];

  function handleExportAlerts() {
    exportAlertsToExcel(filtered, 'reporte-alertas.xlsx', {
      generatedBy: userData?.displayName || userData?.email,
      role: userData?.role,
    });
  }

  async function handleResolve(alertId) {
    setResolving(alertId);
    try {
      await resolveAlert(alertId);
      toast.success('Alerta resuelta');
    } catch {
      toast.error('Error al resolver la alerta');
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#fff7ed_100%)]">
      <AlertBanner />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-fade-in-up overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400" />
          <div className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Supervisor</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Centro de alertas</h1>
                <p className="mt-2 text-sm text-slate-600">Revisa y resuelve stock bajo, vencimientos y eventos críticos.</p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                ← Dashboard
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportAlerts}
                disabled={!canExport || filtered.length === 0}
                className="inline-flex items-center gap-2 justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>📊</span> Exportar alertas a Excel
              </button>
              <span className="text-xs text-slate-500">
              </span>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard icon="🔔" label="Total alertas" value={alerts.length} sub="activas" accent="from-slate-500 to-slate-700" tone="text-slate-600" loading={loading} delay={0} />
          <KpiCard icon="🚨" label="Críticas" value={criticalCount} sub="acción inmediata" accent="from-rose-500 to-red-600" tone="text-rose-600" loading={loading} delay={60} />
          <KpiCard icon="⚠️" label="Advertencias" value={warningCount} sub="atención pronto" accent="from-amber-500 to-orange-500" tone="text-amber-600" loading={loading} delay={120} />
          <KpiCard icon="📉" label="Stock bajo" value={lowStockCount} sub="reponer" accent="from-blue-500 to-cyan-500" tone="text-blue-600" loading={loading} delay={180} />
          <KpiCard icon="⏳" label="Por vencer" value={expiringCount} sub="≤ 30 días" accent="from-yellow-500 to-amber-500" tone="text-yellow-600" loading={loading} delay={240} />
        </section>

        {/* Distribution */}
        {alerts.length > 0 && (
          <section className="animate-fade-in-up rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">Distribución por tipo</h3>
              <p className="mt-1 text-sm text-slate-500">Composición de las alertas activas</p>
            </div>
            <DonutChart items={typeDonut} centerLabel="Alertas" />
          </section>
        )}

        {/* View toggle: Activas / Resueltas */}
        <div className="flex gap-2 rounded-2xl border border-white/70 bg-white/75 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-sm">
          {[
            { value: 'active', label: 'Activas', count: alerts.length },
            { value: 'resolved', label: 'Resueltas', count: resolvedAlerts.length },
          ].map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition
                ${view === value ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${view === value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {view === 'active' ? (
          <>
            {/* Type filter tabs */}
            <div className="flex gap-2 flex-wrap rounded-2xl border border-white/70 bg-white/75 p-3 shadow-lg shadow-slate-900/5 backdrop-blur-sm">
              {[
                { value: 'all', label: 'Todas' },
                { value: ALERT_TYPES.LOW_STOCK, label: 'Stock bajo' },
                { value: ALERT_TYPES.EXPIRING_SOON, label: 'Por vencer' },
                { value: ALERT_TYPES.EXPIRED, label: 'Vencidos' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                    ${filter === value ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Active alerts */}
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/70 bg-white/80 p-4 animate-pulse shadow-lg shadow-slate-900/5">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/70 bg-white/80 p-8 text-center text-slate-400 shadow-lg shadow-slate-900/5">
                  No hay alertas {filter !== 'all' ? `de tipo "${ALERT_LABELS[filter]}"` : 'activas'}.
                </div>
              ) : (
                filtered.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onResolve={handleResolve}
                    resolving={resolving === alert.id}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          /* Resolved alerts (last 24h) */
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Mostrando alertas resueltas en las <span className="font-semibold">últimas 24 horas</span>.
            </p>
            {resolvedAlerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/70 bg-white/80 p-10 text-center shadow-lg shadow-slate-900/5">
                <span className="text-3xl">🗂️</span>
                <p className="text-sm text-slate-500">No hay alertas resueltas en las últimas 24 horas.</p>
              </div>
            ) : (
              resolvedAlerts.map((alert) => <ResolvedCard key={alert.id} alert={alert} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, onResolve, resolving }) {
  const isCritical = alert.severity === ALERT_SEVERITY.CRITICAL;
  const snapshot = alert.productSnapshot || {};

  return (
    <div
      className={`overflow-hidden rounded-3xl border shadow-xl shadow-slate-900/5 transition hover:-translate-y-0.5
        ${isCritical ? 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white'}`}
    >
      <div className="flex items-stretch gap-0">
        <div className={`w-1.5 ${isCritical ? 'bg-rose-500' : 'bg-amber-400'}`} />
        <div className="flex-1 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={isCritical ? 'critical' : 'warning'}>
                  {ALERT_LABELS[alert.type]}
                </Badge>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {snapshot.category || 'Sin categoría'}
                </span>
                {isCritical && <span className="animate-pulse inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{alert.productName || snapshot.name || 'Producto sin nombre'}</h3>
              <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <DetailPill label="Marca" value={snapshot.brand || '—'} />
                <DetailPill label="Código" value={snapshot.barcode || '—'} mono />
                <DetailPill label="Ubicación" value={snapshot.shelfLocation || '—'} />
                <DetailPill
                  label="Vencimiento"
                  value={snapshot.expirationDate ? formatChileanDate(snapshot.expirationDate) : '—'}
                />
                <DetailPill
                  label="Stock"
                  value={
                    snapshot.currentStock != null && snapshot.minStock != null
                      ? `${snapshot.currentStock} / ${snapshot.minStock}`
                      : '—'
                  }
                />
                <DetailPill
                  label="Precio"
                  value={typeof snapshot.price === 'number' ? formatCLP(snapshot.price) : '—'}
                />
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-3 lg:flex-col lg:items-end">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Estado</p>
                <p className={`mt-1 text-sm font-semibold ${isCritical ? 'text-rose-700' : 'text-amber-700'}`}>
                  {isCritical ? 'Crítica' : 'Atención'}
                </p>
              </div>
              <button
                onClick={() => onResolve(alert.id)}
                disabled={resolving}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50
                  ${isCritical ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
              >
                {resolving ? 'Resolviendo…' : 'Resolver'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResolvedCard({ alert }) {
  const snapshot = alert.productSnapshot || {};
  return (
    <div className="animate-fade-in-up overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-white shadow-lg shadow-slate-900/5">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-emerald-500" />
        <div className="flex flex-1 flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                ✓ Resuelta
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {ALERT_LABELS[alert.type] || 'Alerta'}
              </span>
            </div>
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {alert.productName || snapshot.name || 'Producto sin nombre'}
            </h3>
            <p className="mt-0.5 truncate text-sm text-slate-600">{alert.message}</p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Resuelta el</p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {alert.resolvedAt ? formatChileanDate(alert.resolvedAt) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailPill({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
