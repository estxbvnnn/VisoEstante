import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { PRODUCT_STATUS } from '../constants/productStatus';
import { ROLES } from '../constants/roles';
import { formatCLP } from '../utils/formatUtils';
import { getGrossPrice, getTotalsBreakdown } from '../utils/taxUtils';
import { IVA_LABEL } from '../constants/tax';
import { formatChileanDate, getDaysToExpiry } from '../utils/dateUtils';
import StatusBadge from '../components/ui/StatusBadge';
import KpiCard from '../components/ui/KpiCard';
import { exportProductsToExcel } from '../utils/exportUtils';

function expiryLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `Hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`;
  if (days === 0) return 'Vence hoy';
  return `En ${days} día${days !== 1 ? 's' : ''}`;
}

export default function ExpiredProducts() {
  const { products, loading } = useProducts();
  const { userData } = useAuth();

  const [includeExpiring, setIncludeExpiring] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');

  const canExport = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(userData?.role);

  // Conjunto base: vencidos (+ por vencer si se incluye).
  const base = useMemo(
    () =>
      products.filter(
        (p) =>
          p.status === PRODUCT_STATUS.VENCIDO ||
          (includeExpiring && p.status === PRODUCT_STATUS.POR_VENCER)
      ),
    [products, includeExpiring]
  );

  const categories = useMemo(
    () => ['all', ...new Set(base.map((p) => p.category).filter(Boolean))],
    [base]
  );

  const filtered = useMemo(() => {
    const list = base.filter((p) => {
      const matchSearch =
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search);
      const matchCategory = category === 'all' || p.category === category;
      return matchSearch && matchCategory;
    });
    const lossOf = (p) => (Number(p.currentStock) || 0) * (Number(p.price) || 0);
    list.sort((a, b) => {
      if (sortBy === 'loss') return lossOf(b) - lossOf(a);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      // urgency: más vencido / más próximo primero
      return (getDaysToExpiry(a.expirationDate) ?? 0) - (getDaysToExpiry(b.expirationDate) ?? 0);
    });
    return list;
  }, [base, search, category, sortBy]);

  const lossNet = filtered.reduce(
    (s, p) => s + (Number(p.currentStock) || 0) * (Number(p.price) || 0),
    0
  );
  const loss = getTotalsBreakdown(lossNet);
  const units = filtered.reduce((s, p) => s + (Number(p.currentStock) || 0), 0);
  const affectedCategories = new Set(filtered.map((p) => p.category).filter(Boolean)).size;

  const filtersActive = search || category !== 'all' || sortBy !== 'urgency';

  function handleExport() {
    exportProductsToExcel(filtered, 'productos-vencidos.xlsx', {
      generatedBy: userData?.displayName || userData?.email,
      role: userData?.role,
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#fef2f2_100%)] text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Control de vencimientos</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Productos vencidos</h1>
              <p className="mt-2 text-sm text-slate-600">Detalle de productos vencidos con filtros y valoración de la pérdida.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                disabled={!canExport || filtered.length === 0}
                className="inline-flex items-center gap-2 justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>📊</span> Exportar Excel
              </button>
              <Link to="/reports" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">📈 Reportes</Link>
              <Link to="/dashboard" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">← Dashboard</Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon="🚫" label="Productos" value={filtered.length} sub={`${units} unidades`} accent="from-rose-500 to-red-600" tone="text-rose-600" loading={loading} delay={0} />
          <KpiCard icon="💸" label="Pérdida (neto)" value={formatCLP(loss.net)} sub="stock × precio" accent="from-amber-500 to-orange-500" tone="text-amber-600" loading={loading} delay={60} />
          <KpiCard icon="🧮" label={IVA_LABEL} value={formatCLP(loss.tax)} sub="sobre la pérdida" accent="from-slate-500 to-slate-700" tone="text-slate-600" loading={loading} delay={120} />
          <KpiCard icon="📊" label="Pérdida con IVA" value={formatCLP(loss.gross)} sub={`${affectedCategories} categorías`} accent="from-rose-500 to-pink-600" tone="text-rose-600" loading={loading} delay={180} />
        </section>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <input
            type="search"
            placeholder="Buscar por nombre o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'all' ? 'Todas las categorías' : c}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          >
            <option value="urgency">Ordenar: más urgente</option>
            <option value="loss">Ordenar: mayor pérdida</option>
            <option value="name">Ordenar: nombre (A-Z)</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeExpiring}
              onChange={(e) => setIncludeExpiring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
            />
            Incluir por vencer
          </label>
          <span className="ml-auto text-xs font-medium text-slate-500">{filtered.length} de {base.length}</span>
          {filtersActive && (
            <button
              onClick={() => { setSearch(''); setCategory('all'); setSortBy('urgency'); }}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla detallada */}
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/90">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Producto</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Ubicación</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Precio (neto)</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Vencimiento</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Vencido</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Pérdida</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-3 animate-pulse rounded bg-slate-100" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">🎉 No hay productos {includeExpiring ? 'vencidos ni por vencer' : 'vencidos'} con esos filtros.</td></tr>
                ) : (
                  filtered.map((p) => {
                    const days = getDaysToExpiry(p.expirationDate);
                    const loss = (Number(p.currentStock) || 0) * (Number(p.price) || 0);
                    return (
                      <tr key={p.id} className="transition hover:bg-rose-50/40">
                        <td className="px-4 py-3">
                          <Link to={`/products/${p.id}`} className="font-medium text-slate-900 hover:text-rose-700 hover:underline">{p.name}</Link>
                          <div className="text-xs text-slate-400">{p.brand || 'Sin marca'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.category || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.barcode}</td>
                        <td className="px-4 py-3 text-slate-500">{p.shelfLocation || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{p.currentStock}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900">{formatCLP(p.price)}</div>
                          <div className="text-xs text-slate-400">c/IVA {formatCLP(getGrossPrice(p.price))}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatChileanDate(p.expirationDate)}</td>
                        <td className={`px-4 py-3 font-semibold ${days < 0 ? 'text-rose-600' : 'text-amber-600'}`}>{expiryLabel(days)}</td>
                        <td className="px-4 py-3 font-semibold text-rose-700">{formatCLP(loss)}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
