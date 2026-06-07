import { useProducts } from '../hooks/useProducts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PRODUCT_STATUS } from '../constants/productStatus';
import { formatChileanDate, getDaysToExpiry } from '../utils/dateUtils';
import { formatCLP } from '../utils/formatUtils';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonCard from '../components/ui/SkeletonCard';
import { exportProductsToExcel } from '../utils/exportUtils';
import { ROLE_LABELS, ROLES } from '../constants/roles';

export default function Reports() {
  const { products, loading } = useProducts();
  const { userData } = useAuth();

  const expiredProducts = products.filter((p) => p.status === PRODUCT_STATUS.VENCIDO);
  const expiringProducts = products.filter((p) => p.status === PRODUCT_STATUS.POR_VENCER);
  const lowStockProducts = products.filter(
    (p) => p.currentStock <= p.minStock && p.currentStock > 0
  );
  const stockBuckets = [
    { label: 'Crítico', value: products.filter((p) => p.currentStock === 0).length, color: 'bg-rose-500' },
    { label: 'Bajo', value: products.filter((p) => p.currentStock > 0 && p.currentStock < 20).length, color: 'bg-amber-500' },
    { label: 'Sano', value: products.filter((p) => p.currentStock >= 20).length, color: 'bg-emerald-500' },
  ];
  const statusBuckets = [
    { label: 'Vigente', value: products.filter((p) => p.status === PRODUCT_STATUS.VIGENTE).length, color: 'bg-emerald-500' },
    { label: 'Por vencer', value: products.filter((p) => p.status === PRODUCT_STATUS.POR_VENCER).length, color: 'bg-amber-500' },
    { label: 'Vencido', value: products.filter((p) => p.status === PRODUCT_STATUS.VENCIDO).length, color: 'bg-rose-500' },
    { label: 'Sin stock', value: products.filter((p) => p.status === PRODUCT_STATUS.SIN_STOCK).length, color: 'bg-slate-500' },
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
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {stockBuckets.map((bucket) => (
              <div key={bucket.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className={`h-1.5 w-14 rounded-full ${bucket.color}`} />
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{bucket.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{bucket.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportProducts}
              disabled={!canExport}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Exportación a Excel
            </button>
            <span className="text-xs text-slate-500">
              Incluye resumen ejecutivo, distribución por stock, estado y detalle de productos.
            </span>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <Section title="Distribución de stock" count={products.length} color="gray" loading={loading}>
            <MiniBarChart items={stockBuckets} showPercent />
          </Section>

          <Section title="Distribución por estado" count={products.length} color="gray" loading={loading}>
            <MiniBarChart items={statusBuckets} showPercent />
          </Section>
        </section>

        <Section title="Resumen ejecutivo" count={products.length} color="gray" loading={loading}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total productos" value={products.length} accent="from-blue-500 to-cyan-500" />
            <SummaryCard label="Críticos" value={stockBuckets[0].value} accent="from-rose-500 to-red-600" />
            <SummaryCard label="Por vencer" value={statusBuckets[1].value} accent="from-amber-500 to-orange-500" />
            <SummaryCard label="Vencidos" value={statusBuckets[2].value} accent="from-slate-500 to-slate-700" />
          </div>
        </Section>

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
    <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
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
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
