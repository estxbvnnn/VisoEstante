import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useAlerts } from '../hooks/useAlerts';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';
import { updatePrice, updateStock } from '../services/productService';
import AlertBanner from '../components/alerts/AlertBanner';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import KpiCard from '../components/ui/KpiCard';
import DonutChart from '../components/ui/DonutChart';
import { formatCLP } from '../utils/formatUtils';
import { formatChileanDate, getDaysToExpiry } from '../utils/dateUtils';
import { PRODUCT_STATUS } from '../constants/productStatus';
import { ROLE_LABELS } from '../constants/roles';
import toast from 'react-hot-toast';
import { exportGeneralDashboardToExcel } from '../utils/exportUtils';

const LOW_STOCK_THRESHOLD = 20;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { products, loading } = useProducts();
  const { alerts, criticalCount } = useAlerts();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editPriceProduct, setEditPriceProduct] = useState(null);
  const [editStockProduct, setEditStockProduct] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  function handleExportDashboard() {
    exportGeneralDashboardToExcel(products, alerts, 'reporte-general-dashboard.xlsx', {
      generatedBy: userData?.displayName || userData?.email,
      role: userData?.role,
    });
  }

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filtersActive = search || filterStatus !== 'all' || filterCategory !== 'all';

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  function clearFilters() {
    setSearch('');
    setFilterStatus('all');
    setFilterCategory('all');
  }

  const vigentes = products.filter((p) => p.status === PRODUCT_STATUS.VIGENTE).length;
  const inventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.currentStock) || 0) * (Number(p.price) || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStock
  ).length;

  const kpis = {
    total: products.length,
    sinStock: products.filter((p) => p.status === PRODUCT_STATUS.SIN_STOCK).length,
    porVencer: products.filter((p) => p.status === PRODUCT_STATUS.POR_VENCER).length,
    vencidos: products.filter((p) => p.status === PRODUCT_STATUS.VENCIDO).length,
  };

  const stockBuckets = [
    { label: 'Crítico', value: products.filter((p) => p.currentStock === 0).length, color: 'bg-rose-500' },
    { label: 'Bajo', value: products.filter((p) => p.currentStock > 0 && p.currentStock < LOW_STOCK_THRESHOLD).length, color: 'bg-amber-500' },
    { label: 'Sano', value: products.filter((p) => p.currentStock >= LOW_STOCK_THRESHOLD).length, color: 'bg-emerald-500' },
  ];

  const statusDonut = [
    { label: 'Vigente', value: vigentes, color: '#10b981' },
    { label: 'Por vencer', value: kpis.porVencer, color: '#f59e0b' },
    { label: 'Vencido', value: kpis.vencidos, color: '#f43f5e' },
    { label: 'Sin stock', value: kpis.sinStock, color: '#64748b' },
  ];

  const priority = {
    [PRODUCT_STATUS.VENCIDO]: 0,
    [PRODUCT_STATUS.SIN_STOCK]: 1,
    [PRODUCT_STATUS.POR_VENCER]: 2,
  };
  const attention = products
    .filter((p) => p.status !== PRODUCT_STATUS.VIGENTE)
    .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
    .slice(0, 6);

  async function handleSavePrice() {
    if (!editPriceProduct) return;
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) { toast.error('Precio inválido'); return; }
    setSaving(true);
    try {
      await updatePrice(editPriceProduct.id, price, user?.uid);
      toast.success('Precio actualizado');
      setEditPriceProduct(null);
      setNewPrice('');
    } catch {
      toast.error('Error al actualizar precio');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStock() {
    if (!editStockProduct) return;
    const qty = parseInt(newStock, 10);
    if (isNaN(qty) || qty < 0) { toast.error('Cantidad inválida'); return; }
    setSaving(true);
    try {
      await updateStock(editStockProduct.id, qty, user?.uid);
      toast.success('Stock actualizado');
      setEditStockProduct(null);
      setNewStock('');
    } catch {
      toast.error('Error al actualizar stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(2,132,199,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eefdf5_100%)] text-slate-900">
      <AlertBanner />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-700 text-white shadow-lg shadow-slate-900/25 ring-1 ring-white/30">
              🛒
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-slate-900 leading-none">Estante Inteligente</h1>
              <p className="text-xs text-slate-500 mt-1">{userData?.displayName} · {ROLE_LABELS[userData?.role] || userData?.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:inline-flex">
              <span className="live-dot" /> En vivo
            </span>
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <span>📦</span>
              Productos
            </Link>
            <Link
              to="/alerts"
              className="relative inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-md"
            >
              🔔
              {criticalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {criticalCount}
                </span>
              )}
            </Link>
            <button onClick={handleSignOut} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-md">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <section className="animate-fade-in-up overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-400" />
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Panel operativo</p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Control total de inventario, precios y alertas.
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Administra productos, revisa estados críticos y toma acciones rápidas desde una vista centralizada.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleExportDashboard}
                    className="inline-flex items-center gap-2 justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    <span>📊</span> Exportar Excel
                  </button>
                  <Link
                    to="/reports"
                    className="inline-flex items-center gap-2 justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <span>📈</span> Ver reportes avanzados
                  </Link>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm lg:w-72">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Valoración de inventario</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {loading ? '—' : formatCLP(inventoryValue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{kpis.total} productos · {vigentes} vigentes</p>
              </div>
            </div>
          </div>
        </section>

        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon="📦" label="Total productos" value={kpis.total} sub={`${vigentes} vigentes`} accent="from-blue-500 to-cyan-500" tone="text-blue-600" loading={loading} delay={0} />
          <KpiCard icon="💰" label="Valor inventario" value={loading ? '—' : formatCLP(inventoryValue)} sub="stock × precio" accent="from-emerald-500 to-teal-500" tone="text-emerald-600" loading={loading} delay={60} />
          <KpiCard icon="⏳" label="Por vencer" value={kpis.porVencer} sub="≤ 30 días" accent="from-amber-500 to-orange-500" tone="text-amber-600" loading={loading} delay={120} />
          <KpiCard icon="📉" label="Stock bajo" value={lowStockCount} sub="≤ mínimo" accent="from-yellow-500 to-amber-500" tone="text-yellow-600" loading={loading} delay={180} />
          <KpiCard icon="🚫" label="Vencidos" value={kpis.vencidos} sub="retirar" accent="from-rose-500 to-red-600" tone="text-rose-600" loading={loading} delay={240} />
          <KpiCard icon="⛔" label="Sin stock" value={kpis.sinStock} sub="reponer" accent="from-slate-500 to-slate-700" tone="text-slate-600" loading={loading} delay={300} />
        </section>

        {/* Insights: donut + bar + attention */}
        <section className="grid gap-6 lg:grid-cols-3">
          <ChartCard title="Distribución por estado" subtitle="Lectura rápida del inventario">
            <DonutChart items={statusDonut} />
          </ChartCard>
          <ChartCard title="Distribución de stock" subtitle="Foco en bajo stock">
            <MiniBarChart items={stockBuckets} />
          </ChartCard>
          <AttentionCard items={attention} loading={loading} />
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <input
            type="search"
            placeholder="Buscar por nombre o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="all">Todos los estados</option>
            <option value={PRODUCT_STATUS.VIGENTE}>Vigente</option>
            <option value={PRODUCT_STATUS.POR_VENCER}>Por vencer</option>
            <option value={PRODUCT_STATUS.VENCIDO}>Vencido</option>
            <option value={PRODUCT_STATUS.SIN_STOCK}>Sin stock</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'all' ? 'Todas las categorías' : cat}</option>
            ))}
          </select>
          <span className="ml-auto text-xs font-medium text-slate-500">
            {filtered.length} de {products.length} productos
          </span>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Products Table */}
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Producto</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Precio</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Vencimiento</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/95">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 rounded bg-slate-100 animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.map((product) => (
                      <tr key={product.id} className="transition hover:bg-emerald-50/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-emerald-50 rounded-2xl flex items-center justify-center text-lg shrink-0 ring-1 ring-slate-200/70">🛍</div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900 line-clamp-1">{product.name}</p>
                              <p className="text-xs text-slate-400">{product.brand} · {product.category}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{product.shelfLocation || 'Sin ubicación'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{product.barcode}</td>
                        <td className="px-4 py-3">
                          <span className={product.currentStock <= product.minStock ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                            {product.currentStock} / {product.minStock} mín.
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatCLP(product.price)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="font-medium text-slate-800">{formatChileanDate(product.expirationDate)}</div>
                          <div className="text-xs text-slate-400">{getDaysToExpiry(product.expirationDate)}d</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={product.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditPriceProduct(product); setNewPrice(String(product.price)); }}
                              className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              Precio
                            </button>
                            <button
                              onClick={() => { setEditStockProduct(product); setNewStock(String(product.currentStock)); }}
                              className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Stock
                            </button>
                            <Link to={`/products/${product.id}`} className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200">
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm text-slate-500">No se encontraron productos con esos filtros.</p>
                {filtersActive && (
                  <button onClick={clearFilters} className="text-sm font-medium text-emerald-700 hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Price Modal */}
      <Modal
        open={!!editPriceProduct}
        onClose={() => { setEditPriceProduct(null); setNewPrice(''); }}
        title="Editar precio"
        subtitle={editPriceProduct?.name}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nuevo precio (CLP)</label>
            <input
              type="number"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditPriceProduct(null)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSavePrice} disabled={saving} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Stock Modal */}
      <Modal
        open={!!editStockProduct}
        onClose={() => { setEditStockProduct(null); setNewStock(''); }}
        title="Actualizar stock"
        subtitle={editStockProduct?.name}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad actual</label>
            <input
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditStockProduct(null)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSaveStock} disabled={saving} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="animate-fade-in-up rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function MiniBarChart({ items }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-4 pt-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-500">{item.value}</span>
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

function AttentionCard({ items, loading }) {
  return (
    <div className="animate-fade-in-up flex flex-col rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Requieren atención</h3>
          <p className="mt-1 text-sm text-slate-500">Prioridad: vencidos y sin stock</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-lg ring-1 ring-rose-100">🚨</span>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="text-3xl">✅</span>
          <p className="text-sm text-slate-500">Todo en orden. Sin productos críticos.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="truncate text-xs text-slate-400">{p.category} · {p.shelfLocation || 'Sin ubicación'}</p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
