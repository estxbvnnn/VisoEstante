import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../context/AuthContext';
import { createSale, PAYMENT_METHODS, PAYMENT_LABELS } from '../services/saleService';
import { formatCLP } from '../utils/formatUtils';
import { getGrossPrice, getTotalsBreakdown } from '../utils/taxUtils';
import { IVA_LABEL } from '../constants/tax';
import { formatChileanDate, toDate } from '../utils/dateUtils';
import KpiCard from '../components/ui/KpiCard';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

function saleDateTime(sale) {
  const d = toDate(sale.createdAt);
  if (!d) return '—';
  return `${formatChileanDate(d)} · ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function Sales() {
  const { user } = useAuth();
  const { products, loading } = useProducts();
  const { sales, loading: salesLoading } = useSales(50);

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{ productId, name, barcode, unitNet, quantity, stock }]
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [saving, setSaving] = useState(false);
  const [detailSale, setDetailSale] = useState(null);

  const sellable = products.filter((p) => (Number(p.currentStock) || 0) > 0);
  const filtered = sellable.filter(
    (p) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
  );

  function addToCart(product) {
    const stock = Number(product.currentStock) || 0;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          toast.error('No hay más stock disponible');
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode || '',
          unitNet: Number(product.price) || 0,
          quantity: 1,
          stock,
        },
      ];
    });
  }

  function setQty(productId, qty) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const clamped = Math.max(1, Math.min(Number(qty) || 1, i.stock));
        return { ...i, quantity: clamped };
      })
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const totalNet = cart.reduce((s, i) => s + i.unitNet * i.quantity, 0);
  const totals = getTotalsBreakdown(totalNet);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  async function handleRegisterSale() {
    if (cart.length === 0) {
      toast.error('Agrega productos a la venta');
      return;
    }
    setSaving(true);
    try {
      const res = await createSale(
        {
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod,
        },
        user
      );
      toast.success(`Venta registrada: ${formatCLP(res.totalGross)}`);
      setCart([]);
    } catch (err) {
      toast.error(err.message || 'Error al registrar la venta');
    } finally {
      setSaving(false);
    }
  }

  // Resumen del historial cargado (últimas ventas).
  const summary = useMemo(() => {
    const net = sales.reduce((s, v) => s + (Number(v.totalNet) || 0), 0);
    const tax = sales.reduce((s, v) => s + (Number(v.totalTax) || 0), 0);
    const gross = sales.reduce((s, v) => s + (Number(v.totalGross) || 0), 0);
    return { count: sales.length, net, tax, gross };
  }, [sales]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Caja</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Punto de venta</h1>
              <p className="mt-2 text-sm text-slate-600">
                Registra ventas con descuento de stock y desglose de IVA (19%) automático.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* KPIs del historial */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon="🧾" label="Ventas registradas" value={summary.count} sub="historial reciente" accent="from-blue-500 to-cyan-500" tone="text-blue-600" loading={salesLoading} delay={0} />
          <KpiCard icon="💵" label="Total neto" value={formatCLP(summary.net)} sub="sin IVA" accent="from-slate-500 to-slate-700" tone="text-slate-600" loading={salesLoading} delay={60} />
          <KpiCard icon="🧮" label="IVA recaudado" value={formatCLP(summary.tax)} sub="19%" accent="from-amber-500 to-orange-500" tone="text-amber-600" loading={salesLoading} delay={120} />
          <KpiCard icon="💰" label="Total vendido" value={formatCLP(summary.gross)} sub="con IVA" accent="from-emerald-500 to-teal-500" tone="text-emerald-600" loading={salesLoading} delay={180} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Catálogo */}
          <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-800">Productos disponibles</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{filtered.length}</span>
            </div>
            <input
              type="search"
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                ))
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">No hay productos con stock disponible.</p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {p.brand || 'Sin marca'} · Stock {p.currentStock}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-emerald-700">{formatCLP(getGrossPrice(p.price))}</p>
                      <p className="text-[11px] text-slate-400">neto {formatCLP(p.price)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Carrito */}
          <div className="flex flex-col rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Venta actual</h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs font-medium text-rose-600 hover:underline">
                  Vaciar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
                <span className="text-3xl">🛒</span>
                <p className="text-sm text-slate-500">Selecciona productos para iniciar una venta.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={i.productId} className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{i.name}</p>
                        <p className="text-xs text-slate-400">{formatCLP(i.unitNet)} neto c/u</p>
                      </div>
                      <button onClick={() => removeFromCart(i.productId)} className="text-slate-400 transition hover:text-rose-600" aria-label="Quitar">×</button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(i.productId, i.quantity - 1)} className="h-7 w-7 rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50">−</button>
                        <input
                          type="number"
                          min="1"
                          max={i.stock}
                          value={i.quantity}
                          onChange={(e) => setQty(i.productId, e.target.value)}
                          className="w-12 rounded-lg border border-slate-200 px-1 py-1 text-center text-sm outline-none focus:border-emerald-400"
                        />
                        <button onClick={() => setQty(i.productId, i.quantity + 1)} className="h-7 w-7 rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50">+</button>
                        <span className="ml-1 text-[11px] text-slate-400">/ {i.stock}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCLP(i.unitNet * i.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumen + pago */}
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <dt>Subtotal neto ({itemCount} u.)</dt>
                  <dd className="font-medium text-slate-800">{formatCLP(totals.net)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>{IVA_LABEL}</dt>
                  <dd className="font-medium text-slate-800">{formatCLP(totals.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                  <dt className="font-semibold text-slate-900">Total a pagar</dt>
                  <dd className="font-bold text-emerald-700">{formatCLP(totals.gross)}</dd>
                </div>
              </dl>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRegisterSale}
                disabled={saving || cart.length === 0}
                className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Registrando…' : `Registrar venta · ${formatCLP(totals.gross)}`}
              </button>
            </div>
          </div>
        </div>

        {/* Historial de ventas */}
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold text-slate-800">Historial de ventas</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{sales.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-slate-200 bg-slate-50/90">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Ítems</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Neto</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">IVA</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Pago</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Vendedor</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-3 animate-pulse rounded bg-slate-100" /></td></tr>
                  ))
                ) : sales.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Aún no hay ventas registradas.</td></tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="transition hover:bg-emerald-50/40">
                      <td className="px-4 py-3 text-slate-600">{saleDateTime(s)}</td>
                      <td className="px-4 py-3 text-slate-700">{s.itemCount ?? s.items?.length ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCLP(s.totalNet)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCLP(s.totalTax)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCLP(s.totalGross)}</td>
                      <td className="px-4 py-3 text-slate-600">{PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{s.soldByName || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailSale(s)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200">
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detalle de venta (boleta) */}
      <Modal
        open={!!detailSale}
        onClose={() => setDetailSale(null)}
        title="Detalle de venta"
        subtitle={detailSale ? saleDateTime(detailSale) : ''}
      >
        {detailSale && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Producto</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Neto c/u</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(detailSale.items || []).map((it, idx) => (
                    <tr key={`${it.productId}-${idx}`}>
                      <td className="px-3 py-2 text-slate-800">{it.name}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{it.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{formatCLP(it.unitNet)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCLP(it.lineNet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-600"><dt>Neto</dt><dd>{formatCLP(detailSale.totalNet)}</dd></div>
              <div className="flex justify-between text-slate-600"><dt>{IVA_LABEL}</dt><dd>{formatCLP(detailSale.totalTax)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-semibold text-slate-900"><dt>Total</dt><dd className="text-emerald-700">{formatCLP(detailSale.totalGross)}</dd></div>
            </dl>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Pago: {PAYMENT_LABELS[detailSale.paymentMethod] || detailSale.paymentMethod || '—'}</span>
              <span>Vendedor: {detailSale.soldByName || '—'}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
