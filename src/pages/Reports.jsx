import { useProducts } from '../hooks/useProducts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PRODUCT_STATUS } from '../constants/productStatus';
import { formatChileanDate, getDaysToExpiry } from '../utils/dateUtils';
import { formatCLP } from '../utils/formatUtils';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonCard from '../components/ui/SkeletonCard';
import KpiCard from '../components/ui/KpiCard';
import DonutChart from '../components/ui/DonutChart';
import { exportProductsToExcel } from '../utils/exportUtils';
import { ROLES } from '../constants/roles';

const LOW_STOCK_THRESHOLD = 20;

export default function Reports() {
  const { products, loading } = useProducts();
  const { userData } = useAuth();

  const expiredProducts = products.filter((p) => p.status === PRODUCT_STATUS.VENCIDO);
  const expiringProducts = products.filter((p) => p.status === PRODUCT_STATUS.POR_VENCER);
  const lowStockProducts = products.filter(
    (p) => p.currentStock <= p.minStock && p.currentStock > 0
  );

  const vigentes = products.filter((p) => p.status === PRODUCT_STATUS.VIGENTE).length;
  const inventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.currentStock) || 0) * (Number(p.price) || 0),
    0
  );
  const riskValue = [...expiredProducts, ...expiringProducts].reduce(
    (sum, p) => sum + (Number(p.currentStock) || 0) * (Number(p.price) || 0),
    0
  );

  const stockBuckets = [
    { label: 'Crítico', value: products.filter((p) => p.currentStock === 0).length, color: 'bg-rose-500' },
    { label: 'Bajo', value: products.filter((p) => p.currentStock > 0 && p.currentStock < LOW_STOCK_THRESHOLD).length, color: 'bg-amber-500' },
    { label: 'Sano', value: products.filter((p) => p.currentStock >= LOW_STOCK_THRESHOLD).length, color: 'bg-emerald-500' },
  ];
  const statusDonut = [
    { label: 'Vigente', value: vigentes, color: '#10b981' },
    { label: 'Por vencer', value: expiringProducts.length, color: '#f59e0b' },
    { label: 'Vencido', value: expiredProducts.length, color: '#f43f5e' },
    { label: 'Sin stock', value: products.filter((p) => p.status === PRODUCT_STATUS.SIN_STOCK).length, color: '#64748b' },
  ];
  const canExport = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(userData?.role);

  function handleExportProducts() {
    exportProductsToExcel(products, 'reporte-productos.xlsx', {
      generatedBy: userData?.displayName || userData?.email,
      role: userData?.role,
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-400" />
          <div className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Supervisor / Admin</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Reportes</h1>
                <p className="mt-2 text-sm text-slate-600">Vista consolidada de vencimientos, stock y riesgos operativos.</p>
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
                onClick={handleExportProducts}
                disabled={!canExport}
                className="inline-flex items-center gap-2 justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>📊</span> Exportación a Excel
              </button>
              <span className="text-xs text-slate-500">
                Incluye portada, KPIs, distribución por categoría y detalle de productos.
              </span>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon="📦" label="Total productos" value={products.length} sub={`${vigentes} vigentes`} accent="from-blue-500 to-cyan-500" tone="text-blue-600" loading={loading} delay={0} />
          <KpiCard icon="💰" label="Valor inventario" value={loading ? '—' : formatCLP(inventoryValue)} sub="stock × precio" accent="from-emerald-500 to-teal-500" tone="text-emerald-600" loading={loading} delay={60} />
          <KpiCard icon="⚠️" label="Valor en riesgo" value={loading ? '—' : formatCLP(riskValue)} sub="vencido + por vencer" accent="from-amber-500 to-orange-500" tone="text-amber-600" loading={loading} delay={120} />
          <KpiCard icon="⏳" label="Por vencer" value={expiringProducts.length} sub="≤ 30 días" accent="from-yellow-500 to-amber-500" tone="text-yellow-600" loading={loading} delay={180} />
          <KpiCard icon="🚫" label="Vencidos" value={expiredProducts.length} sub="retirar" accent="from-rose-500 to-red-600" tone="text-rose-600" loading={loading} delay={240} />
          <KpiCard icon="📉" label="Stock bajo" value={lowStockProducts.length} sub="≤ mínimo" accent="from-slate-500 to-slate-700" tone="text-slate-600" loading={loading} delay={300} />
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Section title="Distribución por estado" count={products.length} color="gray" loading={loading}>
            <DonutChart items={statusDonut} />
          </Section>
          <Section title="Distribución de stock" count={products.length} color="gray" loading={loading}>
            <MiniBarChart items={stockBuckets} showPercent />
          </Section>
        </section>

        <Section title="Productos vencidos" count={expiredProducts.length} color="red" loading={loading}>
          <ProductTable products={expiredProducts} />
        </Section>

        <Section title="Próximos a vencer (≤ 30 días)" count={expiringProducts.length} color="yellow" loading={loading}>
          <ProductTable products={expiringProducts} showDays />
        </Section>

        <Section title="Stock bajo" count={lowStockProducts.length} color="gray" loading={loading}>
          <ProductTable products={lowStockProducts} showStock />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, count, color, loading, children }) {
  const colors = { red: 'text-rose-700', yellow: 'text-amber-700', gray: 'text-slate-700' };
  return (
    <div className="animate-fade-in-up rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className={`font-semibold ${colors[color] || ''}`}>{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{count}</span>
      </div>
      {loading ? <SkeletonCard /> : children}
    </div>
  );
}

function ProductTable({ products, showDays, showStock }) {
  if (products.length === 0) {
    return <p className="py-4 text-sm text-slate-400">Sin productos en esta categoría.</p>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/90">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Producto</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Categoría</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Precio</th>
            {showDays && <th className="px-4 py-3 text-left font-medium text-slate-600">Vence en</th>}
            {showStock && <th className="px-4 py-3 text-left font-medium text-slate-600">Stock</th>}
            <th className="px-4 py-3 text-left font-medium text-slate-600">Vencimiento</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p) => (
            <tr key={p.id} className="transition hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
              <td className="px-4 py-3 text-slate-500">{p.category}</td>
              <td className="px-4 py-3">{formatCLP(p.price)}</td>
              {showDays && <td className="px-4 py-3 font-semibold text-amber-700">{getDaysToExpiry(p.expirationDate)}d</td>}
              {showStock && <td className="px-4 py-3 font-semibold text-rose-600">{p.currentStock} / {p.minStock}</td>}
              <td className="px-4 py-3 text-slate-600">{formatChileanDate(p.expirationDate)}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBarChart({ items }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-500">
              {item.value}
              {' '}
              ({Math.round((item.value / max) * 100)}%)
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.color} transition-all duration-700`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
