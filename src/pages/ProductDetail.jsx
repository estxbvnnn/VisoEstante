import { Link, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonCard from '../components/ui/SkeletonCard';
import { formatCLP } from '../utils/formatUtils';
import { formatChileanDate, getDaysToExpiry, getExpiryLabel } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

export default function ProductDetail() {
  const { id } = useParams();
  const { product, loading, error } = useProduct(id);
  const { userData } = useAuth();
  const canEdit = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(userData?.role);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(2,132,199,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eefdf5_100%)] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Detalle de producto</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{loading ? 'Cargando…' : product?.name || 'Producto no encontrado'}</h1>
              <p className="mt-2 text-sm text-slate-600">Vista completa del producto seleccionado.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/products" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">← Productos</Link>
              <Link to="/dashboard" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">Dashboard</Link>
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-lg shadow-rose-950/5">{error}</div>
        ) : !product ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-lg shadow-slate-900/5">No se encontró el producto.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{product.category || 'Sin categoría'}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{product.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{product.brand || 'Sin marca'}</p>
                </div>
                <StatusBadge status={product.status} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <DetailCard label="Código" value={product.barcode} mono />
                <DetailCard label="Ubicación" value={product.shelfLocation || '—'} />
                <DetailCard label="Precio" value={formatCLP(product.price)} />
                <DetailCard label="Stock" value={`${product.currentStock} / ${product.minStock}`} />
                <DetailCard label="Vencimiento" value={formatChileanDate(product.expirationDate)} />
                <DetailCard label="Caducidad" value={getExpiryLabel(getDaysToExpiry(product.expirationDate))} />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notas</p>
                <p className="mt-2 text-sm text-slate-600">
                  {canEdit
                    ? 'Este producto puede ser ajustado por administración o supervisión desde Gestión de productos.'
                    : 'Sólo puedes visualizar esta ficha.'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Estado operativo</p>
                <div className="mt-4 space-y-4">
                  <MiniMetric label="Stock actual" value={product.currentStock} accent="from-emerald-500 to-cyan-500" />
                  <MiniMetric label="Mínimo" value={product.minStock} accent="from-amber-500 to-orange-500" />
                  <MiniMetric label="Días para vencer" value={getDaysToExpiry(product.expirationDate) ?? '—'} accent="from-rose-500 to-red-600" />
                </div>
              </div>

              {product.imageUrl && (
                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Imagen</p>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img src={product.imageUrl} alt={product.name} className="h-64 w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
