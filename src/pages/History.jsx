import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSales } from '../hooks/useSales';
import { formatCLP } from '../utils/formatUtils';
import { IVA_LABEL } from '../constants/tax';
import { toDate } from '../utils/dateUtils';
import KpiCard from '../components/ui/KpiCard';
import TrendChart from '../components/ui/TrendChart';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Nombres de mes en español (independientes del año, solo para etiquetas).
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: capitalize(new Date(2000, i, 1).toLocaleDateString('es-CL', { month: 'long' })),
  short: capitalize(new Date(2000, i, 1).toLocaleDateString('es-CL', { month: 'short' })),
}));

export default function History() {
  const { sales, loading } = useSales(2000);
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('all'); // 'all' | 1-12

  // Años disponibles: los que tienen ventas registradas + el año actual.
  const availableYears = useMemo(() => {
    const years = new Set([currentYear]);
    sales.forEach((s) => {
      const d = toDate(s.createdAt);
      if (d) years.add(d.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [sales, currentYear]);

  const { buckets, filteredCount, summary, topByRevenue, topByUnits } = useMemo(() => {
    const inRange = sales.filter((s) => {
      const d = toDate(s.createdAt);
      if (!d) return false;
      if (d.getFullYear() !== year) return false;
      if (month !== 'all' && d.getMonth() + 1 !== month) return false;
      return true;
    });

    // Los 12 meses del año solo tienen sentido cuando se ve el año completo.
    const buckets =
      month === 'all'
        ? MONTH_OPTIONS.map((m) => ({ key: m.value, label: m.short, count: 0, net: 0, tax: 0, gross: 0 }))
        : [];

    const products = new Map(); // productId -> { name, units, revenue }
    let count = 0, net = 0, tax = 0, gross = 0;

    inRange.forEach((sale) => {
      const d = toDate(sale.createdAt);
      count += 1;
      net += Number(sale.totalNet) || 0;
      tax += Number(sale.totalTax) || 0;
      gross += Number(sale.totalGross) || 0;

      if (month === 'all' && d) {
        const bucket = buckets[d.getMonth()];
        bucket.count += 1;
        bucket.net += Number(sale.totalNet) || 0;
        bucket.tax += Number(sale.totalTax) || 0;
        bucket.gross += Number(sale.totalGross) || 0;
      }

      (sale.items || []).forEach((item) => {
        const entry = products.get(item.productId) || { name: item.name, units: 0, revenue: 0 };
        entry.units += Number(item.quantity) || 0;
        entry.revenue += Number(item.lineNet) || 0;
        products.set(item.productId, entry);
      });
    });

    const list = [...products.values()];
    const topByRevenue = [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const topByUnits = [...list].sort((a, b) => b.units - a.units).slice(0, 5);

    return {
      buckets,
      filteredCount: count,
      summary: { count, net, tax, gross, avgTicket: count > 0 ? gross / count : 0 },
      topByRevenue,
      topByUnits,
    };
  }, [sales, year, month]);

  const monthLabel = month === 'all' ? 'todos los meses' : MONTH_OPTIONS[month - 1].label;
  const periodLabel = month === 'all' ? `${year}` : `${MONTH_OPTIONS[month - 1].label} ${year}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700">Histórico</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Ventas y precios — {periodLabel}</h1>
              <p className="mt-2 text-sm text-slate-600">Tendencia de lo vendido (neto, IVA y total) y los productos que más aportaron.</p>
            </div>
            <Link to="/dashboard" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Año</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">Todos los meses</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {month !== 'all' && (
            <button
              onClick={() => setMonth('all')}
              className="mt-5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              Ver año completo
            </button>
          )}
          <span className="ml-auto mt-5 text-xs font-medium text-slate-500">{filteredCount} venta(s) en {monthLabel === 'todos los meses' ? year : periodLabel}</span>
        </div>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard icon="🧾" label="Ventas" value={summary.count} sub={periodLabel} accent="from-indigo-500 to-violet-500" tone="text-indigo-600" loading={loading} delay={0} />
          <KpiCard icon="💵" label="Total neto" value={formatCLP(summary.net)} sub="sin IVA" accent="from-slate-500 to-slate-700" tone="text-slate-600" loading={loading} delay={60} />
          <KpiCard icon="🧮" label={IVA_LABEL} value={formatCLP(summary.tax)} sub="recaudado" accent="from-amber-500 to-orange-500" tone="text-amber-600" loading={loading} delay={120} />
          <KpiCard icon="💰" label="Total obtenido" value={formatCLP(summary.gross)} sub="con IVA" accent="from-emerald-500 to-teal-500" tone="text-emerald-600" loading={loading} delay={180} />
          <KpiCard icon="🎟️" label="Ticket promedio" value={formatCLP(summary.avgTicket)} sub="por venta" accent="from-blue-500 to-cyan-500" tone="text-blue-600" loading={loading} delay={240} />
        </section>

        {/* Tendencia (solo con el año completo, para poder graficar una línea) */}
        {month === 'all' && (
          <section className="animate-fade-in-up rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <h2 className="font-semibold text-slate-800">Tendencia mensual — {year}</h2>
            <p className="mt-1 text-sm text-slate-500">Lo vendido (neto y total con IVA) en cada mes del año seleccionado.</p>
            {loading ? (
              <div className="mt-4 h-56 animate-pulse rounded-2xl bg-slate-100" />
            ) : summary.count === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No hay ventas registradas en {year}.</p>
            ) : (
              <div className="mt-4">
                <TrendChart
                  labels={buckets.map((b) => b.label)}
                  series={[
                    { label: 'Neto', color: '#64748b', values: buckets.map((b) => b.net) },
                    { label: 'Total con IVA', color: '#10b981', values: buckets.map((b) => b.gross) },
                  ]}
                  formatValue={formatCLP}
                />
              </div>
            )}
          </section>
        )}

        {/* Detalle mensual + Top productos */}
        <section className={`grid gap-6 ${month === 'all' ? 'lg:grid-cols-2' : ''}`}>
          {month === 'all' && (
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
              <div className="px-5 py-4">
                <h2 className="font-semibold text-slate-800">Detalle por mes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-slate-200 bg-slate-50/90">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Mes</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Ventas</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Neto</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Total c/IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buckets.map((b) => (
                      <tr
                        key={b.key}
                        className={`cursor-pointer transition hover:bg-indigo-50/60 ${b.count === 0 ? 'text-slate-300' : ''}`}
                        onClick={() => setMonth(b.key)}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-900">{b.label}</td>
                        <td className="px-4 py-2.5 text-slate-600">{b.count}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatCLP(b.net)}</td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-700">{formatCLP(b.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="px-5 py-4">
              <h2 className="font-semibold text-slate-800">Top productos (por ingreso neto)</h2>
              <p className="text-xs text-slate-400">{periodLabel}</p>
            </div>
            {topByRevenue.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-400">Sin ventas en este período.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {topByRevenue.map((p, i) => (
                  <li key={p.name + i} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{i + 1}</span>
                      <span className="truncate text-sm font-medium text-slate-800">{p.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCLP(p.revenue)}</p>
                      <p className="text-xs text-slate-400">{p.units} u. vendidas</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {topByUnits.length > 0 && (
          <section className="animate-fade-in-up rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <h2 className="font-semibold text-slate-700">Más vendidos por unidades — {periodLabel}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topByUnits.map((p) => (
                <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{p.units}u</span> {p.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
